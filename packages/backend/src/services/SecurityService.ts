import { PrismaClient } from '@prisma/client';
import { RedisService } from './RedisService';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export class SecurityService {
  constructor(
    private prisma: PrismaClient,
    private redis: RedisService
  ) {}

  // Rate limiting
  async checkRateLimit(
    identifier: string, 
    action: string, 
    maxAttempts: number = 5, 
    windowMs: number = 15 * 60 * 1000
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `rate_limit:${action}:${identifier}`;
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const windowKey = `${key}:${window}`;

    try {
      const current = await this.redis.get<number>(windowKey) || 0;
      
      if (current >= maxAttempts) {
        const resetTime = (window + 1) * windowMs;
        return {
          allowed: false,
          remaining: 0,
          resetTime,
        };
      }

      // Increment counter
      await this.redis.set(windowKey, current + 1, Math.ceil(windowMs / 1000));

      return {
        allowed: true,
        remaining: maxAttempts - current - 1,
        resetTime: (window + 1) * windowMs,
      };
    } catch (error) {
      logger.error('Rate limit check failed:', error);
      // Allow request if Redis is down
      return {
        allowed: true,
        remaining: maxAttempts - 1,
        resetTime: now + windowMs,
      };
    }
  }

  // Fraud detection for betting patterns
  async detectSuspiciousBetting(userId: string): Promise<{
    isSuspicious: boolean;
    reasons: string[];
    riskScore: number;
  }> {
    const reasons: string[] = [];
    let riskScore = 0;

    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Check betting frequency (last hour)
      const recentBets = await this.prisma.bet.count({
        where: {
          userId,
          placedAt: { gte: oneHourAgo },
        },
      });

      if (recentBets > 100) {
        reasons.push('Extremely high betting frequency');
        riskScore += 40;
      } else if (recentBets > 50) {
        reasons.push('High betting frequency');
        riskScore += 20;
      }

      // Check bet amount patterns
      const dailyBets = await this.prisma.bet.findMany({
        where: {
          userId,
          placedAt: { gte: oneDayAgo },
        },
        select: { amount: true },
      });

      if (dailyBets.length > 0) {
        const amounts = dailyBets.map(bet => bet.amount);
        const maxAmount = Math.max(...amounts);
        const avgAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;

        // Check for sudden large bets
        if (maxAmount > avgAmount * 10) {
          reasons.push('Sudden large bet amount');
          riskScore += 25;
        }

        // Check for identical bet amounts (possible bot)
        const uniqueAmounts = new Set(amounts);
        if (uniqueAmounts.size === 1 && amounts.length > 20) {
          reasons.push('Identical bet amounts pattern');
          riskScore += 30;
        }
      }

      // Check win rate anomalies
      const [totalBets, wonBets] = await Promise.all([
        this.prisma.bet.count({
          where: { userId, status: { in: ['WON', 'LOST'] } },
        }),
        this.prisma.bet.count({
          where: { userId, status: 'WON' },
        }),
      ]);

      if (totalBets > 50) {
        const winRate = wonBets / totalBets;
        if (winRate > 0.4) { // Unusually high win rate
          reasons.push('Unusually high win rate');
          riskScore += 35;
        }
      }

      // Check multiple accounts from same IP (would need IP tracking)
      // This would require storing IP addresses with bets

      return {
        isSuspicious: riskScore >= 50,
        reasons,
        riskScore,
      };
    } catch (error) {
      logger.error('Fraud detection failed:', error);
      return {
        isSuspicious: false,
        reasons: [],
        riskScore: 0,
      };
    }
  }

  // Input sanitization
  sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential XSS characters
      .replace(/['"]/g, '') // Remove quotes
      .substring(0, 1000); // Limit length
  }

  // Generate secure random tokens
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Hash sensitive data
  hashData(data: string, salt?: string): string {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    return crypto.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha512').toString('hex');
  }

  // Encrypt sensitive data
  encryptData(data: string, key?: string): { encrypted: string; iv: string } {
    const algorithm = 'aes-256-cbc';
    const secretKey = key || process.env.ENCRYPTION_KEY || 'default-encryption-key';
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, secretKey);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
    };
  }

  // Decrypt sensitive data
  decryptData(encryptedData: string, iv: string, key?: string): string {
    const algorithm = 'aes-256-cbc';
    const secretKey = key || process.env.ENCRYPTION_KEY || 'default-encryption-key';
    
    const decipher = crypto.createDecipher(algorithm, secretKey);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Log security events
  async logSecurityEvent(
    type: 'login_attempt' | 'failed_login' | 'suspicious_betting' | 'rate_limit_exceeded' | 'fraud_detected',
    userId?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await this.prisma.securityLog.create({
        data: {
          type,
          userId,
          details: details ? JSON.stringify(details) : null,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      logger.error('Failed to log security event:', error);
    }
  }

  // Check if user is blocked
  async isUserBlocked(userId: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { isActive: true },
      });

      return !user?.isActive;
    } catch (error) {
      logger.error('Failed to check user block status:', error);
      return false;
    }
  }

  // Block/unblock user
  async setUserBlockStatus(userId: string, isBlocked: boolean, reason?: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isActive: !isBlocked },
      });

      await this.logSecurityEvent(
        isBlocked ? 'user_blocked' : 'user_unblocked',
        userId,
        { reason },
      );

      logger.info(`User ${userId} ${isBlocked ? 'blocked' : 'unblocked'}: ${reason || 'No reason provided'}`);
    } catch (error) {
      logger.error('Failed to update user block status:', error);
      throw error;
    }
  }

  // Validate UTR code format
  validateUTRCode(utrCode: string): { isValid: boolean; error?: string } {
    if (!utrCode || typeof utrCode !== 'string') {
      return { isValid: false, error: 'UTR code is required' };
    }

    const trimmed = utrCode.trim();
    
    if (trimmed.length < 5) {
      return { isValid: false, error: 'UTR code must be at least 5 characters' };
    }

    if (trimmed.length > 50) {
      return { isValid: false, error: 'UTR code is too long' };
    }

    // Check for valid UTR format (alphanumeric)
    if (!/^[A-Z0-9]+$/.test(trimmed)) {
      return { isValid: false, error: 'UTR code can only contain letters and numbers' };
    }

    return { isValid: true };
  }

  // Generate session fingerprint
  generateFingerprint(userAgent: string, ipAddress: string): string {
    const data = `${userAgent}:${ipAddress}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Check for multiple sessions
  async checkMultipleSessions(userId: string, fingerprint: string): Promise<boolean> {
    try {
      const key = `sessions:${userId}`;
      const sessions = await this.redis.smembers<string>(key);
      
      if (sessions.length > 3) { // Allow max 3 concurrent sessions
        logger.warn(`User ${userId} has ${sessions.length} concurrent sessions`);
        return true;
      }

      // Add current session
      await this.redis.sadd(key, fingerprint);
      await this.redis.expire(key, 24 * 60 * 60); // 24 hours

      return false;
    } catch (error) {
      logger.error('Failed to check multiple sessions:', error);
      return false;
    }
  }
}