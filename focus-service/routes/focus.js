/**
 * Focus Session Routes
 * API endpoints for Pomodoro-style focus session tracking
 */

const focusService = require('../services/focusService');
const shared = require('../../shared');
const { response, focusSchemas, validate } = shared;

async function focusRoutes(fastify, options) {
    /**
     * POST /sessions - Start new focus session
     */
    fastify.post('/sessions', async (request, reply) => {
        const data = validate(focusSchemas.createSession, request.body);

        const session = await focusService.createSession(
            fastify.db,
            request.user.userId,
            data
        );

        return reply.status(201).send(
            response.success(session, 'Focus session started successfully')
        );
    });

    /**
     * GET /sessions - List sessions with filters
     */
    fastify.get('/sessions', async (request, reply) => {
        const filters = validate(focusSchemas.listSessions, request.query);

        const result = await focusService.getSessions(
            fastify.db,
            request.user.userId,
            filters
        );

        return reply.send(
            response.paginated(
                result.sessions,
                filters.page,
                filters.limit,
                result.pagination.total
            )
        );
    });

    /**
     * GET /sessions/active - Get current active session
     */
    fastify.get('/sessions/active', async (request, reply) => {
        const session = await focusService.getActiveSession(
            fastify.db,
            request.user.userId
        );

        if (!session) {
            return reply.status(404).send(
                response.error('No active session found', 404)
            );
        }

        return reply.send(
            response.success(session, 'Active session retrieved successfully')
        );
    });

    /**
     * GET /sessions/:id - Get session by ID
     */
    fastify.get('/sessions/:id', async (request, reply) => {
        const { id } = request.params;

        const session = await focusService.getSessionById(
            fastify.db,
            id,
            request.user.userId
        );

        return reply.send(
            response.success(session, 'Focus session retrieved successfully')
        );
    });

    /**
     * PATCH /sessions/:id/pause - Pause active session
     */
    fastify.patch('/sessions/:id/pause', async (request, reply) => {
        const { id } = request.params;

        const session = await focusService.pauseSession(
            fastify.db,
            id,
            request.user.userId
        );

        return reply.send(
            response.success(session, 'Focus session paused')
        );
    });

    /**
     * PATCH /sessions/:id/resume - Resume paused session
     */
    fastify.patch('/sessions/:id/resume', async (request, reply) => {
        const { id } = request.params;

        const session = await focusService.resumeSession(
            fastify.db,
            id,
            request.user.userId
        );

        return reply.send(
            response.success(session, 'Focus session resumed')
        );
    });

    /**
     * PATCH /sessions/:id/complete - Complete session
     */
    fastify.patch('/sessions/:id/complete', async (request, reply) => {
        const { id } = request.params;
        const data = validate(focusSchemas.updateSession, request.body);

        const session = await focusService.completeSession(
            fastify.db,
            id,
            request.user.userId,
            data
        );

        return reply.send(
            response.success(session, 'Focus session completed successfully')
        );
    });

    /**
     * DELETE /sessions/:id - Cancel session
     */
    fastify.delete('/sessions/:id', async (request, reply) => {
        const { id } = request.params;

        const session = await focusService.cancelSession(
            fastify.db,
            id,
            request.user.userId
        );

        return reply.send(
            response.success(session, 'Focus session cancelled')
        );
    });

    /**
     * GET /stats - Get focus statistics
     */
    fastify.get('/stats', async (request, reply) => {
        const query = validate(focusSchemas.statsQuery, request.query);

        const stats = await focusService.getStats(
            fastify.db,
            request.user.userId,
            query
        );

        return reply.send(
            response.success(stats, 'Focus statistics retrieved successfully')
        );
    });
}

module.exports = focusRoutes;
