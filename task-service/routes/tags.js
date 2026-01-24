/**
 * Tag Routes
 */

const tagService = require('../services/tagService');
const shared = require('../../shared');
const { response, tagSchemas, validate } = shared;

async function tagRoutes(fastify, options) {
    /**
     * GET /tags - List all tags
     */
    fastify.get('/', async (request, reply) => {
        const tags = await tagService.getUserTags(fastify.db, request.user.userId);

        return reply.send(response.success(tags, 'Tags retrieved successfully'));
    });

    /**
     * GET /tags/:id - Get tag by ID
     */
    fastify.get('/:id', async (request, reply) => {
        const { id } = request.params;

        const tag = await tagService.getTagById(fastify.db, id, request.user.userId);

        return reply.send(response.success(tag, 'Tag retrieved successfully'));
    });

    /**
     * POST /tags - Create tag
     */
    fastify.post('/', async (request, reply) => {
        const data = validate(tagSchemas.create, request.body);

        const tag = await tagService.createTag(fastify.db, request.user.userId, data);

        return reply.status(201).send(response.success(tag, 'Tag created successfully'));
    });

    /**
     * PUT /tags/:id - Update tag
     */
    fastify.put('/:id', async (request, reply) => {
        const { id } = request.params;
        const data = validate(tagSchemas.update, request.body);

        const tag = await tagService.updateTag(fastify.db, id, request.user.userId, data);

        return reply.send(response.success(tag, 'Tag updated successfully'));
    });

    /**
     * DELETE /tags/:id - Delete tag
     */
    fastify.delete('/:id', async (request, reply) => {
        const { id } = request.params;

        await tagService.deleteTag(fastify.db, id, request.user.userId);

        return reply.send(response.success(null, 'Tag deleted successfully'));
    });
}

module.exports = tagRoutes;
