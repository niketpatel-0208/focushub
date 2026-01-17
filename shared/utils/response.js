/**
 * Response Formatter Utility
 * Standardizes API responses across all services
 */

/**
 * Success response
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {Object} meta - Optional metadata (pagination, etc.)
 * @returns {Object} Formatted success response
 */
function success(data, message = 'Success', meta = null) {
    const response = {
        success: true,
        message,
        data,
    };

    if (meta) {
        response.meta = meta;
    }

    return response;
}

/**
 * Error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} errors - Detailed error information
 * @returns {Object} Formatted error response
 */
function error(message, statusCode = 500, errors = null) {
    const response = {
        success: false,
        message,
        statusCode,
    };

    if (errors) {
        response.errors = errors;
    }

    return response;
}

/**
 * Paginated response
 * @param {Array} items - Array of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} Formatted paginated response
 */
function paginated(items, page, limit, total) {
    const totalPages = Math.ceil(total / limit);

    return success(items, 'Success', {
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    });
}

module.exports = {
    success,
    error,
    paginated,
};
