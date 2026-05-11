import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        businessId: string | null;
        role: Role;
        staffId?: string | null;
        email: string;
        name: string;
      };
    }
  }
}

export {};
