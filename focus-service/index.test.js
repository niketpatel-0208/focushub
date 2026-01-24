const { app, pool, redis } = require('./index');
const shared = require('../shared');
const { jwt } = shared;

describe('Focus Service - Complete Test Suite', () => {
    let testToken;
    let testUserId = '123e4567-e89b-12d3-a456-426614174000'; // Mock user ID
    let testSessionId;

    // Setup: Create test token
    beforeAll(() => {
        // Create a valid JWT token for testing
        testToken = jwt.generateAccessToken(
            { userId: testUserId, email: 'test@test.com', username: 'testuser' },
            process.env.JWT_SECRET
        );
    });

    // Clean up after all tests
    afterAll(async () => {
        // Clean up test data
        await pool.query('DELETE FROM focus_sessions WHERE user_id = $1', [testUserId]);

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
            expect(body).toHaveProperty('status', 'healthy');
            expect(body).toHaveProperty('service', 'focus-service');
            expect(body).toHaveProperty('database');
        });

        test('GET / should return service info', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/'
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body).toHaveProperty('message');
            expect(body.message).toContain('Focus Session');
        });
    });

    describe('Focus Session CRUD', () => {
        test('POST /sessions should create new session', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/sessions',
                headers: {
                    authorization: `Bearer ${testToken}`
                },
                payload: {
                    plannedDuration: 1500,
                    breakDuration: 300,
                    sessionType: 'work'
                }
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data).toHaveProperty('id');
            expect(body.data.status).toBe('active');
            expect(body.data.planned_duration).toBe(1500);

            testSessionId = body.data.id;
        });

        test('POST /sessions should prevent multiple active sessions', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/sessions',
                headers: {
                    authorization: `Bearer ${testToken}`
                },
                payload: {
                    plannedDuration: 1500
                }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(false);
            expect(body.message).toContain('already have an active session');
        });

        test('GET /sessions should list sessions', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/sessions',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(Array.isArray(body.data)).toBe(true);
            expect(body.data.length).toBeGreaterThan(0);
        });

        test('GET /sessions/:id should return session details', async () => {
            if (!testSessionId) return;

            const response = await app.inject({
                method: 'GET',
                url: `/sessions/${testSessionId}`,
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.id).toBe(testSessionId);
        });

        test('GET /sessions/active should return active session', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/sessions/active',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.status).toMatch(/active|paused/);
        });
    });

    describe('Session Timer Operations', () => {
        test('PATCH /sessions/:id/pause should pause active session', async () => {
            if (!testSessionId) return;

            const response = await app.inject({
                method: 'PATCH',
                url: `/sessions/${testSessionId}/pause`,
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.status).toBe('paused');
            expect(body.data.interruptions).toBeGreaterThan(0);
        });

        test('PATCH /sessions/:id/pause should fail on already paused session', async () => {
            if (!testSessionId) return;

            const response = await app.inject({
                method: 'PATCH',
                url: `/sessions/${testSessionId}/pause`,
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(false);
            expect(body.message).toContain('only pause an active session');
        });

        test('PATCH /sessions/:id/resume should resume paused session', async () => {
            if (!testSessionId) return;

            const response = await app.inject({
                method: 'PATCH',
                url: `/sessions/${testSessionId}/resume`,
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.status).toBe('active');
            expect(body.data.pause_duration).toBeGreaterThanOrEqual(0);
        });

        test('PATCH /sessions/:id/complete should complete session', async () => {
            if (!testSessionId) return;

            const response = await app.inject({
                method: 'PATCH',
                url: `/sessions/${testSessionId}/complete`,
                headers: {
                    authorization: `Bearer ${testToken}`
                },
                payload: {
                    notes: 'Great focus session!'
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.status).toBe('completed');
            expect(body.data.completed_at).toBeTruthy();
            expect(body.data.notes).toBe('Great focus session!');
        });

        test('PATCH /sessions/:id/complete should fail on already completed session', async () => {
            if (!testSessionId) return;

            const response = await app.inject({
                method: 'PATCH',
                url: `/sessions/${testSessionId}/complete`,
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(false);
        });
    });

    describe('Session Cancellation', () => {
        let cancelSessionId;

        test('should create session for cancellation test', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/sessions',
                headers: {
                    authorization: `Bearer ${testToken}`
                },
                payload: {
                    plannedDuration: 1500
                }
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            cancelSessionId = body.data.id;
        });

        test('DELETE /sessions/:id should cancel session', async () => {
            if (!cancelSessionId) return;

            const response = await app.inject({
                method: 'DELETE',
                url: `/sessions/${cancelSessionId}`,
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.status).toBe('cancelled');
            expect(body.data.cancelled_at).toBeTruthy();
        });
    });

    describe('Filtering and Pagination', () => {
        test('GET /sessions?status=completed should filter by status', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/sessions?status=completed',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(Array.isArray(body.data)).toBe(true);
        });

        test('GET /sessions?page=1&limit=10 should paginate', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/sessions?page=1&limit=10',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.meta).toHaveProperty('pagination');
            expect(body.meta.pagination.page).toBe(1);
            expect(body.meta.pagination.limit).toBe(10);
        });
    });

    describe('Statistics', () => {
        test('GET /stats should return focus statistics', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/stats',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data).toHaveProperty('summary');
            expect(body.data).toHaveProperty('timeTracking');
            expect(body.data).toHaveProperty('productivity');
            expect(body.data.summary).toHaveProperty('totalSessions');
            expect(body.data.summary).toHaveProperty('completedSessions');
        });

        test('GET /stats?period=day should filter by period', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/stats?period=day',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.period).toBe('day');
        });
    });

    describe('Authentication Requirements', () => {
        test('should reject requests without auth token', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/sessions'
            });

            expect(response.statusCode).toBe(401);
        });

        test('should reject requests with invalid token', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/sessions',
                headers: {
                    authorization: 'Bearer invalid-token'
                }
            });

            expect(response.statusCode).toBe(401);
        });
    });

    describe('Edge Cases', () => {
        test('GET /sessions/:id should return 404 for non-existent session', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/sessions/550e8400-e29b-41d4-a716-446655440000',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(404);
        });

        test('GET /sessions/active should return 404 when no active session', async () => {
            // First, ensure no active session exists by cleaning up
            await pool.query(
                `UPDATE focus_sessions 
                 SET status = 'completed', completed_at = NOW()
                 WHERE user_id = $1 AND status IN ('active', 'paused')`,
                [testUserId]
            );

            const response = await app.inject({
                method: 'GET',
                url: '/sessions/active',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.body);
            expect(body.message).toContain('No active session found');
        });
    });
});
