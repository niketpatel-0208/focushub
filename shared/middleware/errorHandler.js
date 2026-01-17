/**
 * Error Handler Middleware
 * Centralized error handling for Fastify
 */

const logger = require('../utils/logger');
const response = require('../utils/response');

/**
 * Custom API Error class
 */
class ApiError extends Error {
    constructor(message, statusCode = 500, errors = null) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.name = 'ApiError';
    }
}

/**
 * Error handler middleware for Fastify
 * @param {Error} error - Error object
 * @param {Object} request - Fastify request
 * @param {Object} reply - Fastify reply
 */
async function errorHandler(error, request, reply) {
    // Log the error
    logger.error('Request error', {
        error: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method,
    });

    // Handle different error types
    if (error instanceof ApiError) {
        return reply.status(error.statusCode).send(
            response.error(error.message, error.statusCode, error.errors)
        );
    }

    // Validation errors (from Zod or Fastify validation)
    if (error.validation) {
        return reply.status(400).send(
            response.error('Validation failed', 400, error.validation)
        );
    }

    // Database errors
    if (error.code && error.code.startsWith('23')) {
        // PostgreSQL constraint violation
        let message = 'Database constraint violation';
        if (error.code === '23505') {
            message = 'Duplicate entry. Record already exists';
        } else if (error.code === '23503') {
            message = 'Foreign key violation';
        }
        return reply.status(400).send(response.error(message, 400));
    }

    // Default server error
    return reply.status(500).send(
        response.error(
            process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : error.message,
            500
        )
    );
}

/**
 * Not found handler
 * @param {Object} request - Fastify request
 * @param {Object} reply - Fastify reply
 */
async function notFoundHandler(request, reply) {
    return reply.status(404).send(
        response.error(`Route ${request.method} ${request.url} not found`, 404)
    );
}

module.exports = {
    ApiError,
    errorHandler,
    notFoundHandler,
};
