import { PaymentProvider, PaymentStatus, Role } from '@prisma/client';
import type { Request } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, requireBusinessScope } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { buildPaymentLinkReference, pushLipanaStk } from '../lib/lipana.js';
import { getRequestIp } from '../middleware/tenant.js';
import { Prisma } from '@prisma/client';

export const paymentsRouter = Router();

const stkSchema = z.object({
  phone: z.string().min(8),
  amount: z.coerce.number().positive(),
  transactionId: z.string().optional(),
  description: z.string().optional()
});

const linkSchema = z.object({
  amount: z.coerce.number().positive(),
  transactionId: z.string().optional(),
  description: z.string().optional()
});

paymentsRouter.use(authenticate);

paymentsRouter.post('/stk', authorize(Role.SUPER_ADMIN, Role.BUSINESS_OWNER, Role.STAFF), async (req: Request, res) => {
  const businessId = requireBusinessScope(req);
  const body = stkSchema.parse(req.body);
  const payment = await prisma.payment.create({
    data: {
      businessId,
      transactionId: body.transactionId ?? null,
      provider: PaymentProvider.LIPANA,
      phone: body.phone,
      amount: new Prisma.Decimal(body.amount),
      status: PaymentStatus.PENDING
    }
  });

  const reference = buildPaymentLinkReference('stk');
  const lipanaResponse = await pushLipanaStk({
    phone: body.phone,
    amount: body.amount,
    reference,
    transactionId: body.transactionId,
    description: body.description
  });

  const checkoutRequestId = lipanaResponse.checkoutRequestID ?? lipanaResponse.checkout_request_id ?? lipanaResponse.data?.checkoutRequestID ?? lipanaResponse.data?.checkout_request_id ?? null;
  const externalTransactionId = lipanaResponse.transactionId ?? lipanaResponse.transaction_id ?? lipanaResponse.data?.transactionId ?? lipanaResponse.data?.transaction_id ?? null;

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      checkoutRequestId,
      externalTransactionId,
      rawPayload: lipanaResponse
    }
  });

  await prisma.auditLog.create({
    data: {
      businessId,
      actorUserId: req.user?.id ?? null,
      action: 'payment.stk.initiated',
      entity: 'payment',
      entityId: updated.id,
      metadata: { amount: body.amount, phone: body.phone },
      ipAddress: getRequestIp(req)
    }
  });

  res.status(201).json({ payment: updated, lipana: lipanaResponse });
});

paymentsRouter.post('/link', authorize(Role.SUPER_ADMIN, Role.BUSINESS_OWNER, Role.STAFF), async (req: Request, res) => {
  const businessId = requireBusinessScope(req);
  const body = linkSchema.parse(req.body);
  const linkToken = buildPaymentLinkReference('pay');
  const linkUrl = `${env.WEB_ORIGIN}/pay/${linkToken}`;

  const payment = await prisma.payment.create({
    data: {
      businessId,
      transactionId: body.transactionId ?? null,
      provider: PaymentProvider.LIPANA,
      phone: 'payment-link',
      amount: new Prisma.Decimal(body.amount),
      status: PaymentStatus.PENDING,
      paymentLink: linkUrl,
      externalTransactionId: linkToken,
      rawPayload: {
        description: body.description ?? 'Hosted payment link',
        linkToken
      }
    }
  });

  res.status(201).json({
    payment,
    paymentLink: linkUrl
  });
});
