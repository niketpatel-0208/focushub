/**
 * Project Routes
 */

const projectService = require('../services/projectService');
const shared = require('../../shared');
const { response, projectSchemas, validate } = shared;

async function projectRoutes(fastify, options) {
    /**
     * GET /projects - List all projects
     */
    fastify.get('/', async (request, reply) => {
        const { includeArchived } = request.query;

        const projects = await projectService.getUserProjects(
            fastify.db,
            request.user.userId,
            includeArchived === 'true'
        );

        return reply.send(response.success(projects, 'Projects retrieved successfully'));
    });

    /**
     * GET /projects/:id - Get project by ID
     */
    fastify.get('/:id', async (request, reply) => {
        const { id } = request.params;

        const project = await projectService.getProjectById(
            fastify.db,
            id,
            request.user.userId
        );

        return reply.send(response.success(project, 'Project retrieved successfully'));
    });

    /**
     * POST /projects - Create project
     */
    fastify.post('/', async (request, reply) => {
        const data = validate(projectSchemas.create, request.body);

        const project = await projectService.createProject(
            fastify.db,
            request.user.userId,
            data
        );

        return reply.status(201).send(response.success(project, 'Project created successfully'));
    });

    /**
     * PUT /projects/:id - Update project
     */
    fastify.put('/:id', async (request, reply) => {
        const { id } = request.params;
        const data = validate(projectSchemas.update, request.body);

        const project = await projectService.updateProject(
            fastify.db,
            id,
            request.user.userId,
            data
        );

        return reply.send(response.success(project, 'Project updated successfully'));
    });

    /**
     * DELETE /projects/:id - Delete project
     */
    fastify.delete('/:id', async (request, reply) => {
        const { id } = request.params;

        await projectService.deleteProject(fastify.db, id, request.user.userId);

        return reply.send(response.success(null, 'Project deleted successfully'));
    });

    /**
     * POST /projects/:id/archive - Archive project
     */
    fastify.post('/:id/archive', async (request, reply) => {
        const { id } = request.params;

        const project = await projectService.archiveProject(
            fastify.db,
            id,
            request.user.userId,
            true
        );

        return reply.send(response.success(project, 'Project archived successfully'));
    });

    /**
     * POST /projects/:id/unarchive - Unarchive project
     */
    fastify.post('/:id/unarchive', async (request, reply) => {
        const { id } = request.params;

        const project = await projectService.archiveProject(
            fastify.db,
            id,
            request.user.userId,
            false
        );

        return reply.send(response.success(project, 'Project unarchived successfully'));
    });
}

module.exports = projectRoutes;
