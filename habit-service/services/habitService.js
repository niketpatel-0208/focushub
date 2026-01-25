const { ApiError } = require('../../shared');

class HabitService {
    constructor(pool) {
        this.pool = pool;
    }

    // Create new habit
    async createHabit(userId, habitData) {
        const {
            name, description, icon, color, frequency, targetValue,
            unit, weeklyDays, customIntervalDays, reminderEnabled, reminderTime
        } = habitData;

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Insert habit
            const habitResult = await client.query(
                `INSERT INTO habits (
          user_id, name, description, icon, color, frequency, target_value,
          unit, weekly_days, custom_interval_days, reminder_enabled, reminder_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
                [userId, name, description, icon, color, frequency, targetValue,
                    unit, weeklyDays, customIntervalDays, reminderEnabled, reminderTime]
            );

            const habit = habitResult.rows[0];

            // Initialize streak record
            await client.query(
                `INSERT INTO habit_streaks (habit_id, user_id)
        VALUES ($1, $2)`,
                [habit.id, userId]
            );

            await client.query('COMMIT');
            return habit;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Get all habits for user with optional filters
    async getHabits(userId, filters = {}) {
        const { frequency, archived, page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc' } = filters;

        let query = `
      SELECT h.*, 
             s.current_streak, s.longest_streak, s.last_completed_date
      FROM habits h
      LEFT JOIN habit_streaks s ON h.id = s.habit_id
      WHERE h.user_id = $1
    `;
        const params = [userId];
        let paramIndex = 2;

        if (frequency) {
            query += ` AND h.frequency = $${paramIndex}`;
            params.push(frequency);
            paramIndex++;
        }

        if (archived !== undefined) {
            query += ` AND h.is_archived = $${paramIndex}`;
            params.push(archived);
            paramIndex++;
        }

        // Sorting
        const validSortColumns = {
            name: 'h.name',
            createdAt: 'h.created_at',
            currentStreak: 's.current_streak'
        };
        const sortColumn = validSortColumns[sortBy] || 'h.name';
        const order = sortOrder === 'desc' ? 'DESC' : 'ASC';
        query += ` ORDER BY ${sortColumn} ${order}`;

        // Pagination
        const offset = (page - 1) * limit;
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await this.pool.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM habits WHERE user_id = $1';
        const countParams = [userId];
        if (frequency) {
            countQuery += ` AND frequency = $2`;
            countParams.push(frequency);
        }
        if (archived !== undefined) {
            countQuery += ` AND is_archived = $${countParams.length + 1}`;
            countParams.push(archived);
        }
        const countResult = await this.pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        return {
            habits: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // Get single habit by ID
    async getHabitById(habitId, userId) {
        const result = await this.pool.query(
            `SELECT h.*, 
              s.current_streak, s.longest_streak, 
              s.last_completed_date, s.total_completions
       FROM habits h
       LEFT JOIN habit_streaks s ON h.id = s.habit_id
       WHERE h.id = $1 AND h.user_id = $2`,
            [habitId, userId]
        );

        if (result.rows.length === 0) {
            throw new ApiError('Habit not found', 404);
        }

        return result.rows[0];
    }

    // Update habit
    async updateHabit(habitId, userId, updates) {
        const habit = await this.getHabitById(habitId, userId);

        // Build update query
        const fields = [];
        const values = [];
        let paramIndex = 1;

        const allowedFields = ['name', 'description', 'icon', 'color', 'targetValue',
            'unit', 'weeklyDays', 'customIntervalDays', 'reminderEnabled', 'reminderTime'];

        const fieldMap = {
            targetValue: 'target_value',
            weeklyDays: 'weekly_days',
            customIntervalDays: 'custom_interval_days',
            reminderEnabled: 'reminder_enabled',
            reminderTime: 'reminder_time'
        };

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key) && value !== undefined) {
                const dbField = fieldMap[key] || key;
                fields.push(`${dbField} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }

        if (fields.length === 0) {
            return habit;
        }

        values.push(habitId, userId);
        const query = `
      UPDATE habits 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      RETURNING *
    `;

        const result = await this.pool.query(query, values);
        return result.rows[0];
    }

    // Delete habit
    async deleteHabit(habitId, userId) {
        const result = await this.pool.query(
            'DELETE FROM habits WHERE id = $1 AND user_id = $2 RETURNING *',
            [habitId, userId]
        );

        if (result.rows.length === 0) {
            throw new ApiError('Habit not found', 404);
        }

        return result.rows[0];
    }

