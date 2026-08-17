# Durtup Admin Portal

Dedicated standalone administration and operations portal for **[Durtup.shop](https://durtup.shop)**.

This repository contains exclusively the management dashboard and tools to control the entire `durtup.shop` platform, including catalog, inventory, orders, payments, sellers, staff, and enterprise features.

---

## Features

- **Dashboard & Analytics:** Real-time revenue tracking, order status breakdown, customer metrics, sales graphs, and low-stock alerts.
- **Product & Catalog Management:** Add, edit, bulk-update products, manage variants, images, video demonstrations, stock levels, and flash deals.
- **Orders & Returns Processing:** Full order status lifecycle management, batch order status saving, timeline audit, printable invoices, packing slips, shipping labels, and return request approvals with instant synchronization to customer accounts.
- **Categories & Brands:** Dynamic categorization, nested categories, and brand management.
- **Suppliers & Drop-shipping:** CJ Dropshipping sync, Mohasagor product catalog sync, and supplier integrations.
- **Financial Control & Wallets:** Seller commissions, user wallet adjustments, withdrawal requests, and payment gateway controls.
- **Staff & Seller Management:** Granular role-based access control (RBAC), staff tasks, seller onboarding & performance tracking.
- **Marketing & Visual CMS:** Bento grid homepage editor, promotional banners, coupon codes, and push notifications.
- **Enterprise Suite:** AI Studio, Theme Builder, Security Controls, and Real-time Activity Logs.
- **Installable PWA:** Install as a native-feeling desktop or mobile app.

---

## Tech Stack

- **Framework:** React 18, Vite, TypeScript
- **UI & Styling:** Tailwind CSS, Radix UI (Shadcn), Lucide React
- **Data & State Management:** TanStack React Query, Firebase Firestore & Realtime Sync, Supabase Client
- **Charts:** Recharts

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Ensure `.env` contains your Firebase and backend credentials:
```env
VITE_SITE_URL="https://www.durtup.shop"
VITE_FIREBASE_API_KEY="..."
VITE_FIREBASE_AUTH_DOMAIN="..."
VITE_FIREBASE_PROJECT_ID="..."
VITE_FIREBASE_STORAGE_BUCKET="..."
VITE_FIREBASE_MESSAGING_SENDER_ID="..."
VITE_FIREBASE_APP_ID="..."
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5174](http://localhost:5174) in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## Deployment (Vercel / Netlify / Cloudflare Pages)

- **Framework Preset:** Vite
- **Root Directory:** `./`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **SPA Routing:** Configured via `vercel.json` for seamless client-side routing.
