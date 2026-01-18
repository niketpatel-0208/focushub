/**
 * Task Management Validation Schemas
 */

const { z } = require('zod');

// Project schemas
const projectSchemas = {
    create: z.object({
        name: z.string().min(1, 'Project name is required').max(200),
        description: z.string().max(1000).optional(),
        color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
    }),

    update: z.object({
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(1000).optional(),
        color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
    }),
};

// Task schemas
const taskSchemas = {
    create: z.object({
        title: z.string().min(1, 'Task title is required').max(500),
        description: z.string().max(5000).optional(),
        projectId: z.string().uuid().optional(),
        status: z.enum(['todo', 'in_progress', 'completed']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        dueDate: z.string().datetime().optional(),
    }),

    update: z.object({
        title: z.string().min(1).max(500).optional(),
        description: z.string().max(5000).optional(),
        projectId: z.string().uuid().nullable().optional(),
        status: z.enum(['todo', 'in_progress', 'completed']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        dueDate: z.string().datetime().nullable().optional(),
    }),

    filter: z.object({
        status: z.enum(['todo', 'in_progress', 'completed']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        projectId: z.string().uuid().optional(),
        tagId: z.string().uuid().optional(),
        search: z.string().max(200).optional(),
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
    }),
};

// Tag schemas
const tagSchemas = {
    create: z.object({
        name: z.string().min(1, 'Tag name is required').max(50),
        color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
    }),

    update: z.object({
        name: z.string().min(1).max(50).optional(),
        color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
    }),
};

module.exports = {
    projectSchemas,
    taskSchemas,
    tagSchemas,
};
