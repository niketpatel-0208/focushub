const { app, pool, redis } = require('./index');
const shared = require('../shared');

describe('Habit Service - Complete Test Suite', () => {
    let testToken;
    let testUserId = '123e4567-e89b-12d3-a456-426614174000';
    let testHabitId;
    let testDailyHabitId;

    beforeAll(() => {
        testToken = shared.jwt.generateAccessToken(
            { userId: testUserId, email: 'test@test.com', username: 'testuser' },
            process.env.JWT_SECRET
        );
    });

    afterAll(async () => {
        await pool.query('DELETE FROM habit_logs WHERE user_id = $1', [testUserId]);
        await pool.query('DELETE FROM habit_streaks WHERE user_id = $1', [testUserId]);
        await pool.query('DELETE FROM habits WHERE user_id = $1', [testUserId]);
        await app.close();
        await pool.end();
        await redis.quit();
    });

    describe('Health & Info Endpoints', () => {
        test('GET /health should return healthy status', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/health'
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.status).toBe('healthy');
        });

        test('GET / should return service info', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/'
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.message).toContain('Habit');
        });
    });

    describe('Habit CRUD', () => {
        test('POST /habits should create daily habit', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/habits',
                headers: { authorization: `Bearer ${testToken}` },
                payload: {
                    name: 'Morning meditation',
                    frequency: 'daily',
                    targetValue: 1
                }
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.name).toBe('Morning meditation');
            expect(body.data.frequency).toBe('daily');
            testHabitId = body.data.id;
            testDailyHabitId = body.data.id;
        });

        test('POST /habits should create weekly habit with days', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/habits',
                headers: { authorization: `Bearer ${testToken}` },
                payload: {
                    name: 'Gym workout',
                    frequency: 'weekly',
                    weeklyDays: [1, 3, 5], // Mon, Wed, Fri
                    targetValue: 1
                }
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            expect(body.data.frequency).toBe('weekly');
            expect(body.data.weekly_days).toEqual([1, 3, 5]);
        });

        test('POST /habits should create custom interval habit', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/habits',
                headers: { authorization: `Bearer ${testToken}` },
                payload: {
                    name: 'Deep clean house',
                    frequency: 'custom',
                    customIntervalDays: 7
                }
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            expect(body.data.custom_interval_days).toBe(7);
        });

        test('POST /habits should reject weekly habit without days', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/habits',
                headers: { authorization: `Bearer ${testToken}` },
                payload: {
                    name: 'Invalid weekly',
                    frequency: 'weekly'
                }
            });

            expect(response.statusCode).toBe(400);
        });

        test('GET /habits should list habits with filters', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/habits?frequency=daily',
                headers: { authorization: `Bearer ${testToken}` }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(Array.isArray(body.data)).toBe(true);
        });

        test('GET /habits/:id should return habit details with streak', async () => {
            if (!testHabitId) return;

            const response = await app.inject({
                method: 'GET',
                url: `/habits/${testHabitId}`,
                headers: { authorization: `Bearer ${testToken}` }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.data.id).toBe(testHabitId);
            expect(body.data).toHaveProperty('current_streak');
        });

        test('PUT /habits/:id should update habit', async () => {
            if (!testHabitId) return;

            const response = await app.inject({
                method: 'PUT',
                url: `/habits/${testHabitId}`,
                headers: { authorization: `Bearer ${testToken}` },
                payload: {
                    name: 'Updated meditation',
                    targetValue: 2
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.data.name).toBe('Updated meditation');
        });

        test('DELETE /habits/:id should delete habit', async () => {
            const createResponse = await app.inject({
                method: 'POST',
                url: '/habits',
                headers: { authorization: `Bearer ${testToken}` },
                payload: { name: 'To delete' }
            });
            const habitId = JSON.parse(createResponse.body).data.id;

            const response = await app.inject({
                method: 'DELETE',
                url: `/habits/${habitId}`,
                headers: { authorization: `Bearer ${testToken}` }
            });

            expect(response.statusCode).toBe(200);
        });
    });

    describe('Archiving', () => {
        test('PATCH /habits/:id/archive should archive habit', async () => {
            if (!testHabitId) return;

            const response = await app.inject({
                method: 'PATCH',
                url: `/habits/${testHabitId}/archive`,
                headers: { authorization: `Bearer ${testToken}` }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.data.is_archived).toBe(true);
        });

        test('GET /habits?archived=true should show archived habits', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/habits?archived=true',
                headers: { authorization: `Bearer ${testToken}` }
            });

            expect(response.statusCode).toBe(200);
        });
    });

    describe('Completion Logging', () => {
        beforeAll(async () => {
            // Unarchive the test habit
            if (testDailyHabitId) {
                await pool.query(
                    'UPDATE habits SET is_archived = false WHERE id = $1',
                    [testDailyHabitId]
                );
            }
        });

        test('POST /habits/:id/complete should log today completion', async () => {
            if (!testDailyHabitId) return;

            const response = await app.inject({
                method: 'POST',
                url: `/habits/${testDailyHabitId}/complete`,
                headers: { authorization: `Bearer ${testToken}` },
                payload: { value: 1 }
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
        });

        test('POST /habits/:id/complete with date should log specific day', async () => {
            if (!testDailyHabitId) return;

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const dateStr = yesterday.toISOString().split('T')[0];

            const response = await app.inject({
                method: 'POST',
                url: `/habits/${testDailyHabitId}/complete`,
                headers: { authorization: `Bearer ${testToken}` },
                payload: { date: dateStr, value: 1 }
            });

            expect(response.statusCode).toBe(201);
        });

        test('POST /habits/:id/complete should update existing log (upsert)', async () => {
            if (!testDailyHabitId) return;

            const response = await app.inject({
                method: 'POST',
                url: `/habits/${testDailyHabitId}/complete`,
                headers: { authorization: `Bearer ${testToken}` },
                payload: { value: 2, notes: 'Updated' }
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            expect(body.data.completed_value).toBe(2);
        });

        test('POST /habits/:id/complete should start streak (day 1)', async () => {
            // Create new habit for streak test
            const createResp = await app.inject({
                method: 'POST',
                url: '/habits',
                headers: { authorization: `Bearer ${testToken}` },
                payload: { name: 'Streak test' }
            });
            const habitId = JSON.parse(createResp.body).data.id;

            const response = await app.inject({
                method: 'POST',
                url: `/habits/${habitId}/complete`,
                headers: { authorization: `Bearer ${testToken}` }
            });

            expect(response.statusCode).toBe(201);

            // Check streak
            const streakResp = await app.inject({
                method: 'GET',
                url: `/habits/${habitId}/streak`,
                headers: { authorization: `Bearer ${testToken}` }
            });
            const streak = JSON.parse(streakResp.body).data;
            expect(streak.current_streak).toBeGreaterThanOrEqual(0);
        });

        test('POST /habits/:id/complete should reject future dates', async () => {
            if (!testDailyHabitId) return;

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateStr = tomorrow.toISOString().split('T')[0];

            const response = await app.inject({
                method: 'POST',
                url: `/habits/${testDailyHabitId}/complete`,
                headers: { authorization: `Bearer ${testToken}` },
                payload: { date: dateStr }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.message).toContain('future');
        });

        test('DELETE /habits/:id/logs/:date should remove completion', async () => {
            if (!testDailyHabitId) return;

            const today = new Date().toISOString().split('T')[0];

            const response = await app.inject({
                method: 'DELETE',
                url: `/habits/${testDailyHabitId}/logs/${today}`,
                headers: { authorization: `Bearer ${testToken}` }
            });

            expect(response.statusCode).toBe(200);
        });

        test('GET /habits/:id/logs should return completion history', async () => {
            if (!testDailyHabitId) return;

            const response = await app.inject({
                method: 'GET',
                url: `/habits/${testDailyHabitId}/logs`,
                headers: { authorization: `Bearer ${testToken}` }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(Array.isArray(body.data)).toBe(true);
        });

        test('GET /habits/:id/logs with date range should filter', async () => {
            if (!testDailyHabitId) return;

            const end = new Date().toISOString().split('T')[0];
            const start = new Date();
            start.setDate(start.getDate() - 7);
            const startStr = start.toISOString().split('T')[0];

            const response = await app.inject({
                method: 'GET',
                url: `/habits/${testDailyHabitId}/logs?startDate=${startStr}&endDate=${end}`,
                headers: { authorization: `Bearer ${testToken}` }
            });

            expect(response.statusCode).toBe(200);
        });
    });

    describe('Statistics', () => {
        test('GET /stats should return habit statistics', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/stats',
                headers: { authorization: `Bearer ${testToken}` }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.data).toHaveProperty('summary');
            expect(body.data).toHaveProperty('completions');
        });

        test('GET /stats?period=week should filter by period', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/stats?period=week',
                headers: { authorization: `Bearer ${testToken}` }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.data.period).toBe('week');
        });
    });

    describe('Authentication', () => {
        test('should reject requests without token', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/habits'
            });

            expect(response.statusCode).toBe(401);
        });

        test('should reject requests with invalid token', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/habits',
                headers: { authorization: 'Bearer invalid-token' }
            });

            expect(response.statusCode).toBe(401);
        });
    });

    describe('Edge Cases', () => {
        test('GET /habits/:id should return 404 for non-existent', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/habits/00000000-0000-0000-0000-000000000000',
                headers: { authorization: `Bearer ${testToken}` }
            });

            expect(response.statusCode).toBe(404);
        });

        test('POST /habits should reject negative target value', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/habits',
                headers: { authorization: `Bearer ${testToken}` },
                payload: {
                    name: 'Invalid',
                    targetValue: -1
                }
            });

            expect(response.statusCode).toBe(400);
        });

        test('GET /habits should handle empty habit list', async () => {
            const newUserId = '00000000-0000-0000-0000-000000000001';
            const newToken = shared.jwt.generateAccessToken(
                { userId: newUserId, email: 'new@test.com', username: 'newuser' },
                process.env.JWT_SECRET
            );

            const response = await app.inject({
                method: 'GET',
                url: '/habits',
                headers: { authorization: `Bearer ${newToken}` }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.data).toEqual([]);
        });
    });
});
