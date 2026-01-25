const { z } = require('zod');

const habitSchemas = {
    // Create habit
    createHabit: z.object({
        name: z.string().min(1).max(255),
        description: z.string().max(1000).optional(),
        icon: z.string().max(50).optional(),
        color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
        frequency: z.enum(['daily', 'weekly', 'custom']).default('daily'),
        targetValue: z.number().int().positive().default(1),
        unit: z.string().max(50).optional(),
        weeklyDays: z.array(z.number().int().min(0).max(6)).optional(),
        customIntervalDays: z.number().int().positive().optional(),
        reminderEnabled: z.boolean().default(false),
        reminderTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(), // HH:MM or HH:MM:SS
    }).

        refine(
            (data) => {
                if (data.frequency === 'weekly') {
                    return data.weeklyDays && data.weeklyDays.length > 0;
                }
                return true;
            },
            { message: 'weeklyDays required for weekly habits (at least one day)' }
        ).refine(
            (data) => {
                if (data.frequency === 'custom') {
                    return data.customIntervalDays && data.customIntervalDays > 0;
                }
                return true;
            },
            { message: 'customIntervalDays required for custom habits' }
        ),

    // Update habit
    updateHabit: z.object({
        name: z.string().min(1).max(255).optional(),
        description: z.string().max(1000).optional(),
        icon: z.string().max(50).optional(),
        color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
        targetValue: z.number().int().positive().optional(),
        unit: z.string().max(50).optional(),
        weeklyDays: z.array(z.number().int().min(0).max(6)).optional(),
        customIntervalDays: z.number().int().positive().optional(),
        reminderEnabled: z.boolean().optional(),
        reminderTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
    }),

    // Log completion
    logCompletion: z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD, defaults to today
        value: z.number().int().positive().default(1),
        notes: z.string().max(500).optional(),
    }),

    // Query params for listing habits
    listHabitsQuery: z.object({
        frequency: z.enum(['daily', 'weekly', 'custom']).optional(),
        archived: z.string().transform(val => val === 'true').optional(),
        page: z.string().transform(val => parseInt(val) || 1).optional(),
        limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)).optional(),
        sortBy: z.enum(['name', 'createdAt', 'currentStreak']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
    }),

    // Query params for logs
    logsQuery: z.object({
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }),

    // Stats query
    statsQuery: z.object({
        period: z.enum(['week', 'month', 'quarter', 'year', 'all']).optional(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }),
};

module.exports = habitSchemas;
