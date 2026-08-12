# SaaS POS Backend

Commercial multi-tenant POS backend foundation for retail, restaurant, and hybrid businesses. The first target countries are Sri Lanka (`LK`, `LKR`, `Asia/Colombo`) and the United Kingdom (`GB`, `GBP`, `Europe/London`), configured through country records instead of hardcoded business logic.

## Stack

Node.js LTS, NestJS, TypeScript strict mode, PostgreSQL, Prisma, Socket.IO gateway readiness, JWT access tokens, rotating refresh tokens, Argon2, Swagger, Jest, Docker, ESLint, and Prettier.

## Local Setup

1. Copy `.env.example` to `.env` and replace secrets.
2. Start PostgreSQL: `docker compose up -d postgres`.
3. Install dependencies: `npm install`.
4. Generate Prisma Client: `npm run prisma:generate`.
5. Create/apply migrations: `npm run prisma:migrate:dev`.
6. Seed development data: `npm run seed`.
7. Start API: `npm run start:dev`.

Swagger is available at `http://localhost:3000/api/docs` when `SWAGGER_ENABLED=true`.

## Environment

Required variables: `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`, `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`, `APP_NAME`, and `APP_URL`.

Optional development super-admin variables: `DEV_SUPER_ADMIN_EMAIL`, `DEV_SUPER_ADMIN_PASSWORD`. The bootstrap API `POST /api/v1/platform/auth/create-super-admin` is disabled unless `PLATFORM_BOOTSTRAP_ENABLED=true`.

## Authentication Flow

Owners register through `POST /api/v1/auth/register-business`. The transaction creates the user, business, first branch, owner membership, branch assignment, default trial subscription, and audit log. Login returns a short-lived access token and a hashed, stored refresh token. Refresh tokens rotate on every use; reuse of a revoked token revokes the token family.

Users can belong to several businesses. Use `GET /api/v1/me/businesses`, then `POST /api/v1/session/select-business`, then optionally `POST /api/v1/session/select-branch`. Tenant claims are derived from verified memberships and branch assignments only.

## POS Module Endpoints

The next foundation phase includes tenant-scoped APIs for:

- `GET|POST|PATCH /api/v1/categories`
- `GET|POST|PATCH /api/v1/products`
- `GET|POST|PATCH /api/v1/customers`
- `GET|POST|PATCH /api/v1/suppliers`
- `GET /api/v1/inventory/movements`
- `POST /api/v1/inventory/adjustments`
- `GET|POST /api/v1/orders`
- `GET /api/v1/orders/:id`
- `GET|POST /api/v1/payments`
- `GET|POST|PATCH /api/v1/restaurant/tables`
- `GET|POST /api/v1/kot`
- `PATCH /api/v1/kot/:id/status`

All protected POS endpoints require a tenant-scoped access token. Branch-scoped endpoints require `POST /api/v1/session/select-branch` first.

## Platform Admin Endpoints

Super-admin/support endpoints live under `/api/v1/platform`:

- `POST /platform/auth/create-super-admin` when bootstrap is explicitly enabled
- `GET /platform/businesses`
- `GET /platform/businesses/:id`
- `POST /platform/businesses/:id/suspend`
- `POST /platform/businesses/:id/reactivate`
- `GET /platform/users`
- `PATCH /platform/users/:id`
- `GET /platform/subscription-plans`
- `POST /platform/subscription-plans`
- `PATCH /platform/subscription-plans/:id`
- `GET /platform/countries`
- `PATCH /platform/countries/:id`
- `GET /platform/audit-logs`

## Multi-Tenant Model

Tenant-owned records use `businessId`; branch-owned records also use `branchId`. Controllers do not accept unrestricted tenant IDs for protected tenant actions. Services resolve tenant context from authenticated token claims and validate membership before access.

## Security Decisions

Passwords use Argon2. Refresh and invitation tokens are stored as SHA-256 hashes only. API responses exclude password and token hashes. Audit logging scrubs known secret fields. Helmet, CORS allowlists, validation pipe hardening, throttling, JWT guards, permission guards, and tenant helpers are configured.

## Commands

- `npm run start:dev`
- `npm run build`
- `npm run start:prod`
- `npm run lint`
- `npm run format`
- `npm run test`
- `npm run test:e2e`
- `npm run prisma:generate`
- `npm run prisma:migrate:dev`
- `npm run prisma:migrate:deploy`
- `npm run prisma:studio`
- `npm run seed`

## Deployment Notes

Use a Linux VPS with Docker or a Node process manager behind a TLS reverse proxy. Keep PostgreSQL private, run `npm run prisma:migrate:deploy` during deployment, rotate JWT secrets through environment management, and back up PostgreSQL with scheduled `pg_dump` plus volume snapshots.

## Known Limitations

Purchases, kitchen display, and reporting modules are placeholders. Email delivery is abstracted by returning a development invitation URL. Password reset and email verification currently have token-structure placeholders in the architecture but no delivery flow.

## Next Phases

Implement product/catalog, immutable stock movements, order/payment/KOT transaction flows, receipt/invoice templates by country, kitchen display Socket.IO rooms, and report projections.
