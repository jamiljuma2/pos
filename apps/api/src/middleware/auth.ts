import type { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { ApiError } from './error.js';
import { verifyAccessToken } from '../lib/security.js';

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Missing bearer token'));
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      businessId: payload.businessId,
      role: payload.role,
      staffId: payload.staffId ?? null,
      email: payload.email,
      name: payload.name
    };
    return next();
  } catch {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Unauthorized'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Forbidden'));
    }

    return next();
  };
}

export function requireBusinessScope(req: Request): string {
  if (req.user?.role === Role.SUPER_ADMIN) {
    const businessId = req.query.businessId || req.body?.businessId || req.params.businessId;
    if (typeof businessId === 'string' && businessId.length > 0) {
      return businessId;
    }
  }

  if (!req.user?.businessId) {
    throw new ApiError(400, 'Business context is required');
  }

  return req.user.businessId;
}
