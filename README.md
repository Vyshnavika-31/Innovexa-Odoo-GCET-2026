# StockSense backend

A beginner-friendly Node.js/Express REST API for the StockSense PostgreSQL schema in the parent folder.

## Before starting

1. Install Node.js 18 or newer and PostgreSQL.
2. From the parent project folder, create the database and apply the files in order:

   ```sh
   createdb stocksense
   psql -d stocksense -f schema.sql
   psql -d stocksense -f seed.sql
   ```

3. In this `backend` folder, copy `.env.example` to `.env` and set `DATABASE_URL` and a long random `JWT_SECRET`.
4. Install dependencies and run the server:

   ```sh
   npm install
   npm run dev
   ```

5. Open `http://localhost:5000/api/health`. The response should be `{"status":"ok"}`.

The seed creates `admin@example.com` and `staff@example.com`; both use `ChangeMe123!`. Use these only on a local demo database and change/remove them before sharing the system.

## Authentication

Protected endpoints need this HTTP header:

```text
Authorization: Bearer <token>
```

Signup creates a `STAFF` user. Only the seeded or otherwise provisioned `ADMIN` can add products, categories, or warehouses. The database currently supports roles `ADMIN` and `STAFF`.

For password reset, configure SMTP values in `.env`. During local development only, if SMTP is not configured, the six-digit code is printed in the backend terminal. The API response does not reveal whether an email is registered.

## API overview

All request and response bodies use JSON. IDs are database IDs. Item quantities must be positive for receipts, deliveries, and transfers; adjustment counted quantities can be zero. Item units must exactly match the product's canonical unit.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Server health (public) |
| POST | `/api/auth/signup` | Create a staff account |
| POST | `/api/auth/login` | Log in and receive a JWT |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/forgot-password` | Request a reset code |
| POST | `/api/auth/reset-password` | Set a new password using email and code |
| GET, POST | `/api/products` | List/search products; admin creates |
| GET, PUT | `/api/products/:id` | Product detail/update (update is admin-only) |
| GET, POST | `/api/categories` | List categories; admin creates |
| GET, POST | `/api/warehouses` | List warehouses; admin creates warehouse and locations |
| GET, POST | `/api/receipts` | List or create a receipt draft |
| GET | `/api/receipts/:id` | Receipt details and lines |
| POST | `/api/receipts/:id/validate` | Add stock and ledger entries |
| POST | `/api/receipts/:id/cancel` | Cancel a draft |
| GET, POST | `/api/deliveries` | List or create a delivery draft |
| GET | `/api/deliveries/:id` | Delivery details and lines |
| POST | `/api/deliveries/:id/validate` | Subtract available stock and write ledger entries |
| POST | `/api/deliveries/:id/cancel` | Cancel a draft |
| GET, POST | `/api/transfers` | List or create a transfer draft |
| GET | `/api/transfers/:id` | Transfer details and lines |
| POST | `/api/transfers/:id/validate` | Move stock and write both ledger entries |
| POST | `/api/transfers/:id/cancel` | Cancel a draft |
| GET, POST | `/api/adjustments` | List or create a counted-stock adjustment draft |
| GET | `/api/adjustments/:id` | Adjustment details and lines |
| POST | `/api/adjustments/:id/validate` | Set stock to counted quantity and log the difference |
| POST | `/api/adjustments/:id/cancel` | Cancel a draft |
| GET | `/api/dashboard/summary` | Dashboard KPIs; optional `warehouseId`, `categoryId` |
| GET | `/api/ledger` | Stock history; optional `productId`, `locationId`, `referenceType`, `from`, `to`, `limit` |

Document statuses follow the current SQL README: `DRAFT`, `VALIDATED`, and `CANCELLED`. Dashboard pending counts include drafts. If the frontend needs `WAITING` or `READY`, agree on revised status rules and update the schema and API together.

## Request examples

Login:

```json
{"email":"admin@example.com","password":"ChangeMe123!"}
```

Create a receipt draft:

```json
{
  "warehouse_id": 1,
  "supplier_name": "Example Supplier",
  "items": [
    {"product_id": 1, "location_id": 1, "quantity": 12.5, "unit_of_measure": "kg"}
  ]
}
```

Create a transfer draft (no item location field; source/destination are on the transfer):

```json
{
  "source_location_id": 1,
  "destination_location_id": 2,
  "items": [
    {"product_id": 1, "quantity": 3, "unit_of_measure": "kg"}
  ]
}
```

Create an adjustment draft (the item `quantity` is the physical count, including zero):

```json
{
  "warehouse_id": 1,
  "reason": "Cycle count",
  "items": [
    {"product_id": 1, "location_id": 1, "quantity": 9, "unit_of_measure": "kg"}
  ]
}
```

## Important behavior

- Every validation runs document status changes, stock updates, and ledger inserts in one PostgreSQL transaction. An error rolls the whole operation back.
- Deliveries and transfers cannot reduce a location balance below zero.
- A transfer changes source and destination balances but not total company stock.
- Adjustment differences are calculated from database stock, not client-provided values. No ledger row is written when the count equals system stock.
- Location-to-document warehouse checks and product-unit checks are enforced by the API.
- The database cannot ensure stock equals the sum of ledger rows; keep all inventory-changing operations in these API transactions.

This is a class/demo backend starter. Before public deployment, add request rate limiting, stronger operational logging, migrations/backups, production secret management, and a deployment-specific security review.
