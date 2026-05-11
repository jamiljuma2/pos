import { Prisma, Role } from '@prisma/client';
import type { Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { comparePassword, hashPassword, hashToken, refreshTokenExpiresAt, signAccessToken, signRefreshToken } from '../lib/security.js';
import { ApiError } from '../middleware/error.js';
import { authenticate, authorize, requireBusinessScope } from '../middleware/auth.js';
import { getRequestIp, requireValue } from '../middleware/tenant.js';

export const authRouter = Router();

const registerSchema = z.object({
  ownerName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  business: z.object({
    name: z.string().min(2),
    location: z.string().optional(),
    currency: z.string().min(3).max(3).default('KES'),
    phone: z.string().optional()
  })
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

const staffSchema = z.object({
  businessId: z.string().optional(),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().optional(),
  permissions: z.array(z.string()).default([])
});

type RefreshTokenWriter = Pick<typeof prisma, 'refreshToken'>;

function toSessionPayload(user: {
  id: string;
  name: string;
  email: string;
  role: Role;
  businessId: string | null;
  staffId?: string | null;
}) {
  return {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    businessId: user.businessId,
    staffId: user.staffId ?? null
  };
}

async function issueSession(user: {
  id: string;
  name: string;
  email: string;
  role: Role;
  businessId: string | null;
  staffId?: string | null;
}, db: RefreshTokenWriter = prisma) {
  const payload = toSessionPayload(user);
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await db.refreshToken.create({
    data: {
      businessId: user.businessId,
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshTokenExpiresAt()
    }
  });

  return { accessToken, refreshToken };
}

function sanitizeUser(user: { id: string; name: string; email: string; role: Role; businessId: string | null; staffId?: string | null }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    businessId: user.businessId,
    staffId: user.staffId ?? null
  };
}

authRouter.post('/register', async (req: Request, res: Response) => {
  const body = registerSchema.parse(req.body);

  const result = await prisma.$transaction(async (tx) => {
    const passwordHash = await hashPassword(body.password);

    const owner = await tx.user.create({
      data: {
        name: body.ownerName,
        email: body.email.toLowerCase(),
        passwordHash,
        role: Role.BUSINESS_OWNER,
        businessId: null
      }
    });

    const business = await tx.business.create({
      data: {
        name: body.business.name,
        location: body.business.location,
        currency: body.business.currency.toUpperCase(),
        phone: body.business.phone,
        ownerId: owner.id
      }
    });

    await tx.user.update({
      where: { id: owner.id },
      data: { businessId: business.id }
    });

    const staff = await tx.staff.create({
      data: {
        businessId: business.id,
        userId: owner.id,
        displayName: body.ownerName,
        permissions: ['ALL']
      }
    });

    const session = await issueSession({
      id: owner.id,
      name: owner.name,
      email: owner.email,
      role: owner.role,
      businessId: business.id,
      staffId: staff.id
    }, tx);

    await tx.auditLog.create({
      data: {
        businessId: business.id,
        actorUserId: owner.id,
        action: 'business.registered',
        entity: 'business',
        entityId: business.id,
        metadata: { name: business.name }
      }
    });

    return { business, owner, staff, session };
  });

  res.status(201).json({
    user: sanitizeUser({
      id: result.owner.id,
      name: result.owner.name,
      email: result.owner.email,
      role: result.owner.role,
      businessId: result.business.id,
      staffId: result.staff.id
    }),
    business: result.business,
    tokens: result.session
  });
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({
    where: { email: body.email.toLowerCase() },
    include: { staffProfile: true }
  });

  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const passwordOk = await comparePassword(body.password, user.passwordHash);
  if (!passwordOk) {
    throw new ApiError(401, 'Invalid credentials');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  const session = await issueSession({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    businessId: user.businessId,
    staffId: user.staffProfile?.id ?? null
  });

  res.json({
    user: sanitizeUser({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
      staffId: user.staffProfile?.id ?? null
    }),
    tokens: session
  });
});

authRouter.post('/refresh', async (req: Request, res: Response) => {
  const body = refreshSchema.parse(req.body);
  const refreshToken = body.refreshToken;
  const tokenHash = hashToken(refreshToken);
  const currentSession = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  if (!currentSession || currentSession.revokedAt || currentSession.expiresAt < new Date()) {
    throw new ApiError(401, 'Refresh token revoked or expired');
  }

  if (!currentSession.user.isActive) {
    throw new ApiError(401, 'User account disabled');
  }

  const sessionPayload = toSessionPayload({
    id: currentSession.user.id,
    name: currentSession.user.name,
    email: currentSession.user.email,
    role: currentSession.user.role,
    businessId: currentSession.user.businessId
  });

  const accessToken = signAccessToken(sessionPayload);
  const nextRefreshToken = signRefreshToken(sessionPayload);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date() }
    }),
    prisma.refreshToken.create({
      data: {
        businessId: currentSession.user.businessId,
        userId: currentSession.user.id,
        tokenHash: hashToken(nextRefreshToken),
        expiresAt: refreshTokenExpiresAt()
      }
    })
  ]);

  res.json({
    tokens: {
      accessToken,
      refreshToken: nextRefreshToken
    }
  });
});

