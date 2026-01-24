/**
 * Validation Schemas using Zod
 * Reusable validation schemas for common data types
 */

const { z } = require('zod');

// User validation schemas
const authSchemas = {
    register: z.object({
        email: z.string().email('Invalid email format'),
        password: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
            .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
            .regex(/[0-9]/, 'Password must contain at least one number')
            .regex(
                /[!@#$%^&*(),.?":{}|<>]/,
                'Password must contain at least one special character'
            ),
        username: z
            .string()
            .min(3, 'Username must be at least 3 characters')
            .max(100, 'Username must be less than 100 characters')
            .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
        firstName: z.string().min(1, 'First name is required').max(100).optional(),
        lastName: z.string().min(1, 'Last name is required').max(100).optional(),
    }),

    login: z.object({
        email: z.string().email('Invalid email format'),
        password: z.string().min(1, 'Password is required'),
    }),

    refreshToken: z.object({
        refreshToken: z.string().min(1, 'Refresh token is required'),
    }),

    updateProfile: z.object({
        firstName: z.string().min(1).max(100).optional(),
        lastName: z.string().min(1).max(100).optional(),
        username: z
            .string()
            .min(3)
            .max(100)
            .regex(/^[a-zA-Z0-9_-]+$/)
            .optional(),
    }),

    changePassword: z.object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: z
            .string()
            .min(8, 'New password must be at least 8 characters')
            .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
            .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
            .regex(/[0-9]/, 'New password must contain at least one number')
            .regex(
                /[!@#$%^&*(),.?":{}|<>]/,
                'New password must contain at least one special character'
            ),
    }),
};

// Common validation helpers
const commonSchemas = {
    uuid: z.string().uuid('Invalid ID format'),
    email: z.string().email('Invalid email format'),
    pagination: z.object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
    }),
};

/**
 * Validate data against a Zod schema
 * @param {Object} schema - Zod schema
 * @param {*} data - Data to validate
 * @returns {Object} Validated data
 * @throws {Error} Validation error with details
 */
function validate(schema, data) {
    try {
        return schema.parse(data);
    } catch (error) {
        if (error instanceof z.ZodError) {
            // Safely map errors with fallback
            const formattedErrors = (error.errors || []).map((err) => ({
                field: err.path ? err.path.join('.') : 'unknown',
                message: err.message,
            }));
            const err = new Error('Validation failed');
            err.validation = formattedErrors;
            throw err;
        }
        throw error;
    }
}

module.exports = {
    authSchemas,
    commonSchemas,
    validate,
};
