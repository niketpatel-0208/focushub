require('dotenv').config({ path: '../.env' });
const fastify = require('fastify')({ logger: true });

const PORT = process.env.GATEWAY_PORT || 3000;
const HOST = process.env.GATEWAY_HOST || '0.0.0.0';

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'healthy', 
    service: 'gateway',
    timestamp: new Date().toISOString()
  };
});

// Root endpoint
fastify.get('/', async (request, reply) => {
  return { 
    message: 'FocusHub API Gateway',
    version: '1.0.0'
  };
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`Gateway running on http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
