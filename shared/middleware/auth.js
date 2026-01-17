/**
 * Authentication Middleware
 * Verifies JWT tokens for protected routes
 */

const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');
const { ApiError } = require('./errorHandler');
const logger = require('../utils/logger');

/**
 * Create authentication middleware
 * @param {string} jwtSecret - JWT secret for verification
 * @returns {Function} Fastify middleware function
 */
function createAuthMiddleware(jwtSecret) {
    return async (request, reply) => {
        try {
            // Extract token from Authorization header
            const authHeader = request.headers.authorization;
            const token = extractTokenFromHeader(authHeader);

            if (!token) {
                throw new ApiError('No token provided', 401);
            }

            // Verify token
            const decoded = verifyToken(token, jwtSecret);

            // Attach user info to request
            request.user = {
                userId: decoded.userId,
                email: decoded.email,
                username: decoded.username,
            };

            logger.debug('User authenticated', { userId: decoded.userId });
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw new ApiError(error.message || 'Invalid token', 401);
        }
    };
}

module.exports = {
    createAuthMiddleware,
};
