import { FastifyInstance } from 'fastify';
import { vault } from '../vault/redis-vault.js';
import { checkPresidioHealth } from '../presidio/client.js';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (_req, reply) => {
    return reply.status(200).send({ status: 'ok', uptime: process.uptime() });
  });

  fastify.get('/ready', async (_req, reply) => {
    const [redisOk, presidioOk] = await Promise.all([
      vault.ping(),
      checkPresidioHealth(),
    ]);

    const isReady = redisOk && presidioOk;
    return reply.status(isReady ? 200 : 503).send({
      status: isReady ? 'ready' : 'degraded',
      components: {
        redis: redisOk ? 'up' : 'down',
        presidio: presidioOk ? 'up' : 'down',
      },
    });
  });
}
