/**
 * Task Service
 * Business logic for task management
 */

const shared = require('../../shared');
const { database, ApiError, logger } = shared;

/**
 * Get tasks with filtering
 */
async function getTasks(db, userId, filters = {}) {
    const { status, priority, projectId, tagId, search, page = 1, limit = 20 } = filters;

    let query = `
    SELECT t.*,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object('id', tags.id, 'name', tags.name, 'color', tags.color)
        ) FILTER (WHERE tags.id IS NOT NULL),
        '[]'
      ) as tags
    FROM tasks t
    LEFT JOIN task_tags tt ON t.id = tt.task_id
    LEFT JOIN tags ON tt.tag_id = tags.id
    WHERE t.user_id = $1
  `;

    const values = [userId];
    let paramCount = 2;

    if (status) {
        query += ` AND t.status = $${paramCount++}`;
        values.push(status);
    }

    if (priority) {
        query += ` AND t.priority = $${paramCount++}`;
        values.push(priority);
    }

    if (projectId) {
        query += ` AND t.project_id = $${paramCount++}`;
        values.push(projectId);
    }

    if (tagId) {
        query += ` AND EXISTS (
      SELECT 1 FROM task_tags WHERE task_id = t.id AND tag_id = $${paramCount++}
    )`;
        values.push(tagId);
    }

    if (search) {
        query += ` AND (t.title ILIKE $${paramCount++} OR t.description ILIKE $${paramCount})`;
        const searchPattern = `%${search}%`;
        values.push(searchPattern, searchPattern);
        paramCount++;
    }

    query += ` GROUP BY t.id ORDER BY t.created_at DESC`;

    // Pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount}`;
    values.push(limit, offset);

    const result = await database.query(db, query, values);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM tasks WHERE user_id = $1';
    const countValues = [userId];
    let countParam = 2;

    if (status) {
        countQuery += ` AND status = $${countParam++}`;
        countValues.push(status);
    }
    if (priority) {
        countQuery += ` AND priority = $${countParam++}`;
        countValues.push(priority);
    }
    if (projectId) {
        countQuery += ` AND project_id = $${countParam++}`;
        countValues.push(projectId);
    }
    if (search) {
        countQuery += ` AND (title ILIKE $${countParam++} OR description ILIKE $${countParam})`;
        countValues.push(`%${search}%`, `%${search}%`);
        countParam++;
    }

    const countResult = await database.query(db, countQuery, countValues);
    const total = parseInt(countResult.rows[0].count);

    return {
        tasks: result.rows,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

/**
 * Get task by ID
 */
async function getTaskById(db, taskId, userId) {
    const result = await database.query(db,
        `SELECT t.*,
      COALESCE(
        json_agg(
          jsonb_build_object('id', tags.id, 'name', tags.name, 'color', tags.color)
        ) FILTER (WHERE tags.id IS NOT NULL),
        '[]'
      ) as tags
    FROM tasks t
    LEFT JOIN task_tags tt ON t.id = tt.task_id
    LEFT JOIN tags ON tt.tag_id = tags.id
    WHERE t.id = $1 AND t.user_id = $2
    GROUP BY t.id`,
        [taskId, userId]
    );

    if (result.rows.length === 0) {
        throw new ApiError('Task not found', 404);
    }

    return result.rows[0];
}

/**
 * Create new task
 */
async function createTask(db, userId, taskData) {
    const { title, description, projectId, status, priority, dueDate } = taskData;

    const result = await database.query(db,
        `INSERT INTO tasks (user_id, title, description, project_id, status, priority, due_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
        [
            userId,
            title,
            description || null,
            projectId || null,
            status || 'todo',
            priority || 'medium',
            dueDate || null,
        ]
    );

    return result.rows[0];
}

/**
 * Update task
 */
async function updateTask(db, taskId, userId, updates) {
    await getTaskById(db, taskId, userId);

    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.title !== undefined) {
        fields.push(`title = $${paramCount++}`);
        values.push(updates.title);
    }

    if (updates.description !== undefined) {
        fields.push(`description = $${paramCount++}`);
        values.push(updates.description);
    }

    if (updates.projectId !== undefined) {
        fields.push(`project_id = $${paramCount++}`);
        values.push(updates.projectId);
    }

    if (updates.status !== undefined) {
        fields.push(`status = $${paramCount++}`);
        values.push(updates.status);

        // Auto-set completed_at if status is completed
        if (updates.status === 'completed') {
            fields.push(`completed_at = NOW()`);
        } else if (updates.status !== 'completed') {
            fields.push(`completed_at = NULL`);
        }
    }

    if (updates.priority !== undefined) {
        fields.push(`priority = $${paramCount++}`);
        values.push(updates.priority);
    }

    if (updates.dueDate !== undefined) {
        fields.push(`due_date = $${paramCount++}`);
        values.push(updates.dueDate);
    }

    if (fields.length === 0) {
        throw new ApiError('No fields to update', 400);
    }

    values.push(taskId, userId);

    const result = await database.query(db,
        `UPDATE tasks SET ${fields.join(', ')}
     WHERE id = $${paramCount++} AND user_id = $${paramCount}
     RETURNING *`,
        values
    );

    return result.rows[0];
}

/**
 * Delete task
 */
async function deleteTask(db, taskId, userId) {
    await getTaskById(db, taskId, userId);

    await database.query(db,
        'DELETE FROM tasks WHERE id = $1 AND user_id = $2',
        [taskId, userId]
    );

    logger.info('Task deleted', { taskId, userId });
}

/**
 * Mark task as complete
 */
async function completeTask(db, taskId, userId) {
    await getTaskById(db, taskId, userId);

    const result = await database.query(db,
        `UPDATE tasks
     SET status = 'completed', completed_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
        [taskId, userId]
    );

    return result.rows[0];
}

/**
 * Add tag to task
 */
async function addTagToTask(db, taskId, tagId, userId) {
    // Verify ownership
    await getTaskById(db, taskId, userId);

    // Verify tag exists and belongs to user
    const tagResult = await database.query(db,
        'SELECT id FROM tags WHERE id = $1 AND user_id = $2',
        [tagId, userId]
    );

    if (tagResult.rows.length === 0) {
        throw new ApiError('Tag not found', 404);
    }

    try {
        await database.query(db,
            'INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2)',
            [taskId, tagId]
        );
    } catch (error) {
        if (error.code === '23505') {
            throw new ApiError('Tag already added to this task', 400);
        }
        throw error;
    }

    return await getTaskById(db, taskId, userId);
}

/**
 * Remove tag from task
 */
async function removeTagFromTask(db, taskId, tagId, userId) {
    await getTaskById(db, taskId, userId);

    await database.query(db,
        'DELETE FROM task_tags WHERE task_id = $1 AND tag_id = $2',
        [taskId, tagId]
    );

    return await getTaskById(db, taskId, userId);
}

/**
 * Get task statistics
 */
async function getTaskStats(db, userId) {
    const result = await database.query(db,
        `SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'todo') as todo,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'completed') as overdue,
      COUNT(*) FILTER (WHERE due_date::date = CURRENT_DATE AND status != 'completed') as due_today
    FROM tasks
    WHERE user_id = $1`,
        [userId]
    );

    return result.rows[0];
}

module.exports = {
    getTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    addTagToTask,
    removeTagFromTask,
    getTaskStats,
};
