import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../middleware/error.js';

export type LipanaStkInput = {
  phone: string;
  amount: number;
  reference: string;
  transactionId?: string;
  description?: string;
};

export type LipanaPushResponse = {
  success?: boolean;
  message?: string;
  data?: {
    checkoutRequestID?: string;
    checkout_request_id?: string;
    transactionId?: string;
    transaction_id?: string;
    externalTransactionId?: string;
    external_transaction_id?: string;
    paymentLink?: string;
    payment_link?: string;
  };
  checkoutRequestID?: string;
  checkout_request_id?: string;
  transactionId?: string;
  transaction_id?: string;
  paymentLink?: string;
  payment_link?: string;
};

export async function pushLipanaStk(input: LipanaStkInput): Promise<LipanaPushResponse> {
  const response = await fetch(`${env.LIPANA_BASE_URL}/transactions/push-stk`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.LIPANA_SECRET_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      phone: input.phone,
      amount: input.amount,
      reference: input.reference,
      description: input.description ?? 'POS payment',
      callbackUrl: env.LIPANA_CALLBACK_URL,
      transactionId: input.transactionId ?? input.reference
    })
  });

  const payload = (await response.json().catch(() => null)) as LipanaPushResponse | null;
  if (!response.ok || !payload) {
    throw new ApiError(502, 'Lipana STK push failed', payload ?? undefined);
  }

  return payload;
}

export function verifyLipanaWebhookSignature(rawBody: string | Buffer, signature: string | undefined | null) {
  if (!signature) {
    throw new ApiError(401, 'Missing webhook signature');
  }

  const expected = crypto
    .createHmac('sha256', env.LIPANA_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  const received = signature.trim().toLowerCase();
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(received, 'hex');

  if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw new ApiError(401, 'Invalid webhook signature');
  }
}

export function buildPaymentLinkReference(prefix = 'link'): string {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}
