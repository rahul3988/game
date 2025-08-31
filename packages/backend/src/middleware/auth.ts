import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthenticationError, AuthorizationError, JWTPayload, AdminPermission } from '@win5x/common';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    type: 'user' | 'admin';
    permissions?: AdminPermission[];
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    throw new AuthenticationError('Access token required');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      type: decoded.type,
      permissions: decoded.permissions,
    };
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid token');
    } else {
      throw new AuthenticationError('Authentication failed');
    }
  }
}

export function requireUser(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  if (req.user.type !== 'user') {
    throw new AuthorizationError('User access required');
  }

  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  if (req.user.type !== 'admin') {
    throw new AuthorizationError('Admin access required');
  }

  next();
}

export function requirePermission(permission: AdminPermission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (req.user.type !== 'admin') {
      throw new AuthorizationError('Admin access required');
    }

    if (!req.user.permissions?.includes(permission)) {
      throw new AuthorizationError(`Permission required: ${permission}`);
    }

    next();
  };
}

export async function validateUserStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (req.user.type === 'user') {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { isActive: true },
      });

      if (!user || !user.isActive) {
        throw new AuthorizationError('User account is inactive');
      }
    } else if (req.user.type === 'admin') {
      const admin = await prisma.admin.findUnique({
        where: { id: req.user.id },
        select: { isActive: true },
      });

      if (!admin || !admin.isActive) {
        throw new AuthorizationError('Admin account is inactive');
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      type: decoded.type,
      permissions: decoded.permissions,
    };
  } catch (error) {
    // Ignore token errors for optional auth
    logger.warn('Optional auth token validation failed:', error);
  }

  next();
}

export function generateTokens(payload: Omit<JWTPayload, 'iat' | 'exp'>): { accessToken: string; refreshToken: string } {
  const accessToken = jwt.sign(
    payload,
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: payload.userId, type: payload.type },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
}

export function verifyRefreshToken(token: string): { userId: string; type: 'user' | 'admin' } {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as any;
    return {
      userId: decoded.userId,
      type: decoded.type,
    };
  } catch (error) {
    throw new AuthenticationError('Invalid refresh token');
  }
}