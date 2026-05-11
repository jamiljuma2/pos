import { Prisma, Role } from '@prisma/client';
import type { Request } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, requireBusinessScope } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { getRequestIp } from '../middleware/tenant.js';
import { generateCheckoutReference } from '../lib/security.js';

export const salesRouter = Router();

const saleItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  discount: z.coerce.number().nonnegative().default(0)
});

const saleSchema = z.object({
  staffId: z.string().optional(),
  items: z.array(saleItemSchema).min(1),
  discountTotal: z.coerce.number().nonnegative().default(0),
  taxTotal: z.coerce.number().nonnegative().default(0),
  customerPhone: z.string().optional(),
  notes: z.string().optional()
});

salesRouter.use(authenticate);

salesRouter.post('/', authorize(Role.SUPER_ADMIN, Role.BUSINESS_OWNER, Role.STAFF), async (req: Request, res) => {
  const businessId = requireBusinessScope(req);
  const body = saleSchema.parse(req.body);
  const staffId = body.staffId ?? req.user?.staffId ?? null;

  if (staffId) {
    const staff = await prisma.staff.findFirst({ where: { id: staffId, businessId } });
    if (!staff) {
      throw new ApiError(400, 'Invalid staff assignment');
    }
  }

  const receiptNumber = generateCheckoutReference('rcpt').toUpperCase();

  const sale = await prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: {
        businessId,
        id: { in: body.items.map((item) => item.productId) },
        isActive: true
      }
    });

    if (products.length !== body.items.length) {
      throw new ApiError(400, 'One or more products were not found');
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    let subtotal = new Prisma.Decimal(0);
    const lineItems = body.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new ApiError(400, 'One or more products were not found');
      }

      if (product.stock < item.quantity) {
        throw new ApiError(400, `Insufficient stock for ${product.name}`);
      }

      const lineTotal = new Prisma.Decimal(item.quantity)
        .mul(product.price)
        .minus(new Prisma.Decimal(item.discount));
      subtotal = subtotal.add(lineTotal);

      return { item, product, lineTotal };
    });

    await Promise.all(
      lineItems.map((entry) =>
        tx.product.update({
          where: { id: entry.product.id },
          data: { stock: entry.product.stock - entry.item.quantity }
        })
      )
    );

    const transaction = await tx.transaction.create({
      data: {
        businessId,
        staffId,
        receiptNumber,
        customerPhone: body.customerPhone,
        subtotal,
        discountTotal: new Prisma.Decimal(body.discountTotal),
        taxTotal: new Prisma.Decimal(body.taxTotal),
        total: subtotal.minus(new Prisma.Decimal(body.discountTotal)).add(new Prisma.Decimal(body.taxTotal)),
        status: 'COMPLETED',
        paymentStatus: 'PENDING',
        notes: body.notes,
        items: {
          create: lineItems.map((entry) => ({
            businessId,
            productId: entry.product.id,
            productName: entry.product.name,
            sku: entry.product.sku,
            barcode: entry.product.barcode,
            quantity: entry.item.quantity,
            unitPrice: entry.product.price,
            discount: new Prisma.Decimal(entry.item.discount),
            total: entry.lineTotal,
            productSnapshot: {
              id: entry.product.id,
              name: entry.product.name,
              sku: entry.product.sku,
              barcode: entry.product.barcode,
              price: Number(entry.product.price)
            }
          }))
        }
      },
      include: { items: true, staff: true }
    });

    await tx.auditLog.create({
      data: {
        businessId,
        actorUserId: req.user?.id ?? null,
        action: 'transaction.created',
        entity: 'transaction',
        entityId: transaction.id,
        metadata: { receiptNumber, itemCount: body.items.length, total: Number(transaction.total) },
        ipAddress: getRequestIp(req)
      }
    });

    return transaction;
  });

  res.status(201).json({
    transaction: {
      ...sale,
      subtotal: Number(sale.subtotal),
      discountTotal: Number(sale.discountTotal),
      taxTotal: Number(sale.taxTotal),
      total: Number(sale.total),
      items: sale.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        total: Number(item.total)
      }))
    }
  });
});

salesRouter.get('/', async (req, res) => {
  const businessId = requireBusinessScope(req);
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
  const staffId = typeof req.query.staffId === 'string' ? req.query.staffId : undefined;
  const productId = typeof req.query.productId === 'string' ? req.query.productId : undefined;
  const startDate = typeof req.query.startDate === 'string' ? new Date(req.query.startDate) : undefined;
  const endDate = typeof req.query.endDate === 'string' ? new Date(req.query.endDate) : undefined;

  const where: Prisma.TransactionWhereInput = {
    businessId,
    ...(staffId ? { staffId } : {}),
    ...(startDate || endDate
      ? {
          createdAt: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {})
          }
        }
      : {}),
    ...(productId ? { items: { some: { productId } } } : {})
  };

  const [total, transactions] = await prisma.$transaction([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include: {
        items: true,
        staff: { include: { user: true } },
        payments: true
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  res.json({
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    transactions: transactions.map((transaction) => ({
      ...transaction,
      subtotal: Number(transaction.subtotal),
      discountTotal: Number(transaction.discountTotal),
      taxTotal: Number(transaction.taxTotal),
      total: Number(transaction.total),
      items: transaction.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        total: Number(item.total)
      }))
    }))
  });
});

salesRouter.get('/:id/receipt', async (req, res) => {
  const businessId = requireBusinessScope(req);
  const transaction = await prisma.transaction.findFirst({
    where: { id: req.params.id, businessId },
    include: { items: true, staff: { include: { user: true } }, business: true, payments: true }
  });

  if (!transaction) {
    throw new ApiError(404, 'Transaction not found');
  }

  res.json({
    receipt: {
      business: {
        id: transaction.business.id,
        name: transaction.business.name,
        phone: transaction.business.phone,
        currency: transaction.business.currency
      },
      transaction: {
        id: transaction.id,
        receiptNumber: transaction.receiptNumber,
        paymentStatus: transaction.paymentStatus,
        total: Number(transaction.total),
        createdAt: transaction.createdAt,
        items: transaction.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          total: Number(item.total)
        }))
      }
    }
  });
});

salesRouter.get('/export.csv', async (req, res) => {
  const businessId = requireBusinessScope(req);
  const transactions = await prisma.transaction.findMany({
    where: { businessId },
    include: { staff: { include: { user: true } } },
    orderBy: { createdAt: 'desc' },
    take: 500
  });

  const escapeCsv = (value: string | number | null | undefined) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const rows = [
    ['Receipt Number', 'Date', 'Cashier', 'Subtotal', 'Discount', 'Tax', 'Total', 'Payment Status'].join(',')
  ];

  for (const transaction of transactions) {
    rows.push(
      [
        escapeCsv(transaction.receiptNumber),
        escapeCsv(transaction.createdAt.toISOString()),
        escapeCsv(transaction.staff?.user.name ?? 'Unknown'),
        escapeCsv(Number(transaction.subtotal)),
        escapeCsv(Number(transaction.discountTotal)),
        escapeCsv(Number(transaction.taxTotal)),
        escapeCsv(Number(transaction.total)),
        escapeCsv(transaction.paymentStatus)
      ].join(',')
    );
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="sales-export.csv"');
  res.send(rows.join('\n'));
});
