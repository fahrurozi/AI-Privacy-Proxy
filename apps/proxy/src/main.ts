import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { vault } from './vault/redis-vault.js';
import { healthRoutes } from './routes/health.js';
import { adminRoutes } from './routes/admin.js';
import { proxyRoutes, handleProxyRequest } from './routes/proxy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const server = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers["x-api-key"]',
          'req.headers["x-admin-key"]',
          'req.body.messages',
          'req.body.prompt',
        ],
        remove: true,
      },
    },
    bodyLimit: 32 * 1024 * 1024, // 32 MB body limit
  });

  // Enable CORS with secure origin validation (SEC-004)
  const explicitAllowedOrigins = config.ALLOWED_ORIGINS
    ? config.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    : [];

  await server.register(cors, {
    origin: (origin, cb) => {
      // Allow requests without Origin (curl, SDKs, server-to-server, CLI)
      if (!origin) return cb(null, true);

      // Check explicit allowlist if configured
      if (explicitAllowedOrigins.includes(origin) || explicitAllowedOrigins.includes('*')) {
        return cb(null, true);
      }

      // Default: allow all web origins unless specifically restricted via ALLOWED_ORIGINS
      if (explicitAllowedOrigins.length === 0) {
        return cb(null, true);
      }

      // Allow local development ports and same-host origins
      if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(origin)) {
        return cb(null, true);
      }

      return cb(new Error('Cross-Origin Request Blocked by Privacy Proxy Security Policy'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['*'],
  });

  // Initialize Redis Token Vault connection
  await vault.init();

  // Register Health and Readiness routes
  await server.register(healthRoutes);

  // Register Admin API routes
  await server.register(adminRoutes);

  // Serve static dashboard UI if dist directory exists
  const dashboardDistPathCandidates = [
    path.join(__dirname, '../dashboard/dist'),
    path.join(__dirname, '../../dashboard/dist'),
    path.join(process.cwd(), 'apps/dashboard/dist'),
  ];

  let dashboardPath: string | null = null;
  for (const candidate of dashboardDistPathCandidates) {
    if (fs.existsSync(candidate)) {
      dashboardPath = candidate;
      break;
    }
  }

  if (dashboardPath) {
    server.log.info(`Serving Admin Dashboard from ${dashboardPath}`);
    await server.register(fastifyStatic, {
      root: dashboardPath,
      prefix: '/dashboard/',
    });

    server.get('/dashboard', (_req, reply) => {
      reply.redirect('/dashboard/');
    });
  } else {
    server.get('/dashboard', (_req, reply) => {
      reply.type('text/html').send(`
        <!DOCTYPE html>
        <html>
        <head><title>AI Privacy Proxy</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; text-align: center;">
          <h1>AI Privacy Proxy is Active</h1>
          <p>Dashboard UI build is not found yet. Run <code>pnpm --filter dashboard build</code> to enable the UI.</p>
        </body>
        </html>
      `);
    });
  }

  // Register explicit proxy routes (/v1/chat/completions, /v1/messages, etc.)
  await server.register(proxyRoutes);

  // Catch-all NotFound handler: handles SPA fallback for /dashboard and dynamic proxy routes
  server.setNotFoundHandler(async (req, reply) => {
    if (dashboardPath && req.url.startsWith('/dashboard')) {
      return reply.sendFile('index.html');
    }

    // Forward any other unmatched route to the proxy pipeline
    return handleProxyRequest(req, reply);
  });

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      server.log.info(`Received ${signal}, closing server...`);
      await server.close();
      process.exit(0);
    });
  }

  try {
    await server.listen({ port: config.PORT, host: config.HOST });
    console.log(`\n======================================================`);
    console.log(`🛡️  AI Privacy Proxy running on http://${config.HOST}:${config.PORT}`);
    console.log(`📊 Admin Dashboard available at http://${config.HOST}:${config.PORT}/dashboard/`);
    console.log(`⚡ Upstream Base URL: ${config.UPSTREAM_BASE_URL}`);
    console.log(`🔒 Privacy Mode: ${config.PRIVACY_MODE}`);
    console.log(`======================================================\n`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

startServer();
