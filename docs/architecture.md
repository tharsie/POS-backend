# Architecture

## Module Boundaries

The backend is a modular monolith. Controllers receive validated requests and call services. Services own business logic and Prisma access. Shared guards, decorators, filters, interceptors, middleware, and tenant utilities live under `src/common`.

Implemented foundation modules: config, database, health, auth, users, businesses, branches, permissions, invitations, subscriptions, countries, and audit logs. POS modules for products, inventory, orders, payments, restaurant, kitchen, KOT, and reports are placeholders.

## Tenant Isolation

Each customer business is a tenant. Shared PostgreSQL tables use `businessId` for tenant-owned data and `branchId` for branch-scoped data. Frontend-supplied tenant identifiers are not trusted for protected tenant operations. Active `businessId`, `businessMemberId`, `businessRole`, and optional `branchId` are issued only after validating real memberships.

## User And Membership Model

`User` is global and has no permanent `businessId`. `BusinessMember` connects users to businesses with a business role and status. `BranchMember` grants a business member access to specific branches. This allows one user to work in multiple businesses with different roles.

## Authentication Flow

Registration creates the owner, tenant, branch, owner membership, branch assignment, default subscription, and audit log in one transaction. Login validates Argon2 password hashes and issues JWT access plus refresh tokens. `/me/businesses` lists active memberships. Session selection endpoints mint tenant-scoped access tokens after membership validation.

## Refresh Token Flow

Refresh tokens are random high-entropy values. Only SHA-256 hashes are stored. Refreshing creates a replacement token and revokes the old token. If a revoked token is used again, the token family is revoked to contain reuse.

## Permission Model

Role names are not used directly as authorization checks. `@RequirePermissions()` declares permission codes, and `PermissionsGuard` evaluates the active business role against default role-permission mappings. Owner receives all business permissions.

## Country Configuration

Country-specific currency, timezone, date, number, and tax-inclusive defaults live in `CountryConfig`. Registration copies the selected country defaults to the business and branch. Core business logic should read configuration instead of hardcoding Sri Lankan or UK behavior.

## Future Order And KOT Transaction Flow

Order creation, payment recording, stock movements, and KOT creation should run in one database transaction. Stock should be represented through immutable `StockMovement` records such as purchase, sale, return, adjustment, wastage, and transfer movement types. Future Socket.IO rooms should use `business:{businessId}`, `branch:{branchId}`, `branch:{branchId}:kitchen`, `branch:{branchId}:station:{stationId}`, and `user:{userId}`.
