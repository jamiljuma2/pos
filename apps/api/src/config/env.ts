import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

// Load .env from cwd first, then attempt to find a .env upward in the repo
dotenv.config();

function findEnvUpwards(startDir: string, maxLevels = 6): string | null {
  let dir = startDir;
  for (let i = 0; i < maxLevels; i++) {
    const candidate = path.join(dir, '.env');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

// If critical envs are missing, try loading .env from repository root (search upwards)
if (!process.env.DATABASE_URL || !process.env.JWT_ACCESS_SECRET) {
  const envPath = findEnvUpwards(process.cwd());
  if (envPath) {
    dotenv.config({ path: envPath });
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_ORIGIN: z.string().url().default('http://localhost:3000'),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),
  LIPANA_BASE_URL: z.string().url().default('https://api.lipana.dev/v1'),
  LIPANA_SECRET_KEY: z.string().min(1),
  LIPANA_WEBHOOK_SECRET: z.string().min(1),
  LIPANA_CALLBACK_URL: z.string().url(),
  SUPER_ADMIN_EMAIL: z.string().email().optional(),
  SUPER_ADMIN_PASSWORD: z.string().min(8).optional(),
  SUPER_ADMIN_NAME: z.string().min(2).optional()
});

export const env = envSchema.parse(process.env);
