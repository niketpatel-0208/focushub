require('dotenv').config({ path: '../.env' });
const fastify = require('fastify')({ logger: true });
const { Pool } = require('pg');

const PORT = process.env.AUTH_SERVICE_PORT || 3001;
const HOST = process.env.AUTH_SERVICE_HOST || '0.0.0.0';

// PostgreSQL connection pool
const pool = new Pool({
    host: process.env.AUTH_DB_HOST,
    port: process.env.AUTH_DB_PORT,
    database: process.env.AUTH_DB_NAME,
    user: process.env.AUTH_DB_USER,
    password: process.env.AUTH_DB_PASSWORD,
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
        service: 'auth-service',
        database: dbStatus,
        timestamp: new Date().toISOString()
    };
});

// Root endpoint
fastify.get('/', async (request, reply) => {
    return {
        message: 'FocusHub Auth Service',
        version: '1.0.0'
    };
});

// Start server
const start = async () => {
    try {
        await fastify.listen({ port: PORT, host: HOST });
        console.log(`Auth Service running on http://${HOST}:${PORT}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
