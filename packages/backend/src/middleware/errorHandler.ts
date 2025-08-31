import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { Win5xError } from '@win5x/common';

export interface ErrorWithStatus extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  error: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error
  logger.error('Error caught by error handler:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Handle Win5x custom errors
  if (error instanceof Win5xError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
    });
    return;
  }

  // Handle Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    
    switch (prismaError.code) {
      case 'P2002':
        res.status(409).json({
          success: false,
          error: 'A record with this information already exists',
          code: 'DUPLICATE_RECORD',
        });
        return;
      
      case 'P2025':
        res.status(404).json({
          success: false,
          error: 'Record not found',
          code: 'RECORD_NOT_FOUND',
        });
        return;
      
      case 'P2003':
        res.status(400).json({
          success: false,
          error: 'Invalid reference to related record',
          code: 'FOREIGN_KEY_CONSTRAINT',
        });
        return;
      
      default:
        res.status(500).json({
          success: false,
          error: 'Database error occurred',
          code: 'DATABASE_ERROR',
        });
        return;
    }
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'VALIDATION_ERROR',
    });
    return;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: 'INVALID_TOKEN',
    });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Token expired',
      code: 'TOKEN_EXPIRED',
    });
    return;
  }

  // Handle syntax errors (malformed JSON, etc.)
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({
      success: false,
      error: 'Invalid JSON in request body',
      code: 'INVALID_JSON',
    });
    return;
  }

  // Handle rate limit errors
  if (error.message && error.message.includes('Too many requests')) {
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    });
    return;
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message || 'Something went wrong';

  res.status(statusCode).json({
    success: false,
    error: message,
    code: error.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  });
}

// Async error wrapper
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: T, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Not found handler
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = new Error(`Route ${req.originalUrl} not found`) as ErrorWithStatus;
  error.statusCode = 404;
  error.code = 'ROUTE_NOT_FOUND';
  next(error);
}