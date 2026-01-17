require('dotenv').config({ path: '../.env' });
const fastify = require('fastify')({ logger: true });
const { Pool } = require('pg');

const PORT = process.env.HABIT_SERVICE_PORT || 3004;
const HOST = process.env.HABIT_SERVICE_HOST || '0.0.0.0';

// PostgreSQL connection pool
const pool = new Pool({
    host: process.env.HABIT_DB_HOST,
    port: process.env.HABIT_DB_PORT,
    database: process.env.HABIT_DB_NAME,
    user: process.env.HABIT_DB_USER,
    password: process.env.HABIT_DB_PASSWORD,
});

// Health check endpoint
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
        service: 'habit-service',
        database: dbStatus,
        timestamp: new Date().toISOString()
    };
});

// Root endpoint
fastify.get('/', async (request, reply) => {
    return {
        message: 'FocusHub Habit Service',
        version: '1.0.0'
    };
});

// Start server
const start = async () => {
    try {
        await fastify.listen({ port: PORT, host: HOST });
        console.log(`Habit Service running on http://${HOST}:${PORT}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
