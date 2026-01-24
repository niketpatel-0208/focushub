/**
 * Focus Session Service
 * Business logic for focus session tracking and Pomodoro timer functionality
 */

const shared = require('../../shared');
const { database, ApiError, logger } = shared;

/**
 * Create a new focus session
 * @param {Object} db - Database pool
 * @param {string} userId - User ID
 * @param {Object} sessionData - Session configuration
 * @returns {Promise<Object>} Created session with task details
 */
async function createSession(db, userId, sessionData) {
    const { taskId, plannedDuration = 1500, breakDuration = 300, sessionType = 'work' } = sessionData;

    // Check for existing active session
    const activeCheck = await database.query(
        db,
        `SELECT id FROM focus_sessions 
         WHERE user_id = $1 AND status IN ('active', 'paused')`,
        [userId]
    );

    if (activeCheck.rows.length > 0) {
        throw new ApiError('You already have an active session. Please complete or cancel it first.', 400);
    }

    // If task provided, verify it exists and belongs to user
    let taskData = null;
    if (taskId) {
        // Note: This requires cross-database query or API call
        // For now, we'll just store the taskId and validate on client
        // In production, use service-to-service communication
    }

    // Create session
    const result = await database.query(
        db,
        `INSERT INTO focus_sessions (
            user_id, task_id, planned_duration, break_duration, 
            session_type, status, started_at, elapsed_time, interruptions
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), 0, 0)
        RETURNING *`,
        [userId, taskId || null, plannedDuration, breakDuration, sessionType, 'active']
    );

    logger.info('Focus session created', { sessionId: result.rows[0].id, userId, taskId });

    return result.rows[0];
}

/**
 * Get sessions with filtering and pagination
 * @param {Object} db - Database pool
 * @param {string} userId - User ID
 * @param {Object} filters - Query filters
 * @returns {Promise<Object>} Sessions with pagination
 */
