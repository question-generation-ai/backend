import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Token blacklist service
export class TokenBlacklistService {
  // Add token to blacklist
  static async blacklistToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) {
        throw new Error('Invalid token');
      }

      // Store the token in blacklist with expiration
      await prisma.tokenBlacklist.create({
        data: {
          token,
          expires_at: new Date(decoded.exp * 1000), // Convert Unix timestamp to Date
        },
      });
    } catch (error) {
      console.error('Error blacklisting token:', error);
      throw error;
    }
  }

  // Check if token is blacklisted
  static async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const blacklistedToken = await prisma.tokenBlacklist.findUnique({
        where: { token },
      });

      return !!blacklistedToken;
    } catch (error) {
      console.error('Error checking token blacklist:', error);
      return false;
    }
  }

  // Clean up expired tokens from blacklist (run periodically)
  static async cleanupExpiredTokens(): Promise<void> {
    try {
      await prisma.tokenBlacklist.deleteMany({
        where: {
          expires_at: {
            lt: new Date(),
          },
        },
      });
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
    }
  }
}
