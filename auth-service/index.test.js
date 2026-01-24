const { app, pool } = require('./index');

describe('Auth Service API Tests', () => {
    // Clean up after all tests
    afterAll(async () => {
        await app.close();
        await pool.end();
    });

    describe('GET /health', () => {
        it('should return health status with service information', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/health'
            });

            expect(response.statusCode).toBe(200);
            expect(response.headers['content-type']).toMatch(/json/);

            const body = JSON.parse(response.body);
            expect(body).toHaveProperty('status', 'healthy');
            expect(body).toHaveProperty('service', 'auth-service');
            expect(body).toHaveProperty('database');
            expect(body).toHaveProperty('timestamp');
            expect(['connected', 'disconnected']).toContain(body.database);
        });
    });

    describe('GET /', () => {
        it('should return service name and version', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/'
            });

            expect(response.statusCode).toBe(200);
            expect(response.headers['content-type']).toMatch(/json/);

            const body = JSON.parse(response.body);
            expect(body).toHaveProperty('message', 'FocusHub Auth Service');
            expect(body).toHaveProperty('version', '1.0.0');
        });
    });
});
