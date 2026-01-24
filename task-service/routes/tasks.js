/**
 * Task Routes
 */

const taskService = require('../services/taskService');
const shared = require('../../shared');
const { response, taskSchemas, validate, commonSchemas } = shared;

async function taskRoutes(fastify, options) {
    /**
     * GET /tasks - List tasks with filtering
     */
    fastify.get('/', async (request, reply) => {
        const filters = validate(taskSchemas.filter, request.query);

        const result = await taskService.getTasks(fastify.db, request.user.userId, filters);

        return reply.send(
            response.paginated(result.tasks, filters.page, filters.limit, result.pagination.total)
        );
    });

    /**
     * GET /tasks/stats - Get task statistics
     */
    fastify.get('/stats', async (request, reply) => {
        const stats = await taskService.getTaskStats(fastify.db, request.user.userId);

        return reply.send(response.success(stats, 'Task statistics retrieved successfully'));
    });

    /**
     * GET /tasks/:id - Get task by ID
     */
    fastify.get('/:id', async (request, reply) => {
        const { id } = request.params;

        const task = await taskService.getTaskById(fastify.db, id, request.user.userId);

        return reply.send(response.success(task, 'Task retrieved successfully'));
    });

    /**
     * POST /tasks - Create task
     */
    fastify.post('/', async (request, reply) => {
        const data = validate(taskSchemas.create, request.body);

        const task = await taskService.createTask(fastify.db, request.user.userId, data);

        return reply.status(201).send(response.success(task, 'Task created successfully'));
    });

    /**
     * PUT /tasks/:id - Update task
     */
    fastify.put('/:id', async (request, reply) => {
        const { id } = request.params;
        const data = validate(taskSchemas.update, request.body);

        const task = await taskService.updateTask(fastify.db, id, request.user.userId, data);

        return reply.send(response.success(task, 'Task updated successfully'));
    });

    /**
     * DELETE /tasks/:id - Delete task
     */
    fastify.delete('/:id', async (request, reply) => {
        const { id } = request.params;

        await taskService.deleteTask(fastify.db, id, request.user.userId);

        return reply.send(response.success(null, 'Task deleted successfully'));
    });

    /**
     * POST /tasks/:id/complete - Mark task as complete
     */
    fastify.post('/:id/complete', async (request, reply) => {
        const { id } = request.params;

        const task = await taskService.completeTask(fastify.db, id, request.user.userId);

        return reply.send(response.success(task, 'Task marked as complete'));
    });

    /**
     * POST /tasks/:id/tags - Add tag to task
     */
    fastify.post('/:id/tags', async (request, reply) => {
        const { id } = request.params;
        const { tagId } = request.body;

        validate(commonSchemas.uuid, tagId);

        const task = await taskService.addTagToTask(
            fastify.db,
            id,
            tagId,
            request.user.userId
        );

        return reply.send(response.success(task, 'Tag added to task'));
    });

    /**
     * DELETE /tasks/:id/tags/:tagId - Remove tag from task
     */
    fastify.delete('/:id/tags/:tagId', async (request, reply) => {
        const { id, tagId } = request.params;

        const task = await taskService.removeTagFromTask(
            fastify.db,
            id,
            tagId,
            request.user.userId
        );

        return reply.send(response.success(task, 'Tag removed from task'));
    });
}

module.exports = taskRoutes;
