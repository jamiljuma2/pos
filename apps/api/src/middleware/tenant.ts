import type { Request } from 'express';
import { ApiError } from './error.js';

export function getRequestIp(req: Request): string | undefined {
  return (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ?? req.ip;
}

export function parseJsonBody<T>(body: unknown): T {
  if (typeof body === 'string') {
    return JSON.parse(body) as T;
  }

  return body as T;
}

export function requireValue<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined || value === '') {
    throw new ApiError(400, message);
  }

  return value;
}
