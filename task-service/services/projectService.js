/**
 * Project Service
 * Business logic for project management
 */

const shared = require('../../shared');
const { database, ApiError, logger } = shared;

/**
 * Get all projects for a user
 */
async function getUserProjects(db, userId, includeArchived = false) {
    const query = includeArchived
        ? 'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC'
        : 'SELECT * FROM projects WHERE user_id = $1 AND is_archived = false ORDER BY created_at DESC';

    const result = await database.query(db, query, [userId]);
    return result.rows;
}

/**
 * Get project by ID
 */
async function getProjectById(db, projectId, userId) {
    const result = await database.query(db,
        'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
        [projectId, userId]
    );

    if (result.rows.length === 0) {
        throw new ApiError('Project not found', 404);
    }

    return result.rows[0];
}

/**
 * Create new project
 */
async function createProject(db, userId, projectData) {
    const { name, description, color } = projectData;

    const result = await database.query(db,
        `INSERT INTO projects (user_id, name, description, color)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
        [userId, name, description || null, color || '#3B82F6']
    );

    return result.rows[0];
}

/**
 * Update project
 */
async function updateProject(db, projectId, userId, updates) {
    // First verify ownership
    await getProjectById(db, projectId, userId);

    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
        fields.push(`name = $${paramCount++}`);
        values.push(updates.name);
    }

    if (updates.description !== undefined) {
        fields.push(`description = $${paramCount++}`);
        values.push(updates.description);
    }

    if (updates.color !== undefined) {
        fields.push(`color = $${paramCount++}`);
        values.push(updates.color);
    }

    if (fields.length === 0) {
        throw new ApiError('No fields to update', 400);
    }

    values.push(projectId, userId);

    const result = await database.query(db,
        `UPDATE projects SET ${fields.join(', ')}
     WHERE id = $${paramCount++} AND user_id = $${paramCount}
     RETURNING *`,
        values
    );

    return result.rows[0];
}

/**
 * Delete project
 */
async function deleteProject(db, projectId, userId) {
    await getProjectById(db, projectId, userId);

    await database.query(db,
        'DELETE FROM projects WHERE id = $1 AND user_id = $2',
        [projectId, userId]
    );

    logger.info('Project deleted', { projectId, userId });
}

/**
 * Archive/unarchive project
 */
async function archiveProject(db, projectId, userId, isArchived) {
    await getProjectById(db, projectId, userId);

    const result = await database.query(db,
        'UPDATE projects SET is_archived = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
        [isArchived, projectId, userId]
    );

    return result.rows[0];
}

module.exports = {
    getUserProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject,
    archiveProject,
};
