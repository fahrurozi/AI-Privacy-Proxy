import { Redis } from 'ioredis';
import { createHash } from 'crypto';
import { ActiveSession } from '@ai-privacy-proxy/shared';
import { config } from '../config/index.js';

export interface TokenVault {
  getOrCreate(sessionId: string, entityType: string, value: string): Promise<string>;
  restore(sessionId: string, token: string): Promise<string | null>;
  listSessions(): Promise<ActiveSession[]>;
  deleteSession(sessionId: string): Promise<boolean>;
  ping(): Promise<boolean>;
}

export function hashNormalized(entityType: string, value: string): string {
  const norm = `${entityType.toUpperCase()}:${value.trim().toLowerCase()}`;
  return createHash('sha256').update(norm).digest('hex').slice(0, 16);
}

export function generateSessionPrefix(sessionId: string): string {
  return createHash('md5').update(sessionId).digest('hex').slice(0, 4);
}

export class RedisTokenVault implements TokenVault {
  private redis: Redis | null = null;
  private memoryStore: Map<string, { value: string; expiresAt: number }> = new Map();
  private memoryLookup: Map<string, { token: string; expiresAt: number }> = new Map();
  private memoryCounters: Map<string, number> = new Map();
  private memorySessions: Map<string, { createdAt: number; expiresAt: number; count: number }> = new Map();
  public isConnected = false;

  constructor(redisUrl?: string) {
    const url = redisUrl || config.REDIS_URL;
    try {
      this.redis = new Redis(url, {
        lazyConnect: true,
        connectTimeout: 2000,
        maxRetriesPerRequest: 2,
        retryStrategy(times) {
          if (times > 3) return null;
          return Math.min(times * 100, 1000);
        },
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
      });

      this.redis.on('error', () => {
        this.isConnected = false;
      });
    } catch {
      this.isConnected = false;
    }
  }

  async init() {
    if (this.redis) {
      try {
        await this.redis.connect();
        this.isConnected = true;
      } catch {
        this.isConnected = false;
      }
    }
  }

  async ping(): Promise<boolean> {
    if (this.redis && this.isConnected) {
      try {
        const res = await this.redis.ping();
        return res === 'PONG';
      } catch {
        return false;
      }
    }
    return true; // memory fallback is alive
  }

  async getOrCreate(sessionId: string, entityType: string, value: string): Promise<string> {
    const ttl = config.VAULT_TTL_SECONDS;
    const prefix = generateSessionPrefix(sessionId);
    const hash = hashNormalized(entityType, value);
    const lookupKey = `privacy:v1:session:${sessionId}:lookup:${hash}`;

    if (this.redis && this.isConnected) {
      try {
        const existingToken = await this.redis.get(lookupKey);
        if (existingToken) {
          return existingToken;
        }

        const counter = await this.redis.incr(`privacy:v1:session:${sessionId}:counter:${entityType}`);
        const token = `[${prefix}:${entityType}_${String(counter).padStart(3, '0')}]`;
        const tokenKey = `privacy:v1:session:${sessionId}:token:${token}`;
        const sessionMetaKey = `privacy:v1:sessions:meta:${sessionId}`;

        await this.redis
          .multi()
          .set(tokenKey, value, 'EX', ttl)
          .set(lookupKey, token, 'EX', ttl)
          .incr(`privacy:v1:session:${sessionId}:total_tokens`)
          .set(sessionMetaKey, JSON.stringify({ createdAt: Date.now() }), 'EX', ttl)
          .sadd('privacy:v1:active_sessions', sessionId)
          .exec();

        return token;
      } catch (err) {
        // Fall back to memory store on redis failure
      }
    }

    // In-memory fallback
    const now = Date.now();
    const exp = now + ttl * 1000;
    const memLookup = this.memoryLookup.get(lookupKey);
    if (memLookup && memLookup.expiresAt > now) {
      return memLookup.token;
    }

    const counterKey = `${sessionId}:${entityType}`;
    const counter = (this.memoryCounters.get(counterKey) || 0) + 1;
    this.memoryCounters.set(counterKey, counter);

    const token = `[${prefix}:${entityType}_${String(counter).padStart(3, '0')}]`;
    const tokenKey = `privacy:v1:session:${sessionId}:token:${token}`;

    this.memoryStore.set(tokenKey, { value, expiresAt: exp });
    this.memoryLookup.set(lookupKey, { token, expiresAt: exp });

    const sessionData = this.memorySessions.get(sessionId) || { createdAt: now, expiresAt: exp, count: 0 };
    sessionData.count += 1;
    sessionData.expiresAt = exp;
    this.memorySessions.set(sessionId, sessionData);

    return token;
  }

  async restore(sessionId: string, token: string): Promise<string | null> {
    const tokenKey = `privacy:v1:session:${sessionId}:token:${token}`;

    if (this.redis && this.isConnected) {
      try {
        const val = await this.redis.get(tokenKey);
        if (val !== null) return val;
      } catch {
        // Fall back to memory store
      }
    }

    const now = Date.now();
    const entry = this.memoryStore.get(tokenKey);
    if (entry && entry.expiresAt > now) {
      return entry.value;
    }
    return null;
  }

  async listSessions(): Promise<ActiveSession[]> {
    const sessions: ActiveSession[] = [];
    const now = Date.now();

    if (this.redis && this.isConnected) {
      try {
        const sessionIds = await this.redis.smembers('privacy:v1:active_sessions');
        for (const sid of sessionIds) {
          const ttl = await this.redis.ttl(`privacy:v1:session:${sid}:total_tokens`);
          if (ttl <= 0) {
            await this.redis.srem('privacy:v1:active_sessions', sid);
            continue;
          }
          const totalTokens = parseInt((await this.redis.get(`privacy:v1:session:${sid}:total_tokens`)) || '0', 10);
          const metaRaw = await this.redis.get(`privacy:v1:sessions:meta:${sid}`);
          const meta = metaRaw ? JSON.parse(metaRaw) : { createdAt: now - (config.VAULT_TTL_SECONDS - ttl) * 1000 };

          sessions.push({
            sessionId: sid,
            tokenCount: totalTokens,
            createdAt: meta.createdAt || now,
            expiresAt: now + ttl * 1000,
            ttlSecondsRemaining: ttl,
          });
        }
        return sessions;
      } catch {
        // Fall back to memory
      }
    }

    for (const [sid, data] of this.memorySessions.entries()) {
      if (data.expiresAt > now) {
        sessions.push({
          sessionId: sid,
          tokenCount: data.count,
          createdAt: data.createdAt,
          expiresAt: data.expiresAt,
          ttlSecondsRemaining: Math.max(0, Math.round((data.expiresAt - now) / 1000)),
        });
      }
    }

    return sessions;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    if (this.redis && this.isConnected) {
      try {
        const keys = await this.redis.keys(`privacy:v1:session:${sessionId}:*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        await this.redis.del(`privacy:v1:sessions:meta:${sessionId}`);
        await this.redis.srem('privacy:v1:active_sessions', sessionId);
        return true;
      } catch {
        // Fall back to memory
      }
    }

    this.memorySessions.delete(sessionId);
    for (const key of Array.from(this.memoryStore.keys())) {
      if (key.includes(`:${sessionId}:`)) this.memoryStore.delete(key);
    }
    for (const key of Array.from(this.memoryLookup.keys())) {
      if (key.includes(`:${sessionId}:`)) this.memoryLookup.delete(key);
    }
    return true;
  }
}

export const vault = new RedisTokenVault();
