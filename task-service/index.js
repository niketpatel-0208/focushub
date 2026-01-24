require('dotenv').config({ path: '../.env' });
const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const rateLimit = require('@fastify/rate-limit');
const Redis = require('ioredis');

// Import shared utilities
const shared = require('../shared');
const { database, logger, errorHandler, notFoundHandler, createAuthMiddleware } = shared;

// Import routes
const taskRoutes = require('./routes/tasks');
const projectRoutes = require('./routes/projects');
const tagRoutes = require('./routes/tags');

const PORT = process.env.TASK_SERVICE_PORT || 3002;
const HOST = process.env.TASK_SERVICE_HOST || '0.0.0.0';

// Create database pool
const dbPool = database.createPool({
    host: process.env.TASK_DB_HOST,
    port: process.env.TASK_DB_PORT,
    database: process.env.TASK_DB_NAME,
    user: process.env.TASK_DB_USER,
    password: process.env.TASK_DB_PASSWORD,
});

// Create Redis client for rate limiting and caching
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
});

redis.on('error', (err) => {
    logger.error('Redis connection error', err);
});

// Register plugins
fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
});

fastify.register(rateLimit, {
    max: 100,
    timeWindow: '15 minutes',
    redis,
});

// Attach database pool and redis to fastify instance
fastify.decorate('db', dbPool);
fastify.decorate('redis', redis);

// Create auth middleware
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
}
const authenticate = createAuthMiddleware(JWT_SECRET);

// Register error handlers
fastify.setErrorHandler(errorHandler);
fastify.setNotFoundHandler(notFoundHandler);

//Health check endpoint
fastify.get('/health', async (request, reply) => {
    let dbStatus = 'disconnected';
    let redisStatus = 'disconnected';

    try {
        await dbPool.query('SELECT 1');
        dbStatus = 'connected';
    } catch (err) {
        logger.error('Database health check failed', err);
    }

    try {
        await redis.ping();
        redisStatus = 'connected';
    } catch (err) {
        logger.error('Redis health check failed', err);
    }

    return {
        status: 'healthy',
        service: 'task-service',
        database: dbStatus,
        redis: redisStatus,
        timestamp: new Date().toISOString(),
    };
});

// Root endpoint
fastify.get('/', async (request, reply) => {
    return {
        message: 'FocusHub Task Management Service',
        version: '1.0.0',
    };
});

// Register routes (all protected)
fastify.register(async function (fastify) {
    fastify.addHook('preHandler', authenticate);

    fastify.register(taskRoutes, { prefix: '/tasks' });
    fastify.register(projectRoutes, { prefix: '/projects' });
    fastify.register(tagRoutes, { prefix: '/tags' });
});

// Start server
const start = async () => {
    try {
        await fastify.listen({ port: PORT, host: HOST });
        logger.info(`Task Service running on http://${HOST}:${PORT}`);
        logger.info(`Database connected: ${process.env.TASK_DB_NAME}`);
    } catch (err) {
        logger.error(err);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    await fastify.close();
    await dbPool.end();
    await redis.quit();
    process.exit(0);
});

// Only start if not in test mode
if (process.env.NODE_ENV !== 'test') {
    start();
}

// Export for testing
module.exports = { app: fastify, pool: dbPool };
