# StockSense Frontend

React + Vite + Tailwind CSS frontend for the StockSense Inventory Management System.

## 1. Requirements

- Node.js 20+ recommended
- StockSense backend running locally or on a server
- Git

## 2. Install

```bash
npm install
```

## 3. Configure backend URL

Create `.env` in the project root:

```env
VITE_API_URL=http://localhost:5000
```

Replace the URL with the backend team's actual Express API URL.

## 4. Run

```bash
npm run dev
```

Open the Vite URL shown in the terminal, normally:

```text
http://localhost:5173
```

## 5. Build

```bash
npm run build
```

## Backend API contract used by this frontend

The frontend expects these routes. If Person 2 used different route names, change only `src/services/api.js`.

- POST `/api/auth/signup`
- POST `/api/auth/login`
- POST `/api/auth/forgot-password`
- POST `/api/auth/reset-password`
- GET `/api/dashboard`
- GET/POST/PUT `/api/products`
- GET `/api/products/:id`
- GET/POST `/api/receipts`
- POST `/api/receipts/:id/validate`
- GET/POST `/api/deliveries`
- POST `/api/deliveries/:id/validate`
- GET/POST `/api/transfers`
- POST `/api/transfers/:id/validate`
- GET/POST `/api/adjustments`
- GET `/api/stock-ledger`
- GET/PUT `/api/settings`
- GET/PUT `/api/profile`

## Important architecture rule

This frontend never calculates or directly changes stock.

- Product creation sends product data to the backend.
- Receipt validation asks the backend to increase stock.
- Delivery validation asks the backend to decrease stock.
- Transfer validation asks the backend to move stock between locations.
- Adjustment submission asks the backend to calculate and record the adjustment.
- Move History reads the backend stock ledger.

If the backend returns slightly different JSON field names, update the page mapping or API service rather than putting inventory logic in the frontend.

## GitHub

After extracting this folder:

```bash
git init
git add .
git commit -m "Build StockSense frontend"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Do not commit a real `.env` file containing private credentials. Commit `.env.example` instead.
