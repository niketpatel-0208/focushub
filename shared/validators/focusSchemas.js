/**
 * Focus Session Validation Schemas
 * Zod schemas for validating focus session API requests
 */

const { z } = require('zod');

const focusSchemas = {
    // Create new focus session
    createSession: z.object({
        taskId: z.string().uuid('Invalid task ID format').optional(),
        plannedDuration: z
            .number()
            .int('Duration must be an integer')
            .min(60, 'Duration must be at least 60 seconds (1 minute)')
            .max(7200, 'Duration cannot exceed 7200 seconds (2 hours)')
            .default(1500),
        breakDuration: z
            .number()
            .int('Break duration must be an integer')
            .min(0, 'Break duration cannot be negative')
            .max(1800, 'Break duration cannot exceed 1800 seconds (30 minutes)')
            .default(300),
        sessionType: z.enum(['work', 'break'], {
            errorMap: () => ({ message: 'Session type must be either "work" or "break"' })
        }).default('work')
    }),

    // Update session (add notes on completion)
    updateSession: z.object({
        notes: z
            .string()
            .max(2000, 'Notes cannot exceed 2000 characters')
            .optional()
    }),

    // Query parameters for listing sessions
    listSessions: z.object({
        status: z.enum(['active', 'paused', 'completed', 'cancelled']).optional(),
        taskId: z.string().uuid().optional(),
        startDate: z.string().datetime('Invalid start date format').optional(),
        endDate: z.string().datetime('Invalid end date format').optional(),
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
        sortBy: z.enum(['startedAt', 'completedAt', 'elapsedTime']).default('startedAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc')
    }),

    // Query parameters for statistics
    statsQuery: z.object({
        period: z.enum(['day', 'week', 'month', 'year', 'all'], {
            errorMap: () => ({ message: 'Period must be one of: day, week, month, year, all' })
        }).default('week'),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional()
    })
};

module.exports = {
    focusSchemas
};
