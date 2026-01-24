/**
 * Focus Service - Main Entry Point
 * Handles focus session tracking and Pomodoro timer functionality
 */

require('dotenv').config({ path: '../.env' });
const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const rateLimit = require('@fastify/rate-limit');
const { Pool } = require('pg');
const Redis = require('ioredis');

const shared = require('../shared');
const { errorHandler, notFoundHandler, createAuthMiddleware } = shared;

const PORT = process.env.FOCUS_SERVICE_PORT || 3003;
const HOST = process.env.FOCUS_SERVICE_HOST || '0.0.0.0';

// PostgreSQL connection pool
const pool = new Pool({
    host: process.env.FOCUS_DB_HOST,
    port: process.env.FOCUS_DB_PORT,
    database: process.env.FOCUS_DB_NAME,
    user: process.env.FOCUS_DB_USER,
    password: process.env.FOCUS_DB_PASSWORD,
});

// Create Redis client for rate limiting
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: 2, // Use different DB for focus service
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

// Register plugins
fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
});

// Only enable rate limiting in non-test environments
if (process.env.NODE_ENV !== 'test') {
    fastify.register(rateLimit, {
        max: 100,
        timeWindow: '15 minutes',
        redis,
    });
}

// Attach database pool and redis to fastify instance
fastify.decorate('db', pool);
fastify.decorate('redis', redis);

// Register error handlers
fastify.setErrorHandler(errorHandler);
fastify.setNotFoundHandler(notFoundHandler);

// Health check endpoint (public)
fastify.get('/health', async (request, reply) => {
    let dbStatus = 'disconnected';

    try {
        await pool.query('SELECT 1');
        dbStatus = 'connected';
    } catch (err) {
        fastify.log.error('Database health check failed:', err);
    }

    return {
        status: 'healthy',
        service: 'focus-service',
        database: dbStatus,
        timestamp: new Date().toISOString()
    };
});

// Root endpoint (public)
fastify.get('/', async (request, reply) => {
    return {
        message: 'FocusHub Focus Service - Focus Session Tracking',
        version: '1.0.0',
        endpoints: {
            sessions: '/sessions',
            active: '/sessions/active',
            stats: '/stats'
        }
    };
});

// Register routes with authentication middleware
const authMiddleware = createAuthMiddleware(process.env.JWT_SECRET);
fastify.register(require('./routes/focus'), {
    prefix: '',
    preHandler: authMiddleware
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received, closing gracefully...`);

    try {
        await fastify.close();
        await pool.end();
        await redis.quit();
        console.log('All connections closed');
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server (only if not in test mode)
const start = async () => {
    if (process.env.NODE_ENV === 'test') {
        return; // Don't start server in test mode
    }

    try {
        await fastify.listen({ port: PORT, host: HOST });
        console.log(`✅ Focus Service running on http://${HOST}:${PORT}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

// Only start if not in test mode
if (process.env.NODE_ENV !== 'test') {
    start();
}

// Export for testing
module.exports = { app: fastify, pool, redis };
