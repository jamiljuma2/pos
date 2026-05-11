import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, 'Route not found'));
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error instanceof ZodError) {
    const message = 'Validation failed: ' + error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    return res.status(400).send(message);
  }

  if (error instanceof ApiError) {
    return res.status(error.statusCode).send(error.message);
  }

  console.error(error);
  return res.status(500).send('Internal server error');
}
