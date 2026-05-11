import { PaymentStatus, TransactionStatus } from '@prisma/client';
import express, { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { verifyLipanaWebhookSignature } from '../lib/lipana.js';
import { ApiError } from '../middleware/error.js';
import { parseJsonBody } from '../middleware/tenant.js';

export const webhooksRouter = Router();

webhooksRouter.post('/lipana', express.raw({ type: 'application/json' }), async (req, res) => {
  const rawBody = req.body as Buffer;
  const signature = req.header('x-lipana-signature') ?? req.header('X-Lipana-Signature');
  verifyLipanaWebhookSignature(rawBody, signature);

  const payload = parseJsonBody<Record<string, unknown>>(rawBody.toString('utf8'));
  const event = String(payload.event ?? payload.type ?? '');
  const data = (payload.data ?? payload.payload ?? payload) as Record<string, unknown>;

  const checkoutRequestId = String(data.checkoutRequestID ?? data.checkout_request_id ?? data.checkoutRequestId ?? '');
  const externalTransactionId = String(data.transactionId ?? data.transaction_id ?? data.externalTransactionId ?? '');
  const paymentStatus = event.includes('success')
    ? PaymentStatus.SUCCESS
    : event.includes('failed')
      ? PaymentStatus.FAILED
      : PaymentStatus.PENDING;

  const payment = await prisma.payment.findFirst({
    where: {
      OR: [
        checkoutRequestId ? { checkoutRequestId } : undefined,
        externalTransactionId ? { externalTransactionId } : undefined
      ].filter(Boolean) as Record<string, unknown>[]
    }
  });

  if (!payment) {
    throw new ApiError(404, 'Payment record not found');
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: paymentStatus,
        rawPayload: payload as Prisma.InputJsonValue,
        processedAt: new Date(),
        externalTransactionId: externalTransactionId || payment.externalTransactionId,
        checkoutRequestId: checkoutRequestId || payment.checkoutRequestId
      }
    });

    if (payment.transactionId) {
      await tx.transaction.update({
        where: { id: payment.transactionId },
        data: {
          paymentStatus,
          status: paymentStatus === PaymentStatus.SUCCESS ? TransactionStatus.COMPLETED : TransactionStatus.DRAFT
        }
      });
    }
  });

  res.json({ ok: true });
});
