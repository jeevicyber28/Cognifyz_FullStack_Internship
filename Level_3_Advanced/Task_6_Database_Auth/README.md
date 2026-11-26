# Task 6: Database Integration and User Authentication

A multi-user personal expense ledger backed by SQLite, bcrypt password hashing, and JWT cookie authentication with user-scoped authorization checks.

## Architecture
- **Database (`db/schema.sql`, `db/database.js`):** Normalized `users` and `expenses` tables with foreign keys, indexed queries, and `GROUP BY` category aggregation stored in `db/ledger.sqlite`.
- **Authentication (`routes/auth.js`, `middleware/auth.js`):** Registration, login, and session verification using `bcryptjs` password hashing and `jsonwebtoken` stored in `httpOnly` cookies.
- **Authorization (`routes/expenses.js`):** All `/api/expenses` endpoints require valid JWT credentials and enforce ownership checks (`403 Forbidden` if accessing another user's row).

## Demo Credentials
- `karthik@ledger.local` / `Ledger#2026`
- `priya@ledger.local` / `Ledger#2026`

## Run Locally
```bash
npm install
npm start
```
Open `http://localhost:3006`.
