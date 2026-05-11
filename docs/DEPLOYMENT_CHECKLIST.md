# Deployment Checklist

Use this checklist to deploy PulsePOS safely with Neon, Docker, and GitHub Actions.

## 1. Pre-Deployment Readiness

- [ ] Confirm `main` is clean and pushed.
- [ ] Confirm CI is green on latest commit.
- [ ] Confirm local build passes:
  - [ ] `npm install`
  - [ ] `npm run db:generate`
  - [ ] `npm run build`
- [ ] Confirm `.env` is not committed (`.gitignore` excludes it).
- [ ] Confirm `DATABASE_URL` and `DIRECT_URL` are set for Neon.

## 2. Neon Checklist

### 2.1 Project and Branch
- [ ] Confirm Neon project exists.
- [ ] Confirm target branch/database for production (usually `main` + `neondb`).
- [ ] Confirm branch protection/permissions for production changes.

### 2.2 Connection Strings
- [ ] Set runtime pooled URL as `DATABASE_URL`.
- [ ] Set direct URL as `DIRECT_URL` for Prisma migrations.
- [ ] Ensure both use SSL:
  - [ ] `sslmode=require`
  - [ ] `channel_binding=require` (if required by your Neon endpoint)

### 2.3 Migration and Seed
- [ ] Run production migration command from release environment:
  - [ ] `npm run prisma:migrate --workspace @pos/api -- --name <migration_name>` (for controlled migration creation)
  - [ ] Or `prisma migrate deploy` in a release pipeline when migrations are pre-committed.
- [ ] Confirm migration table is updated in Neon.
- [ ] Seed super admin if needed:
  - [ ] `npm run db:seed`
  - [ ] Validate `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `SUPER_ADMIN_NAME` are set securely.

### 2.4 Data Safety
- [ ] Ensure automated backups / point-in-time recovery are enabled in Neon.
- [ ] Validate restore process in a non-production branch.

## 3. Runtime Secrets Checklist

Set secrets in your deployment platform (not in repository files):

- [ ] `NODE_ENV=production`
- [ ] `PORT=4000` (or platform-provided)
- [ ] `API_ORIGIN`
- [ ] `WEB_ORIGIN`
- [ ] `DATABASE_URL`
- [ ] `DIRECT_URL`
- [ ] `JWT_ACCESS_SECRET` (strong random, minimum 32 chars)
- [ ] `JWT_REFRESH_SECRET` (strong random, minimum 32 chars)
- [ ] `JWT_ACCESS_EXPIRES_IN`
- [ ] `JWT_REFRESH_EXPIRES_IN`
- [ ] `BCRYPT_ROUNDS`
- [ ] `LIPANA_BASE_URL`
- [ ] `LIPANA_SECRET_KEY`
- [ ] `LIPANA_WEBHOOK_SECRET`
- [ ] `LIPANA_CALLBACK_URL`
- [ ] `SUPER_ADMIN_EMAIL`
- [ ] `SUPER_ADMIN_PASSWORD`
- [ ] `SUPER_ADMIN_NAME`
- [ ] `NEXT_PUBLIC_API_URL` (frontend)

## 4. Docker Checklist

### 4.1 Build
- [ ] Build API image:
  - [ ] `docker build -f apps/api/Dockerfile -t pulsepos-api:latest .`
- [ ] Build Web image:
  - [ ] `docker build -f apps/web/Dockerfile -t pulsepos-web:latest .`
- [ ] Verify image size and startup logs are healthy.

### 4.2 Compose (optional for single-host deployment)
- [ ] Ensure `docker-compose.yml` uses environment-provided `DATABASE_URL` and `DIRECT_URL`.
- [ ] Ensure no local Postgres dependency is required for production compose.
- [ ] Run config validation:
  - [ ] `docker compose -f docker-compose.yml config`

### 4.3 Run
- [ ] Start API and Web containers with production secrets.
- [ ] Verify API health endpoint:
  - [ ] `GET /health`
- [ ] Verify web app loads and can call API.

## 5. GitHub Actions Checklist

Current workflow file: `.github/workflows/ci.yml`.

### 5.1 Required Repo Secrets (for CD extension)
- [ ] `DATABASE_URL` (if workflow needs runtime DB access)
- [ ] `DIRECT_URL` (for migration deploy jobs)
- [ ] Container registry credentials (if publishing images)
- [ ] Deployment platform tokens/keys

### 5.2 CI Hardening
- [ ] Keep `build` job running on push + pull request.
- [ ] Add explicit `npm run lint` step (if desired).
- [ ] Add Prisma migration check step for PRs.

### 5.3 CD (Recommended Next Step)
- [ ] Add separate deploy workflow triggered by tags or protected `main`.
- [ ] Add job order:
  1. [ ] Build artifacts/images
  2. [ ] Run `prisma migrate deploy` against production Neon
  3. [ ] Deploy API
  4. [ ] Deploy Web
  5. [ ] Run post-deploy smoke tests

## 6. Post-Deployment Validation

- [ ] `GET /health` returns `ok: true`.
- [ ] Register/Login works end-to-end.
- [ ] POS sale flow creates transaction and updates stock.
- [ ] Lipana STK push request is created and persisted.
- [ ] Lipana webhook updates payment status correctly.
- [ ] Reports and CSV export work.
- [ ] Role-based access works for Super Admin / Business Owner / Staff.

## 7. Observability and Operations

- [ ] Ensure structured logs are collected and retained.
- [ ] Set alerting for API 5xx error rate, restart loops, and DB connectivity failures.
- [ ] Monitor Neon connection usage and query latency.
- [ ] Define incident response contacts and rollback owner.

## 8. Rollback Plan

- [ ] Keep previous API/Web images available.
- [ ] Keep migration rollback strategy documented (forward-fix preferred for Prisma production incidents).
- [ ] Validate ability to redeploy previous release quickly.
- [ ] Validate database restore path in Neon if needed.

## 9. Sign-Off

- [ ] Engineering sign-off
- [ ] Data/DB sign-off
- [ ] Product/QA sign-off
- [ ] Production deployment approved
