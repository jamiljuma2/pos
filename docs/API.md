# API Reference

Base path: `/api/v1`

## Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/staff`
- `GET /auth/staff`

## Business
- `GET /business/current`
- `PATCH /business/current`
- `GET /business/all`
- `POST /business/franchise`

## Products
- `GET /products`
- `POST /products`
- `PATCH /products/:id`
- `PATCH /products/:id/stock`
- `DELETE /products/:id`
- `GET /products/categories`
- `POST /products/categories`
- `PATCH /products/categories/:id`
- `DELETE /products/categories/:id`
- `GET /products/alerts/low-stock`

## Sales
- `POST /sales`
- `GET /sales`
- `GET /sales/export.csv`
- `GET /sales/:id/receipt`

## Payments
- `POST /payments/stk`
- `POST /payments/link`

## Reports
- `GET /reports/dashboard`
- `GET /reports/sales.csv`

## Webhooks
- `POST /webhooks/lipana`

## Notes
- All tenant-scoped requests require a bearer token.
- Business isolation is enforced through `business_id`-scoped queries.
- Refresh tokens are stored hashed and rotated on refresh.
