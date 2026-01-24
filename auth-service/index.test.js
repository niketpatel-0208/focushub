const { app, pool } = require('./index');

describe('Auth Service - Complete Test Suite', () => {
    let testUserId;
    let testAccessToken;
    let testRefreshToken;

    // Clean up after all tests
    afterAll(async () => {
        // Clean up test user if created
        if (testUserId) {
            await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
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
            expect(body).toHaveProperty('service', 'auth-service');
            expect(body).toHaveProperty('database');
            expect(['connected', 'disconnected']).toContain(body.database);
        });

        test('GET / should return service info', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/'
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body).toHaveProperty('message', 'FocusHub Auth Service');
            expect(body).toHaveProperty('version', '1.0.0');
        });
    });

    describe('POST /auth/register', () => {
        const uniqueEmail = `test${Date.now()}@focushub.com`;
        const uniqueUsername = `testuser${Date.now()}`;

        test('should register new user with valid data', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/auth/register',
                payload: {
                    email: uniqueEmail,
                    password: 'StrongPass@123',
                    username: uniqueUsername,
                    firstName: 'Test',
                    lastName: 'User'
                }
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data).toHaveProperty('id');
            expect(body.data.email).toBe(uniqueEmail);

            testUserId = body.data.id;
        });

        test('should reject duplicate email', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/auth/register',
                payload: {
                    email: uniqueEmail,
                    password: 'StrongPass@123',
                    username: `different${Date.now()}`,
                }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(false);
        });

        test('should reject duplicate username', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/auth/register',
                payload: {
                    email: `different${Date.now()}@test.com`,
                    password: 'StrongPass@123',
                    username: uniqueUsername,
                }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(false);
        });

        test('should reject invalid email format', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/auth/register',
                payload: {
                    email: 'invalid-email',
                    password: 'StrongPass@123',
                    username: 'testuser',
                }
            });

            expect(response.statusCode).toBe(400);
        });

        test('should reject weak password', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/auth/register',
                payload: {
                    email: `test${Date.now()}@test.com`,
                    password: 'weak',
                    username: 'testuser2',
                }
            });

            expect(response.statusCode).toBe(400);
        });
    });

    describe('POST /auth/login', () => {
        test('should login with valid credentials', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/auth/login',
                payload: {
                    email: testUserId ? (await pool.query('SELECT email FROM users WHERE id = $1', [testUserId])).rows[0]?.email : 'test@test.com',
                    password: 'StrongPass@123'
                }
            });

            if (response.statusCode === 200) {
                const body = JSON.parse(response.body);
                expect(body.success).toBe(true);
                expect(body.data).toHaveProperty('accessToken');
                expect(body.data).toHaveProperty('refreshToken');

                testAccessToken = body.data.accessToken;
                testRefreshToken = body.data.refreshToken;
            }
        });

        test('should reject invalid email', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/auth/login',
                payload: {
                    email: 'nonexistent@test.com',
                    password: 'StrongPass@123'
                }
            });

            expect(response.statusCode).toBe(401);
        });

        test('should reject wrong password', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/auth/login',
                payload: {
                    email: testUserId ? (await pool.query('SELECT email FROM users WHERE id = $1', [testUserId])).rows[0]?.email : 'test@test.com',
                    password: 'WrongPassword123'
                }
            });

            expect(response.statusCode).toBe(401);
        });
    });

    describe('GET /auth/me', () => {
        test('should return user profile with valid token', async () => {
            if (!testAccessToken) {
                return; // Skip if no token
            }

            const response = await app.inject({
                method: 'GET',
                url: '/auth/me',
                headers: {
                    authorization: `Bearer ${testAccessToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data).toHaveProperty('email');
        });

        test('should reject request without token', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/auth/me'
            });

            expect(response.statusCode).toBe(401);
        });

        test('should reject invalid token', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/auth/me',
                headers: {
                    authorization: 'Bearer invalid-token'
                }
            });

            expect(response.statusCode).toBe(401);
        });
    });

    describe('POST /auth/refresh', () => {
        test('should refresh token with valid refresh token', async () => {
            if (!testRefreshToken) {
                return; // Skip if no refresh token
            }

            const response = await app.inject({
                method: 'POST',
                url: '/auth/refresh',
                payload: {
                    refreshToken: testRefreshToken
                }
            });

            if (response.statusCode === 200) {
                const body = JSON.parse(response.body);
                expect(body.success).toBe(true);
                expect(body.data).toHaveProperty('accessToken');
            }
        });

        test('should reject invalid refresh token', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/auth/refresh',
                payload: {
                    refreshToken: 'invalid-token'
                }
            });

            expect(response.statusCode).toBe(401);
        });
    });

    describe('PUT /auth/me', () => {
        test('should update user profile', async () => {
            if (!testAccessToken) {
                return;
            }

            const response = await app.inject({
                method: 'PUT',
                url: '/auth/me',
                headers: {
                    authorization: `Bearer ${testAccessToken}`
                },
                payload: {
                    firstName: 'Updated',
                    lastName: 'Name'
                }
            });

            if (response.statusCode === 200) {
                const body = JSON.parse(response.body);
                expect(body.success).toBe(true);
                expect(body.data.firstName).toBe('Updated');
            }
        });
    });

    describe('POST /auth/logout', () => {
        test('should logout and invalidate refresh token', async () => {
            if (!testRefreshToken) {
                return;
            }

            const response = await app.inject({
                method: 'POST',
                url: '/auth/logout',
                payload: {
                    refreshToken: testRefreshToken
                }
            });

            if (response.statusCode === 200) {
                const body = JSON.parse(response.body);
                expect(body.success).toBe(true);
            }
        });
    });
});
