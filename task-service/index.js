require('dotenv').config({ path: '../.env' });
const fastify = require('fastify')({ logger: true });
const { Pool } = require('pg');

const PORT = process.env.TASK_SERVICE_PORT || 3002;
const HOST = process.env.TASK_SERVICE_HOST || '0.0.0.0';

// PostgreSQL connection pool
const pool = new Pool({
    host: process.env.TASK_DB_HOST,
    port: process.env.TASK_DB_PORT,
    database: process.env.TASK_DB_NAME,
    user: process.env.TASK_DB_USER,
    password: process.env.TASK_DB_PASSWORD,
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
        service: 'task-service',
        database: dbStatus,
        timestamp: new Date().toISOString()
    };
});

// Root endpoint
fastify.get('/', async (request, reply) => {
    return {
        message: 'FocusHub Task Service',
        version: '1.0.0'
    };
});

// Start server
const start = async () => {
    try {
        await fastify.listen({ port: PORT, host: HOST });
        console.log(`Task Service running on http://${HOST}:${PORT}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
