import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export async function createApiKey(userId: string, permissions: any = {}, rateLimits: any = {}) {
  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);
  const apiKey = await prisma.apiKey.create({
    data: {
      user_id: userId,
      key_hash: keyHash,
      permissions,
      rate_limits: rateLimits,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    },
  });
  return { apiKey: rawKey, apiKeyRecord: apiKey };
}

export async function listApiKeys(userId: string) {
  return prisma.apiKey.findMany({ where: { user_id: userId } });
}

export async function revokeApiKey(id: string, userId: string) {
  return prisma.apiKey.delete({ where: { id, user_id: userId } });
} 