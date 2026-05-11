import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate, authorize, requireBusinessScope } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

export const reportsRouter = Router();

reportsRouter.use(authenticate);

reportsRouter.get('/dashboard', authorize(Role.SUPER_ADMIN, Role.BUSINESS_OWNER, Role.STAFF), async (req, res) => {
  const businessId = requireBusinessScope(req);
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [transactions, revenueResult, topProducts, recentTransactions, activeProducts] = await prisma.$transaction([
    prisma.transaction.count({ where: { businessId } }),
    prisma.transaction.aggregate({
      where: { businessId, createdAt: { gte: since } },
      _sum: { total: true }
    }),
    prisma.transactionItem.groupBy({
      by: ['productId', 'productName'],
      where: { businessId },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    }),
    prisma.transaction.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { staff: { include: { user: true } } }
    }),
    prisma.product.findMany({
      where: { businessId, isActive: true },
      select: { stock: true, lowStockThreshold: true }
    })
  ]);

  const lowStockCount = activeProducts.filter((product) => product.stock <= product.lowStockThreshold).length;

  const dailyRevenue = await prisma.$queryRaw<Array<{ day: string; revenue: string }>>`
    SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day, COALESCE(SUM(total), 0)::text AS revenue
    FROM transactions
    WHERE business_id = ${businessId} AND "createdAt" >= ${since}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  res.json({
    summary: {
      transactionCount: transactions,
      revenue: Number(revenueResult._sum.total ?? 0),
      lowStockCount
    },
    topProducts: topProducts.map((entry) => ({
      productId: entry.productId,
      productName: entry.productName,
      quantity: Number(entry._sum?.quantity ?? 0)
    })),
    recentTransactions: recentTransactions.map((transaction) => ({
      id: transaction.id,
      receiptNumber: transaction.receiptNumber,
      total: Number(transaction.total),
      createdAt: transaction.createdAt,
      cashier: transaction.staff?.user.name ?? 'Unknown'
    })),
    dailyRevenue: dailyRevenue.map((entry) => ({
      day: entry.day,
      revenue: Number(entry.revenue)
    }))
  });
});

reportsRouter.get('/sales.csv', authorize(Role.SUPER_ADMIN, Role.BUSINESS_OWNER, Role.STAFF), async (req, res) => {
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

  const lines = [
    ['Receipt Number', 'Date', 'Cashier', 'Subtotal', 'Discount', 'Tax', 'Total', 'Payment Status'].join(',')
  ];

  for (const transaction of transactions) {
    lines.push(
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
  res.setHeader('Content-Disposition', 'attachment; filename="sales-report.csv"');
  res.send(lines.join('\n'));
});
