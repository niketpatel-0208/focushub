/**
 * Shared Module Index
 * Exports all shared utilities, middleware, and validators
 */

// Utils
const database = require('./utils/database');
const jwt = require('./utils/jwt');
const logger = require('./utils/logger');
const password = require('./utils/password');
const response = require('./utils/response');

// Middleware
const { ApiError, errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { createAuthMiddleware } = require('./middleware/auth');

// Validators
const { authSchemas, commonSchemas, validate } = require('./validators/schemas');
const { projectSchemas, taskSchemas, tagSchemas } = require('./validators/taskSchemas');

module.exports = {
    // Utils
    database,
    jwt,
    logger,
    password,
    response,

    // Middleware
    ApiError,
    errorHandler,
    notFoundHandler,
    createAuthMiddleware,

    // Validators
    authSchemas,
    commonSchemas,
    projectSchemas,
    taskSchemas,
    tagSchemas,
    validate,
};
