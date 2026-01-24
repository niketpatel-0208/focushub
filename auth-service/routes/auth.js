/**
 * Auth Routes
 * API endpoints for authentication
 */

const authService = require('../services/authService');
const shared = require('../../shared');
const { response, authSchemas, validate, createAuthMiddleware } = shared;

async function authRoutes(fastify, options) {
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is not set');
    }

    // Create auth middleware
    const authenticate = createAuthMiddleware(JWT_SECRET);

    /**
     * POST /auth/register
     * Register a new user
     */
    fastify.post('/register', async (request, reply) => {
        // Validate request body
        const data = validate(authSchemas.register, request.body);

        // Register user
        const user = await authService.registerUser(fastify.db, data);

        return reply.status(201).send(
            response.success(user, 'User registered successfully')
        );
    });

    /**
     * POST /auth/login
     * Login user
     */
    fastify.post('/login', {
        config: {
            rateLimit: {
                max: 5,
                timeWindow: '15 minutes',
            },
        },
        handler: async (request, reply) => {
            // Validate request body
            const data = validate(authSchemas.login, request.body);

            // Login user
            const result = await authService.loginUser(
                fastify.db,
                data.email,
                data.password,
                JWT_SECRET
            );

            return reply.send(
                response.success(result, 'Login successful')
            );
        },
    });

    /**
     * POST /auth/refresh
     * Refresh access token
     */
    fastify.post('/refresh', async (request, reply) => {
        // Validate request body
        const data = validate(authSchemas.refreshToken, request.body);

        // Refresh token
        const result = await authService.refreshAccessToken(
            fastify.db,
            data.refreshToken,
            JWT_SECRET
        );

        return reply.send(
            response.success(result, 'Token refreshed successfully')
        );
    });

    /**
     * POST /auth/logout
     * Logout user
     */
    fastify.post('/logout', async (request, reply) => {
        // Validate request body
        const data = validate(authSchemas.refreshToken, request.body);

        // Logout user
        await authService.logoutUser(fastify.db, data.refreshToken);

        return reply.send(
            response.success(null, 'Logout successful')
        );
    });

    /**
     * GET /auth/me
     * Get current user profile
     * Protected route
     */
    fastify.get('/me', {
        preHandler: authenticate,
        handler: async (request, reply) => {
            const user = await authService.getUserById(fastify.db, request.user.userId);

            return reply.send(
                response.success(user, 'User profile retrieved successfully')
            );
        },
    });

    /**
     * PUT /auth/me
     * Update user profile
     * Protected route
     */
    fastify.put('/me', {
        preHandler: authenticate,
        handler: async (request, reply) => {
            // Validate request body
            const data = validate(authSchemas.updateProfile, request.body);

            // Update profile
            const user = await authService.updateUserProfile(
                fastify.db,
                request.user.userId,
                data
            );

            return reply.send(
                response.success(user, 'Profile updated successfully')
            );
        },
    });

    /**
     * POST /auth/change-password
     * Change user password
     * Protected route
     */
    fastify.post('/change-password', {
        preHandler: authenticate,
        handler: async (request, reply) => {
            // Validate request body
            const data = validate(authSchemas.changePassword, request.body);

            // Change password
            await authService.changePassword(
                fastify.db,
                request.user.userId,
                data.currentPassword,
                data.newPassword
            );

            return reply.send(
                response.success(null, 'Password changed successfully')
            );
        },
    });
}

module.exports = authRoutes;