    // Archive/unarchive habit
    async archiveHabit(habitId, userId, archived = true) {
        const result = await this.pool.query(
            `UPDATE habits 
       SET is_archived = $1, archived_at = $2
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
            [archived, archived ? new Date() : null, habitId, userId]
        );

        if (result.rows.length === 0) {
            throw new ApiError('Habit not found', 404);
        }

        return result.rows[0];
    }

    // Log habit completion
    async logCompletion(habitId, userId, { date, value = 1, notes }) {
        const habit = await this.getHabitById(habitId, userId);

        const completionDate = date || new Date().toISOString().split('T')[0];

        // Validate not future date
        if (new Date(completionDate) > new Date()) {
            throw new ApiError('Cannot log completion for future dates', 400);
        }

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Upsert completion log
            const logResult = await client.query(
                `INSERT INTO habit_logs (habit_id, user_id, completed_date, completed_value, notes)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (habit_id, completed_date)
         DO UPDATE SET completed_value = $4, notes = $5, updated_at = NOW()
         RETURNING *`,
                [habitId, userId, completionDate, value, notes]
            );

            // Recalculate streak
            await this.recalculateStreak(habitId, habit.frequency, habit.weekly_days, habit.custom_interval_days, client);

            await client.query('COMMIT');
            return logResult.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Remove completion log
    async removeCompletion(habitId, userId, date) {
        await this.getHabitById(habitId, userId); // Verify ownership

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const result = await client.query(
                'DELETE FROM habit_logs WHERE habit_id = $1 AND completed_date = $2 RETURNING *',
                [habitId, date]
            );

            if (result.rows.length === 0) {
                throw new ApiError('Completion log not found', 404);
            }

            // Recalculate streak
            const habit = await this.getHabitById(habitId, userId);
            await this.recalculateStreak(habitId, habit.frequency, habit.weekly_days, habit.custom_interval_days, client);

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Get completion logs for habit
    async getHabitLogs(habitId, userId, { startDate, endDate } = {}) {
        await this.getHabitById(habitId, userId); // Verify ownership

        let query = 'SELECT * FROM habit_logs WHERE habit_id = $1';
        const params = [habitId];
        let paramIndex = 2;

        if (startDate) {
            query += ` AND completed_date >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            query += ` AND completed_date <= $${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }

        query += ' ORDER BY completed_date DESC';

        const result = await this.pool.query(query, params);
        return result.rows;
    }

    // Get habit streak details
    async getHabitStreak(habitId, userId) {
        await this.getHabitById(habitId, userId); // Verify ownership

        const result = await this.pool.query(
            'SELECT * FROM habit_streaks WHERE habit_id = $1',
            [habitId]
        );

        return result.rows[0] || {
            current_streak: 0,
            longest_streak: 0,
            total_completions: 0
        };
    }

    // Get habit statistics
    async getHabitStats(userId, { period = 'month', startDate, endDate } = {}) {
        // Calculate date range based on period
        let start, end = new Date();

        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
        } else {
            const now = new Date();
            switch (period) {
                case 'week':
                    start = new Date(now.setDate(now.getDate() - 7));
                    break;
                case 'month':
                    start = new Date(now.setMonth(now.getMonth() - 1));
                    break;
                case 'quarter':
                    start = new Date(now.setMonth(now.getMonth() - 3));
                    break;
                case 'year':
                    start = new Date(now.setFullYear(now.getFullYear() - 1));
                    break;
                default:
                    start = new Date('1970-01-01');
            }
        }

        // Get habit counts
        const habitCounts = await this.pool.query(
            `SELECT 
        COUNT(*) as total_habits,
        COUNT(*) FILTER (WHERE is_archived = false) as active_habits,
        COUNT(*) FILTER (WHERE frequency = 'daily') as daily_habits,
        COUNT(*) FILTER (WHERE frequency = 'weekly') as weekly_habits
       FROM habits WHERE user_id = $1`,
            [userId]
        );

        // Get completion stats
        const completionStats = await this.pool.query(
            `SELECT COUNT(*) as total_completions
       FROM habit_logs 
       WHERE user_id = $1 AND completed_date BETWEEN $2 AND $3`,
            [userId, start.toISOString().split('T')[0], end.toISOString().split('T')[0]]
        );

        // Get best streaks
        const bestStreaks = await this.pool.query(
            `SELECT h.name, h.icon, s.current_streak, s.longest_streak
       FROM habits h
       JOIN habit_streaks s ON h.id = s.habit_id
       WHERE h.user_id = $1 AND h.is_archived = false
       ORDER BY s.current_streak DESC
       LIMIT 5`,
            [userId]
        );

        return {
            period,
            summary: {
                totalHabits: parseInt(habitCounts.rows[0].total_habits),
                activeHabits: parseInt(habitCounts.rows[0].active_habits),
                dailyHabits: parseInt(habitCounts.rows[0].daily_habits),
                weeklyHabits: parseInt(habitCounts.rows[0].weekly_habits)
            },
            completions: {
                total: parseInt(completionStats.rows[0].total_completions)
            },
            topStreaks: bestStreaks.rows
        };
    }

    // STREAK CALCULATION ALGORITHM
    async recalculateStreak(habitId, frequency, weeklyDays, customIntervalDays, client) {
        // Get all logs ordered by date DESC
        const logs = await client.query(
            'SELECT completed_date FROM habit_logs WHERE habit_id = $1 ORDER BY completed_date DESC',
            [habitId]
        );

        if (logs.rows.length === 0) {
            // No completions, reset streak
            await client.query(
                `UPDATE habit_streaks 
         SET current_streak = 0, longest_streak = 0, total_completions = 0,
             current_streak_start_date = NULL, last_completed_date = NULL
         WHERE habit_id = $1`,
                [habitId]
            );
            return;
        }

        const completions = logs.rows.map(r => r.completed_date);

        // Calculate current streak
        let currentStreak = 0;
        let currentStreakStart = null;
        let checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);

        for (const completion of completions) {
            const completionDate = new Date(completion);
            completionDate.setHours(0, 0, 0, 0);

            if (this.isExpectedDate(completionDate, checkDate, frequency, weeklyDays, customIntervalDays)) {
                currentStreak++;
                currentStreakStart = completion;
                checkDate = this.getPreviousExpectedDate(checkDate, frequency, weeklyDays, customIntervalDays);
            } else {
                break;
            }
        }

        // Calculate longest streak
        let longestStreak = 0;
        let tempStreak = 1;
        let longestStart = completions[completions.length - 1];
        let longestEnd = completions[completions.length - 1];

        for (let i = completions.length - 1; i > 0; i--) {
            const current = new Date(completions[i]);
            const next = new Date(completions[i - 1]);
            current.setHours(0, 0, 0, 0);
            next.setHours(0, 0, 0, 0);

            const expectedNext = this.getNextExpectedDate(current, frequency, weeklyDays, customIntervalDays);

            if (next.getTime() === expectedNext.getTime()) {
                tempStreak++;
            } else {
                if (tempStreak > longestStreak) {
                    longestStreak = tempStreak;
                    longestStart = completions[i];
                    longestEnd = completions[Math.max(0, i - tempStreak + 1)];
                }
                tempStreak = 1;
            }
        }

        if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
            longestEnd = completions[0];
        }

        // Update streak record
        await client.query(
            `UPDATE habit_streaks 
       SET current_streak = $1, 
           current_streak_start_date = $2,
           longest_streak = $3,
           longest_streak_start_date = $4,
           longest_streak_end_date = $5,
           last_completed_date = $6,
           total_completions = $7
       WHERE habit_id = $8`,
            [currentStreak, currentStreakStart, longestStreak, longestStart, longestEnd, completions[0], completions.length, habitId]
        );
    }

    // Helper: Check if completion date matches expected date
    isExpectedDate(completionDate, expectedDate, frequency, weeklyDays, customIntervalDays) {
        if (frequency === 'daily') {
            return completionDate.getTime() === expectedDate.getTime();
        } else if (frequency === 'weekly') {
            // Check if same week and day is in weeklyDays
            const dayOfWeek = completionDate.getDay();
            return weeklyDays && weeklyDays.includes(dayOfWeek);
        } else if (frequency === 'custom') {
            return completionDate.getTime() === expectedDate.getTime();
        }
        return false;
    }

    // Helper: Get previous expected date
    getPreviousExpectedDate(date, frequency, weeklyDays, customIntervalDays) {
        const prev = new Date(date);

        if (frequency === 'daily') {
            prev.setDate(prev.getDate() - 1);
        } else if (frequency === 'weekly') {
            prev.setDate(prev.getDate() - 1);
            while (!weeklyDays.includes(prev.getDay())) {
                prev.setDate(prev.getDate() - 1);
            }
        } else if (frequency === 'custom') {
            prev.setDate(prev.getDate() - customIntervalDays);
        }

        return prev;
    }

    // Helper: Get next expected date
    getNextExpectedDate(date, frequency, weeklyDays, customIntervalDays) {
        const next = new Date(date);

        if (frequency === 'daily') {
            next.setDate(next.getDate() + 1);
        } else if (frequency === 'weekly') {
            next.setDate(next.getDate() + 1);
            while (!weeklyDays.includes(next.getDay())) {
                next.setDate(next.getDate() + 1);
            }
        } else if (frequency === 'custom') {
            next.setDate(next.getDate() + customIntervalDays);
        }

        return next;
    }
}

module.exports = HabitService;
