const shared = require('../../shared');
const { habitSchemas } = shared;
const { ApiError } = shared;

async function habitRoutes(fastify, options) {
    const HabitService = require('../services/habitService');
    const habitService = new HabitService(fastify.pool);

    // POST /habits - Create habit
    fastify.post('/habits', {
        schema: {
            body: habitSchemas.createHabit
        }
    }, async (request, reply) => {
        const habit = await habitService.createHabit(request.userId, request.body);
        return reply.code(201).send({
            success: true,
            message: 'Habit created successfully',
            data: habit
        });
    });

    // GET /habits - List habits
    fastify.get('/habits', {
        schema: {
            querystring: habitSchemas.listHabitsQuery
        }
    }, async (request, reply) => {
        const result = await habitService.getHabits(request.userId, request.query);
        return {
            success: true,
            data: result.habits,
            meta: { pagination: result.pagination }
        };
    });

    // GET /habits/:id - Get habit by ID
    fastify.get('/habits/:id', async (request, reply) => {
        const habit = await habitService.getHabitById(request.params.id, request.userId);
        return {
            success: true,
            data: habit
        };
    });

    // PUT /habits/:id - Update habit
    fastify.put('/habits/:id', {
        schema: {
            body: habitSchemas.updateHabit
        }
    }, async (request, reply) => {
        const habit = await habitService.updateHabit(request.params.id, request.userId, request.body);
        return {
            success: true,
            message: 'Habit updated successfully',
            data: habit
        };
    });

    // DELETE /habits/:id - Delete habit
    fastify.delete('/habits/:id', async (request, reply) => {
        await habitService.deleteHabit(request.params.id, request.userId);
        return {
            success: true,
            message: 'Habit deleted successfully'
        };
    });

    // PATCH /habits/:id/archive - Archive habit
    fastify.patch('/habits/:id/archive', async (request, reply) => {
        const habit = await habitService.archiveHabit(request.params.id, request.userId, true);
        return {
            success: true,
            message: 'Habit archived successfully',
            data: habit
        };
    });

    // POST /habits/:id/complete - Log completion
    fastify.post('/habits/:id/complete', {
        schema: {
            body: habitSchemas.logCompletion
        }
    }, async (request, reply) => {
        const log = await habitService.logCompletion(request.params.id, request.userId, request.body);
        return reply.code(201).send({
            success: true,
            message: 'Completion logged successfully',
            data: log
        });
    });

    // DELETE /habits/:id/logs/:date - Remove completion
    fastify.delete('/habits/:id/logs/:date', async (request, reply) => {
        await habitService.removeCompletion(request.params.id, request.userId, request.params.date);
        return {
            success: true,
            message: 'Completion removed successfully'
        };
    });

    // GET /habits/:id/logs - Get completion logs
    fastify.get('/habits/:id/logs', {
        schema: {
            querystring: habitSchemas.logsQuery
        }
    }, async (request, reply) => {
        const logs = await habitService.getHabitLogs(request.params.id, request.userId, request.query);
        return {
            success: true,
            data: logs
        };
    });

    // GET /habits/:id/streak - Get streak info
    fastify.get('/habits/:id/streak', async (request, reply) => {
        const streak = await habitService.getHabitStreak(request.params.id, request.userId);
        return {
            success: true,
            data: streak
        };
    });

    // GET /stats - Get habit statistics
    fastify.get('/stats', {
        schema: {
            querystring: habitSchemas.statsQuery
        }
    }, async (request, reply) => {
        const stats = await habitService.getHabitStats(request.userId, request.query);
        return {
            success: true,
            data: stats
        };
    });
}

module.exports = habitRoutes;