authRouter.post('/logout', async (req: Request, res: Response) => {
  const body = refreshSchema.parse(req.body);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(body.refreshToken) },
    data: { revokedAt: new Date() }
  });

  res.status(204).send();
});

authRouter.get('/me', authenticate, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: requireValue(req.user?.id, 'Unauthorized') },
    include: { business: true, staffProfile: true }
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
      staffId: user.staffProfile?.id ?? null,
      business: user.business
    }
  });
});

authRouter.post('/staff', authenticate, authorize(Role.SUPER_ADMIN, Role.BUSINESS_OWNER), async (req: Request, res: Response) => {
  const body = staffSchema.parse(req.body);
  const businessId = body.businessId ?? requireBusinessScope(req);

  const staffUser = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) {
      throw new ApiError(409, 'Email already exists');
    }

    const passwordHash = await hashPassword(body.password);
    const user = await tx.user.create({
      data: {
        businessId,
        name: body.name,
        email: body.email.toLowerCase(),
        passwordHash,
        role: Role.STAFF
      }
    });

    const staff = await tx.staff.create({
      data: {
        businessId,
        userId: user.id,
        displayName: body.displayName ?? body.name,
        permissions: body.permissions.length > 0 ? body.permissions : ['SELL']
      }
    });

    await tx.auditLog.create({
      data: {
        businessId,
        actorUserId: req.user?.id ?? null,
        action: 'staff.created',
        entity: 'staff',
        entityId: staff.id,
        metadata: { email: user.email, permissions: staff.permissions },
        ipAddress: getRequestIp(req)
      }
    });

    return { user, staff };
  });

  res.status(201).json({
    user: sanitizeUser({
      id: staffUser.user.id,
      name: staffUser.user.name,
      email: staffUser.user.email,
      role: staffUser.user.role,
      businessId,
      staffId: staffUser.staff.id
    }),
    staff: staffUser.staff
  });
});

authRouter.get('/staff', authenticate, authorize(Role.SUPER_ADMIN, Role.BUSINESS_OWNER), async (req: Request, res: Response) => {
  const businessId = requireBusinessScope(req);
  const staff = await prisma.staff.findMany({
    where: { businessId },
    include: { user: true },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    staff: staff.map((entry) => ({
      id: entry.id,
      userId: entry.userId,
      displayName: entry.displayName,
      permissions: entry.permissions,
      user: {
        id: entry.user.id,
        name: entry.user.name,
        email: entry.user.email,
        role: entry.user.role,
        isActive: entry.user.isActive
      }
    }))
  });
});
