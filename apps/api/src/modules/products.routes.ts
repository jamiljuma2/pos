import { Prisma, Role } from '@prisma/client';
import type { Request } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, requireBusinessScope } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { getRequestIp } from '../middleware/tenant.js';

export const productsRouter = Router();

const categorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  description: z.string().optional()
});

const productSchema = z.object({
  categoryId: z.string().optional().nullable(),
  name: z.string().min(2),
  sku: z.string().min(2),
  barcode: z.string().optional().nullable(),
  description: z.string().optional(),
  price: z.coerce.number().positive(),
  costPrice: z.coerce.number().nonnegative().optional().nullable(),
  stock: z.coerce.number().int().nonnegative().default(0),
  lowStockThreshold: z.coerce.number().int().nonnegative().default(10),
  isActive: z.boolean().default(true)
});

const stockSchema = z.object({
  stock: z.coerce.number().int(),
  mode: z.enum(['set', 'adjust']).default('set')
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

productsRouter.use(authenticate);

productsRouter.get('/categories', async (req, res) => {
  const businessId = requireBusinessScope(req);
  const categories = await prisma.category.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ categories });
});

productsRouter.post('/categories', authorize(Role.SUPER_ADMIN, Role.BUSINESS_OWNER, Role.STAFF), async (req: Request, res) => {
  const businessId = requireBusinessScope(req);
  const body = categorySchema.parse(req.body);
  const category = await prisma.category.create({
    data: {
      businessId,
      name: body.name,
      slug: body.slug ? slugify(body.slug) : slugify(body.name),
      description: body.description
    }
  });

  await prisma.auditLog.create({
    data: {
      businessId,
      actorUserId: req.user?.id ?? null,
      action: 'category.created',
      entity: 'category',
      entityId: category.id,
      metadata: body,
      ipAddress: getRequestIp(req)
    }
  });

  res.status(201).json({ category });
});

productsRouter.patch('/categories/:id', authorize(Role.SUPER_ADMIN, Role.BUSINESS_OWNER, Role.STAFF), async (req: Request, res) => {
  const businessId = requireBusinessScope(req);
  const body = categorySchema.partial().parse(req.body);
  const categoryId = String(req.params.id);
  const category = await prisma.category.findFirst({ where: { id: categoryId, businessId } });

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  const updated = await prisma.category.update({
    where: { id: category.id },
    data: {
      ...body,
      slug: body.slug ? slugify(body.slug) : body.name ? slugify(body.name) : undefined
    }
  });

  res.json({ category: updated });
});

productsRouter.delete('/categories/:id', authorize(Role.SUPER_ADMIN, Role.BUSINESS_OWNER, Role.STAFF), async (req: Request, res) => {
  const businessId = requireBusinessScope(req);
  const category = await prisma.category.findFirst({ where: { id: String(req.params.id), businessId } });

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  await prisma.category.delete({ where: { id: category.id } });
  res.status(204).send();
});

productsRouter.get('/', async (req, res) => {
  const businessId = requireBusinessScope(req);
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;

  const where: Prisma.ProductWhereInput = {
    businessId,
    ...(categoryId ? { categoryId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { barcode: { contains: search, mode: 'insensitive' } }
          ]
        }
      : {})
  };

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  res.json({
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    products: products.map((product) => ({
      ...product,
      price: Number(product.price),
      costPrice: product.costPrice ? Number(product.costPrice) : null
    }))
  });
});

productsRouter.post('/', authorize(Role.SUPER_ADMIN, Role.BUSINESS_OWNER, Role.STAFF), async (req: Request, res) => {
  const businessId = requireBusinessScope(req);
  const body = productSchema.parse(req.body);

  const product = await prisma.product.create({
    data: {
      businessId,
      categoryId: body.categoryId ?? null,
      name: body.name,
      sku: body.sku,
      barcode: body.barcode ?? null,
      description: body.description,
      price: new Prisma.Decimal(body.price),
      costPrice: body.costPrice == null ? null : new Prisma.Decimal(body.costPrice),
      stock: body.stock,
      lowStockThreshold: body.lowStockThreshold,
      isActive: body.isActive
    }
  });

  await prisma.auditLog.create({
    data: {
      businessId,
      actorUserId: req.user?.id ?? null,
      action: 'product.created',
      entity: 'product',
      entityId: product.id,
      metadata: body,
      ipAddress: getRequestIp(req)
    }
  });

  res.status(201).json({
    product: {
      ...product,
      price: Number(product.price),
      costPrice: product.costPrice ? Number(product.costPrice) : null
    }
  });
});

productsRouter.patch('/:id', authorize(Role.SUPER_ADMIN, Role.BUSINESS_OWNER, Role.STAFF), async (req: Request, res) => {
  const businessId = requireBusinessScope(req);
  const body = productSchema.partial().parse(req.body);
  const product = await prisma.product.findFirst({ where: { id: String(req.params.id), businessId } });

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: {
      ...body,
      categoryId: body.categoryId === undefined ? undefined : body.categoryId,
      price: body.price === undefined ? undefined : new Prisma.Decimal(body.price),
      costPrice: body.costPrice === undefined ? undefined : body.costPrice == null ? null : new Prisma.Decimal(body.costPrice)
    }
  });

  res.json({
    product: {
      ...updated,
      price: Number(updated.price),
      costPrice: updated.costPrice ? Number(updated.costPrice) : null
    }
  });
});

productsRouter.patch('/:id/stock', authorize(Role.SUPER_ADMIN, Role.BUSINESS_OWNER, Role.STAFF), async (req: Request, res) => {
  const businessId = requireBusinessScope(req);
  const body = stockSchema.parse(req.body);
  const product = await prisma.product.findFirst({ where: { id: String(req.params.id), businessId } });

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const stock = body.mode === 'adjust' ? product.stock + body.stock : body.stock;
  if (stock < 0) {
    throw new ApiError(400, 'Stock cannot be negative');
  }

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: { stock }
  });

  res.json({ product: updated });
});

productsRouter.delete('/:id', authorize(Role.SUPER_ADMIN, Role.BUSINESS_OWNER), async (req: Request, res) => {
  const businessId = requireBusinessScope(req);
  const product = await prisma.product.findFirst({ where: { id: String(req.params.id), businessId } });

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  await prisma.product.update({ where: { id: product.id }, data: { isActive: false } });
  res.status(204).send();
});

productsRouter.get('/alerts/low-stock', async (req, res) => {
  const businessId = requireBusinessScope(req);
  const products = await prisma.product.findMany({
    where: { businessId, isActive: true },
    orderBy: { stock: 'asc' }
  });

  res.json({
    products: products.filter((product) => product.stock <= product.lowStockThreshold)
  });
});
