const { app, pool } = require('./index');
const shared = require('../shared');
const { jwt } = shared;

describe('Task Service - Complete Test Suite', () => {
    let testToken;
    let testUserId = '123e4567-e89b-12d3-a456-426614174000'; // Mock user ID
    let testProjectId;
    let testTaskId;
    let testTagId;

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
        if (testTaskId) {
            await pool.query('DELETE FROM tasks WHERE id = $1', [testTaskId]);
        }
        if (testProjectId) {
            await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId]);
        }
        if (testTagId) {
            await pool.query('DELETE FROM tags WHERE id = $1', [testTagId]);
        }

        await app.close();
        await pool.end();
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
            expect(body).toHaveProperty('service', 'task-service');
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
            expect(body.message).toContain('Task Management');
        });
    });

    describe('Projects API', () => {
        test('POST /projects should create new project', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/projects',
                headers: {
                    authorization: `Bearer ${testToken}`
                },
                payload: {
                    name: 'Test Project',
                    description: 'Test Description',
                    color: '#3B82F6'
                }
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data).toHaveProperty('id');
            expect(body.data.name).toBe('Test Project');

            testProjectId = body.data.id;
        });

        test('GET /projects should list projects', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/projects',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(Array.isArray(body.data)).toBe(true);
        });

        test('GET /projects/:id should return project details', async () => {
            if (!testProjectId) return;

            const response = await app.inject({
                method: 'GET',
                url: `/projects/${testProjectId}`,
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.id).toBe(testProjectId);
        });

        test('PUT /projects/:id should update project', async () => {
            if (!testProjectId) return;

            const response = await app.inject({
                method: 'PUT',
                url: `/projects/${testProjectId}`,
                headers: {
                    authorization: `Bearer ${testToken}`
                },
                payload: {
                    name: 'Updated Project'
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.name).toBe('Updated Project');
        });

        test('POST /projects/:id/archive should archive project', async () => {
            if (!testProjectId) return;

            const response = await app.inject({
                method: 'POST',
                url: `/projects/${testProjectId}/archive`,
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.is_archived).toBe(true);
        });
    });

    describe('Tags API', () => {
        test('POST /tags should create new tag', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/tags',
                headers: {
                    authorization: `Bearer ${testToken}`
                },
                payload: {
                    name: 'urgent',
                    color: '#EF4444'
                }
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.name).toBe('urgent');

            testTagId = body.data.id;
        });

        test('GET /tags should list tags', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/tags',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(Array.isArray(body.data)).toBe(true);
        });

        test('POST /tags should reject duplicate tag name', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/tags',
                headers: {
                    authorization: `Bearer ${testToken}`
                },
                payload: {
                    name: 'urgent', // Duplicate
                    color: '#000000'
                }
            });

            expect(response.statusCode).toBe(400);
        });
    });

    describe('Tasks API', () => {
        test('POST /tasks should create new task', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/tasks',
                headers: {
                    authorization: `Bearer ${testToken}`
                },
                payload: {
                    title: 'Test Task',
                    description: 'Test Description',
                    status: 'todo',
                    priority: 'high'
                }
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.title).toBe('Test Task');

            testTaskId = body.data.id;
        });

        test('GET /tasks should list tasks', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/tasks',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(Array.isArray(body.data)).toBe(true);
        });

        test('GET /tasks?status=todo should filter by status', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/tasks?status=todo',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
        });

        test('GET /tasks?priority=high should filter by priority', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/tasks?priority=high',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
        });

        test('GET /tasks?search=Test should search tasks', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/tasks?search=Test',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
        });

        test('GET /tasks?page=1&limit=10 should paginate', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/tasks?page=1&limit=10',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body).toHaveProperty('pagination');
        });

        test('GET /tasks/:id should return task details', async () => {
            if (!testTaskId) return;

            const response = await app.inject({
                method: 'GET',
                url: `/tasks/${testTaskId}`,
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.data.id).toBe(testTaskId);
        });

        test('PUT /tasks/:id should update task', async () => {
            if (!testTaskId) return;

            const response = await app.inject({
                method: 'PUT',
                url: `/tasks/${testTaskId}`,
                headers: {
                    authorization: `Bearer ${testToken}`
                },
                payload: {
                    title: 'Updated Task',
                    priority: 'medium'
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.data.title).toBe('Updated Task');
        });

        test('POST /tasks/:id/complete should mark task complete', async () => {
            if (!testTaskId) return;

            const response = await app.inject({
                method: 'POST',
                url: `/tasks/${testTaskId}/complete`,
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.data.status).toBe('completed');
            expect(body.data.completed_at).toBeTruthy();
        });

        test('POST /tasks/:id/tags should add tag to task', async () => {
            if (!testTaskId || !testTagId) return;

            const response = await app.inject({
                method: 'POST',
                url: `/tasks/${testTaskId}/tags`,
                headers: {
                    authorization: `Bearer ${testToken}`
                },
                payload: {
                    tagId: testTagId
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.data.tags).toBeDefined();
        });

        test('GET /tasks/stats should return statistics', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/tasks/stats',
                headers: {
                    authorization: `Bearer ${testToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.data).toHaveProperty('total');
            expect(body.data).toHaveProperty('completed');
            expect(body.data).toHaveProperty('overdue');
        });
    });

    describe('Authentication Requirements', () => {
        test('should reject requests without auth token', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/projects'
            });

            expect(response.statusCode).toBe(401);
        });

        test('should reject requests with invalid token', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/projects',
                headers: {
                    authorization: 'Bearer invalid-token'
                }
            });

            expect(response.statusCode).toBe(401);
        });
    });
});
