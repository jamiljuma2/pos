import type { Prisma } from '@prisma/client';

export function formatReceipt(transaction: {
  receiptNumber: string;
  total: Prisma.Decimal;
  paymentStatus: string;
  createdAt: Date;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    total: Prisma.Decimal;
  }>;
}) {
  return {
    receiptNumber: transaction.receiptNumber,
    paymentStatus: transaction.paymentStatus,
    createdAt: transaction.createdAt,
    total: Number(transaction.total),
    items: transaction.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      total: Number(item.total)
    }))
  };
}
