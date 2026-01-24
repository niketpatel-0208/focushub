/**
 * Tag Service
 * Business logic for tag management
 */

const shared = require('../../shared');
const { database, ApiError, logger } = shared;

/**
 * Get all tags for a user
 */
async function getUserTags(db, userId) {
    const result = await database.query(db,
        'SELECT * FROM tags WHERE user_id = $1 ORDER BY name ASC',
        [userId]
    );

    return result.rows;
}

/**
 * Get tag by ID
 */
async function getTagById(db, tagId, userId) {
    const result = await database.query(db,
        'SELECT * FROM tags WHERE id = $1 AND user_id = $2',
        [tagId, userId]
    );

    if (result.rows.length === 0) {
        throw new ApiError('Tag not found', 404);
    }

    return result.rows[0];
}

/**
 * Create new tag
 */
async function createTag(db, userId, tagData) {
    const { name, color } = tagData;

    try {
        const result = await database.query(db,
            `INSERT INTO tags (user_id, name, color)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [userId, name, color || '#8B5CF6']
        );

        return result.rows[0];
    } catch (error) {
        if (error.code === '23505') {
            throw new ApiError('Tag with this name already exists', 400);
        }
        throw error;
    }
}

/**
 * Update tag
 */
async function updateTag(db, tagId, userId, updates) {
    await getTagById(db, tagId, userId);

    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
        fields.push(`name = $${paramCount++}`);
        values.push(updates.name);
    }

    if (updates.color !== undefined) {
        fields.push(`color = $${paramCount++}`);
        values.push(updates.color);
    }

    if (fields.length === 0) {
        throw new ApiError('No fields to update', 400);
    }

    values.push(tagId, userId);

    try {
        const result = await database.query(db,
            `UPDATE tags SET ${fields.join(', ')}
       WHERE id = $${paramCount++} AND user_id = $${paramCount}
       RETURNING *`,
            values
        );

        return result.rows[0];
    } catch (error) {
        if (error.code === '23505') {
            throw new ApiError('Tag with this name already exists', 400);
        }
        throw error;
    }
}

/**
 * Delete tag
 */
async function deleteTag(db, tagId, userId) {
    await getTagById(db, tagId, userId);

    await database.query(db,
        'DELETE FROM tags WHERE id = $1 AND user_id = $2',
        [tagId, userId]
    );

    logger.info('Tag deleted', { tagId, userId });
}

module.exports = {
    getUserTags,
    getTagById,
    createTag,
    updateTag,
    deleteTag,
};
