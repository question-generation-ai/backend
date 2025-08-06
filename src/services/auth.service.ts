import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const JWT_EXPIRES_IN = '1h';

export async function registerUser(email: string, password: string) {
  const existing = await prisma.userAccount.findUnique({ where: { email } });
  if (existing) throw new Error('Email already registered');

  const api_key = randomBytes(32).toString('hex');
  const password_hash = await bcrypt.hash(password, 10);
  const user = await prisma.userAccount.create({
    data: { email, password_hash, api_key, subscription_tier: 'free', usage_limits: {} },
  });
  return user;
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.userAccount.findUnique({ where: { email } });
  if (!user) throw new Error('Invalid credentials');
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error('Invalid credentials');
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { token, user };
}

export function generateRefreshToken(user: any) {
  return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyRefreshToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
} 