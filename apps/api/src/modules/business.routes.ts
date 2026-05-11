import { Role } from '@prisma/client';
import type { Request } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, requireBusinessScope } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { getRequestIp } from '../middleware/tenant.js';

export const businessRouter = Router();

const updateBusinessSchema = z.object({
  name: z.string().min(2).optional(),
  location: z.string().optional(),
  currency: z.string().min(3).max(3).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional()
});

const franchiseSchema = z.object({
  name: z.string().min(2),
  location: z.string().optional(),
  currency: z.string().min(3).max(3).default('KES'),
  phone: z.string().optional()
});

businessRouter.use(authenticate);

businessRouter.get('/current', async (req, res) => {
  const businessId = requireBusinessScope(req);
  const business = await prisma.business.findUnique({ where: { id: businessId } });

  if (!business) {
    throw new ApiError(404, 'Business not found');
  }

  res.json({ business });
});

businessRouter.patch('/current', authorize(Role.SUPER_ADMIN, Role.BUSINESS_OWNER), async (req: Request, res) => {
  const businessId = requireBusinessScope(req);
  const body = updateBusinessSchema.parse(req.body);

  const business = await prisma.business.update({
    where: { id: businessId },
    data: body
  });

  await prisma.auditLog.create({
    data: {
      businessId,
      actorUserId: req.user?.id ?? null,
      action: 'business.updated',
      entity: 'business',
      entityId: businessId,
      metadata: body,
      ipAddress: getRequestIp(req)
    }
  });

  res.json({ business });
});

businessRouter.get('/all', authorize(Role.SUPER_ADMIN), async (_req, res) => {
  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: 'desc' }
  });

  res.json({ businesses });
});

businessRouter.post('/franchise', authorize(Role.SUPER_ADMIN, Role.BUSINESS_OWNER), async (req: Request, res) => {
  const body = franchiseSchema.parse(req.body);
  const parentBusinessId = requireBusinessScope(req);

  const business = await prisma.business.create({
    data: {
      name: body.name,
      location: body.location,
      currency: body.currency.toUpperCase(),
      phone: body.phone,
      ownerId: req.user!.id,
      parentBusinessId
    }
  });

  await prisma.auditLog.create({
    data: {
      businessId: parentBusinessId,
      actorUserId: req.user?.id ?? null,
      action: 'business.franchise.created',
      entity: 'business',
      entityId: business.id,
      metadata: { name: business.name, parentBusinessId },
      ipAddress: getRequestIp(req)
    }
  });

  res.status(201).json({ business });
});
