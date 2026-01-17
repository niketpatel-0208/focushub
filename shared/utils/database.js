/**
 * Database Connection Utility
 * Provides PostgreSQL connection pool management
 */

const { Pool } = require('pg');
const logger = require('./logger');

/**
 * Create a PostgreSQL connection pool
 * @param {Object} config - Database configuration
 * @param {string} config.host - Database host
 * @param {number} config.port - Database port
 * @param {string} config.database - Database name
 * @param {string} config.user - Database user
 * @param {string} config.password - Database password
 * @param {number} config.max - Maximum pool size (default: 20)
 * @returns {Pool} PostgreSQL connection pool
 */
function createPool(config) {
    const pool = new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        max: config.max || 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });

    // Log pool errors
    pool.on('error', (err) => {
        logger.error('Unexpected error on idle client', err);
    });

    // Test connection
    pool.query('SELECT NOW()', (err) => {
        if (err) {
            logger.error('Database connection failed', err);
        } else {
            logger.info(`Database connected: ${config.database}`);
        }
    });

    return pool;
}

/**
 * Execute a query with automatic client release
 * @param {Pool} pool - Database pool
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
async function query(pool, text, params) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug('Executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        logger.error('Query error', { text, error: error.message });
        throw error;
    }
}

/**
 * Get a client for transactions
 * @param {Pool} pool - Database pool
 * @returns {Promise<Object>} Database client
 */
async function getClient(pool) {
    const client = await pool.connect();
    const query = client.query.bind(client);
    const release = client.release.bind(client);

    // Set a timeout of 5 seconds, after which we will log this client's last query
    const timeout = setTimeout(() => {
        logger.error('A client has been checked out for more than 5 seconds!');
    }, 5000);

    // Monkey patch the query method to keep track of the last query executed
    client.query = (...args) => {
        client.lastQuery = args;
        return query(...args);
    };

    client.release = () => {
        clearTimeout(timeout);
        client.query = query;
        client.release = release;
        return release();
    };

    return client;
}

/**
 * Execute a transaction
 * @param {Pool} pool - Database pool
 * @param {Function} callback - Transaction callback
 * @returns {Promise<any>} Transaction result
 */
async function transaction(pool, callback) {
    const client = await getClient(pool);
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    createPool,
    query,
    getClient,
    transaction,
};
