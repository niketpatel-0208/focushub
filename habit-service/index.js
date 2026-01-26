require('dotenv').config({ path: '../.env' });
const Fastify = require('fastify');
const cors = require('@fastify/cors');
const rateLimit = require('@fastify/rate-limit');
const { Pool } = require('pg');
const Redis = require('ioredis');
const { createAuthMiddleware, errorHandler } = require('../shared');

// Database pool
const pool = new Pool({
    host: process.env.HABIT_DB_HOST,
    port: process.env.HABIT_DB_PORT,
    database: process.env.HABIT_DB_NAME,
    user: process.env.HABIT_DB_USER,
    password: process.env.HABIT_DB_PASSWORD,
});

// Redis client
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: 3,
});

// Create Fastify instance
const fastify = Fastify({
    logger: process.env.NODE_ENV !== 'test',
});

// Add pool and redis to fastify instance
fastify.decorate('pool', pool);
fastify.decorate('redis', redis);

// Register CORS
fastify.register(cors, {
    origin: '*',
    credentials: true,
});

// Register rate limiting (disabled in test)
if (process.env.NODE_ENV !== 'test') {
    fastify.register(rateLimit, {
        max: 100,
        timeWindow: '15 minutes',
        redis,
    });
}

// Health check
fastify.get('/health', async (request, reply) => {
    try {
        await pool.query('SELECT 1');
        return { status: 'healthy', service: 'habit-service' };
    } catch (error) {
        return reply.code(503).send({ status: 'unhealthy', error: error.message });
    }
});

// Info endpoint
fastify.get('/', async (request, reply) => {
    return {
        message: 'FocusHub Habit Tracking Service',
        version: '1.0.0',
        endpoints: 11,
    };
});

// Create auth middleware
const authenticateToken = createAuthMiddleware(process.env.JWT_SECRET);

// Register auth middleware for protected routes
fastify.addHook('onRequest', async (request, reply) => {
    const publicRoutes = ['/health', '/'];
    if (!publicRoutes.includes(request.url)) {
        await authenticateToken(request, reply);
    }
});

// Register routes
const habitRoutes = require('./routes/habits');
fastify.register(habitRoutes);

// Error handler
fastify.setErrorHandler(errorHandler);

//  Start server
const start = async () => {
    try {
        const port = process.env.HABIT_SERVICE_PORT || 3004;
        const host = process.env.HABIT_SERVICE_HOST || '0.0.0.0';

        await fastify.listen({ port, host });
        console.log(`✅ Habit Service running on http://${host}:${port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down habit service...');
    await fastify.close();
    await pool.end();
    await redis.quit();
    process.exit(0);
});

// Export for testing
if (process.env.NODE_ENV === 'test') {
    module.exports = { app: fastify, pool, redis };
} else {
    start();
}
