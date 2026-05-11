# PulsePOS

Multi-tenant POS SaaS built with Next.js, Node.js, PostgreSQL, Prisma, JWT auth, RBAC, and Lipana payment integration.

## Stack
- Frontend: Next.js App Router + TypeScript + Tailwind CSS
- Backend: Express + TypeScript
- Database: PostgreSQL on Neon
- ORM: Prisma
- Payments: Lipana STK Push + webhook sync

## Workspace Layout
- `apps/api` - API server
- `apps/web` - customer-facing app and cashier UI
- `apps/api/prisma/schema.prisma` - tenant-aware data model
- `docs/API.md` - API reference
- `docs/DEPLOYMENT_CHECKLIST.md` - Neon, Docker, and GitHub Actions deployment checklist

## Local Setup
1. Copy `.env.example` to `.env` and fill in your secrets.
2. Install dependencies with `npm install` from the repo root.
3. Generate Prisma Client with `npm run db:generate`.
4. Run migrations with `npm run db:migrate`.
5. Seed the platform super admin with `npm run db:seed`.
6. Start both apps with `npm run dev`.

## Environment
- `DATABASE_URL` should point to Neon.
- `DIRECT_URL` should point to the same Neon database using the direct host for Prisma migrations.
- `LIPANA_SECRET_KEY` and `LIPANA_WEBHOOK_SECRET` are required for payment flows.
- `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, and `SUPER_ADMIN_NAME` bootstrap the platform admin.

## Key Flows
- Business owners register a new business and become its first owner and cashier.
- Staff accounts are tenant-scoped and cannot cross business boundaries.
- POS sales reduce stock and create receipts.
- Lipana STK push payments are stored as pending, then updated by webhook events.

## Next Steps
- Configure Neon migrations and deploy the API and web app separately.
- Add a reverse proxy or platform-specific deployment config for production environments.