async function getSessions(db, userId, filters = {}) {
    const {
        status,
        taskId,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortBy = 'startedAt',
        sortOrder = 'desc'
    } = filters;

    let query = `
        SELECT * FROM focus_sessions
        WHERE user_id = $1
    `;
    const values = [userId];
    let paramCount = 2;

    if (status) {
        query += ` AND status = $${paramCount++}`;
        values.push(status);
    }

    if (taskId) {
        query += ` AND task_id = $${paramCount++}`;
        values.push(taskId);
    }

    if (startDate) {
        query += ` AND started_at >= $${paramCount++}`;
        values.push(startDate);
    }

    if (endDate) {
        query += ` AND started_at <= $${paramCount++}`;
        values.push(endDate);
    }

    // Map sortBy to actual column names
    const sortColumnMap = {
        startedAt: 'started_at',
        completedAt: 'completed_at',
        elapsedTime: 'elapsed_time'
    };
    const sortColumn = sortColumnMap[sortBy] || 'started_at';

    query += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;

    // Pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount}`;
    values.push(limit, offset);

    const result = await database.query(db, query, values);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM focus_sessions WHERE user_id = $1';
    const countValues = [userId];
    let countParam = 2;

    if (status) {
        countQuery += ` AND status = $${countParam++}`;
        countValues.push(status);
    }
    if (taskId) {
        countQuery += ` AND task_id = $${countParam++}`;
        countValues.push(taskId);
    }
    if (startDate) {
        countQuery += ` AND started_at >= $${countParam++}`;
        countValues.push(startDate);
    }
    if (endDate) {
        countQuery += ` AND started_at <= $${countParam++}`;
        countValues.push(endDate);
    }

    const countResult = await database.query(db, countQuery, countValues);
    const total = parseInt(countResult.rows[0].count);

    return {
        sessions: result.rows,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
}

/**
 * Get session by ID
 * @param {Object} db - Database pool
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Session details
 */
async function getSessionById(db, sessionId, userId) {
    const result = await database.query(
        db,
        'SELECT * FROM focus_sessions WHERE id = $1 AND user_id = $2',
        [sessionId, userId]
    );

    if (result.rows.length === 0) {
        throw new ApiError('Focus session not found', 404);
    }

    return result.rows[0];
}

/**
 * Get active session for user
 * @param {Object} db - Database pool
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Active session or null
 */
async function getActiveSession(db, userId) {
    const result = await database.query(
        db,
        `SELECT * FROM focus_sessions 
         WHERE user_id = $1 AND status IN ('active', 'paused')
         ORDER BY started_at DESC
         LIMIT 1`,
        [userId]
    );

    if (result.rows.length === 0) {
        return null;
    }

    const session = result.rows[0];

    // Calculate current elapsed time for active sessions
    if (session.status === 'active') {
        const now = new Date();
        const startTime = new Date(session.started_at);
        const resumeTime = session.resumed_at ? new Date(session.resumed_at) : startTime;

        // If session was paused and resumed, calculate from resume time
        const baseElapsed = session.elapsed_time || 0;
        const currentElapsed = Math.floor((now - (session.resumed_at ? resumeTime : startTime)) / 1000);

        session.currentElapsedTime = baseElapsed + currentElapsed;
    } else {
        session.currentElapsedTime = session.elapsed_time;
    }

    return session;
}

/**
 * Pause active session
 * @param {Object} db - Database pool
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated session
 */
async function pauseSession(db, sessionId, userId) {
    // Get current session
    const session = await getSessionById(db, sessionId, userId);

    if (session.status !== 'active') {
        throw new ApiError('Can only pause an active session', 400);
    }

    // Calculate elapsed time up to now
    const now = new Date();
    const resumeTime = session.resumed_at ? new Date(session.resumed_at) : new Date(session.started_at);
    const additionalElapsed = Math.floor((now - resumeTime) / 1000);
    const totalElapsed = (session.elapsed_time || 0) + additionalElapsed;

    // Update session
    const result = await database.query(
        db,
        `UPDATE focus_sessions
         SET status = 'paused',
             paused_at = NOW(),
             elapsed_time = $1,
             interruptions = interruptions + 1
         WHERE id = $2 AND user_id = $3
         RETURNING *`,
        [totalElapsed, sessionId, userId]
    );

    logger.info('Focus session paused', { sessionId, userId, elapsedTime: totalElapsed });

    return result.rows[0];
}

/**
 * Resume paused session
 * @param {Object} db - Database pool
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated session
 */
async function resumeSession(db, sessionId, userId) {
    const session = await getSessionById(db, sessionId, userId);

    if (session.status !== 'paused') {
        throw new ApiError('Can only resume a paused session', 400);
    }

    // Calculate pause duration
    const now = new Date();
    const pausedTime = new Date(session.paused_at);
    const pauseDelta = Math.floor((now - pausedTime) / 1000);
    const totalPauseDuration = (session.pause_duration || 0) + pauseDelta;

    // Update session
    const result = await database.query(
        db,
        `UPDATE focus_sessions
         SET status = 'active',
             resumed_at = NOW(),
             pause_duration = $1
         WHERE id = $2 AND user_id = $3
         RETURNING *`,
        [totalPauseDuration, sessionId, userId]
    );

    logger.info('Focus session resumed', { sessionId, userId, totalPauseDuration });

    return result.rows[0];
}

/**
 * Complete session
 * @param {Object} db - Database pool
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @param {Object} data - Completion data (notes)
 * @returns {Promise<Object>} Completed session
 */
async function completeSession(db, sessionId, userId, data = {}) {
    const session = await getSessionById(db, sessionId, userId);

    if (!['active', 'paused'].includes(session.status)) {
        throw new ApiError('Can only complete an active or paused session', 400);
    }

    // Calculate final elapsed time
    let finalElapsed = session.elapsed_time || 0;

    if (session.status === 'active') {
        const now = new Date();
        const resumeTime = session.resumed_at ? new Date(session.resumed_at) : new Date(session.started_at);
        const additionalElapsed = Math.floor((now - resumeTime) / 1000);
        finalElapsed += additionalElapsed;
    }

    // Update session
    const result = await database.query(
        db,
        `UPDATE focus_sessions
         SET status = 'completed',
             completed_at = NOW(),
             elapsed_time = $1,
             notes = COALESCE($2, notes)
         WHERE id = $3 AND user_id = $4
         RETURNING *`,
        [finalElapsed, data.notes || null, sessionId, userId]
    );

    logger.info('Focus session completed', {
        sessionId,
        userId,
        elapsedTime: finalElapsed,
        plannedDuration: session.planned_duration
    });

    return result.rows[0];
}

/**
 * Cancel session
 * @param {Object} db - Database pool
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Cancelled session
 */
async function cancelSession(db, sessionId, userId) {
    const session = await getSessionById(db, sessionId, userId);

    if (['completed', 'cancelled'].includes(session.status)) {
        throw new ApiError('Cannot cancel a completed or already cancelled session', 400);
    }

    // Calculate elapsed time at cancellation
    let finalElapsed = session.elapsed_time || 0;

    if (session.status === 'active') {
        const now = new Date();
        const resumeTime = session.resumed_at ? new Date(session.resumed_at) : new Date(session.started_at);
        const additionalElapsed = Math.floor((now - resumeTime) / 1000);
        finalElapsed += additionalElapsed;
    }

    // Update session
    const result = await database.query(
        db,
        `UPDATE focus_sessions
         SET status = 'cancelled',
             cancelled_at = NOW(),
             elapsed_time = $1
         WHERE id = $2 AND user_id = $3
         RETURNING *`,
        [finalElapsed, sessionId, userId]
    );

    logger.info('Focus session cancelled', { sessionId, userId, elapsedTime: finalElapsed });

    return result.rows[0];
}

/**
 * Get focus session statistics
 * @param {Object} db - Database pool
 * @param {string} userId - User ID
 * @param {Object} query - Query parameters (period, startDate, endDate)
 * @returns {Promise<Object>} Statistics
 */
async function getStats(db, userId, query = {}) {
    const { period = 'week', startDate, endDate } = query;

    // Calculate date range based on period
    let dateFilter = '';
    const values = [userId];
    let paramCount = 2;

    if (startDate && endDate) {
        dateFilter = ` AND started_at BETWEEN $${paramCount++} AND $${paramCount++}`;
        values.push(startDate, endDate);
    } else {
        // Auto-calculate based on period
        const periodMap = {
            day: '1 day',
            week: '7 days',
            month: '30 days',
            year: '365 days',
            all: null
        };

        if (period !== 'all') {
            dateFilter = ` AND started_at >= NOW() - INTERVAL '${periodMap[period]}'`;
        }
    }

    // Get summary statistics
    const summaryResult = await database.query(
        db,
        `SELECT
            COUNT(*) as total_sessions,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
            COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_sessions,
            COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
            COUNT(*) FILTER (WHERE status = 'paused') as paused_sessions,
            SUM(elapsed_time) FILTER (WHERE status = 'completed') as total_focus_time,
            AVG(elapsed_time) FILTER (WHERE status = 'completed') as avg_session_duration,
            MAX(elapsed_time) FILTER (WHERE status = 'completed') as longest_session,
            SUM(break_duration) as total_break_time,
            AVG(interruptions) FILTER (WHERE status = 'completed') as avg_interruptions
         FROM focus_sessions
         WHERE user_id = $1${dateFilter}`,
        values
    );

    const summary = summaryResult.rows[0];

    // Calculate completion rate
    const completionRate = summary.total_sessions > 0
        ? ((summary.completed_sessions / summary.total_sessions) * 100).toFixed(1)
        : 0;

    // Get most productive hour
    const hourResult = await database.query(
        db,
        `SELECT 
            EXTRACT(HOUR FROM started_at) as hour,
            COUNT(*) as session_count
         FROM focus_sessions
         WHERE user_id = $1 AND status = 'completed'${dateFilter}
         GROUP BY EXTRACT(HOUR FROM started_at)
         ORDER BY session_count DESC
         LIMIT 1`,
        values
    );

    const mostProductiveHour = hourResult.rows.length > 0 ? hourResult.rows[0].hour : null;

    // Get most focused on task (if we have task data)
    const taskResult = await database.query(
        db,
        `SELECT 
            task_id,
            COUNT(*) as sessions_count,
            SUM(elapsed_time) as total_time
         FROM focus_sessions
         WHERE user_id = $1 AND task_id IS NOT NULL AND status = 'completed'${dateFilter}
         GROUP BY task_id
         ORDER BY total_time DESC
         LIMIT 1`,
        values
    );

    const mostFocusedTask = taskResult.rows.length > 0 ? taskResult.rows[0] : null;

    return {
        period,
        summary: {
            totalSessions: parseInt(summary.total_sessions),
            completedSessions: parseInt(summary.completed_sessions),
            cancelledSessions: parseInt(summary.cancelled_sessions),
            activeSessions: parseInt(summary.active_sessions),
            pausedSessions: parseInt(summary.paused_sessions)
        },
        timeTracking: {
            totalFocusTime: parseInt(summary.total_focus_time) || 0,
            averageSessionDuration: parseFloat(summary.avg_session_duration) || 0,
            longestSession: parseInt(summary.longest_session) || 0,
            totalBreakTime: parseInt(summary.total_break_time) || 0
        },
        productivity: {
            completionRate: parseFloat(completionRate),
            averageInterruptions: parseFloat(summary.avg_interruptions) || 0,
            mostProductiveHour: mostProductiveHour ? parseInt(mostProductiveHour) : null
        },
        taskProgress: {
            mostFocusedTask: mostFocusedTask ? {
                taskId: mostFocusedTask.task_id,
                sessionsCount: parseInt(mostFocusedTask.sessions_count),
                totalTime: parseInt(mostFocusedTask.total_time)
            } : null
        }
    };
}

module.exports = {
    createSession,
    getSessions,
    getSessionById,
    getActiveSession,
    pauseSession,
    resumeSession,
    completeSession,
    cancelSession,
    getStats
};
