# Project: Durtup Enterprise Marketplace Admin Panel

## Architecture
- **Frontend App**: React + TypeScript + Vite + Tailwind CSS + Lucide Icons + Radix UI components.
- **Dual Build Setup**: Main App (`index.html` -> `dist/`) & Standalone Admin (`admin.html` -> `dist-admin/`).
- **Backend / Persistence**: Supabase PostgreSQL (`bbfusyiykxxrsnhqgzrh`), Supabase Auth, Supabase Storage, Edge Functions.
- **State & Data Access**: TanStack React Query + `@supabase/supabase-js`.
- **Integrity**: Zero mock data, zero console errors, zero build errors, full RLS & RBAC.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 0 | Codebase & DB Discovery | Audit current codebase, routes, DB migrations/tables | none | DONE |
| 1 | DB Schema, RPC Analytics & Security | Create missing 13 DB tables, 8 dynamic analytics RPCs, KYC fields, RLS hardening | M0 | DONE |
| 2 | Build Infrastructure & Package Scripts | Add `build:admin`, integrate `tsc --noEmit` in `package.json`, update `tsconfig.node.json` | M0 | IN_PROGRESS |
| 3 | Dashboard & Analytics Module | Real-time revenue metrics, order breakdowns, conversion, dynamic RPC integration | M1 | PLANNED |
| 4 | User & Seller Management Module | Buyer/Seller/Admin CRUD, KYC workflow (`kyc_status`), Seller warnings, Wallets | M1 | PLANNED |
| 5 | Product & Inventory Management Module | Physical/Digital Product CRUD, Approval, Bulk, Variants, Multi-Warehouse, Stock Transfers, Suppliers, POs | M1 | PLANNED |
| 6 | Orders, Payments & Shipping Module | Full lifecycle order status, `order_timelines`, Invoices/Labels, Courier API, Payment Transactions UI (`AdminPayments`) | M1, M5 | PLANNED |
| 7 | Marketing, CMS, Support, Wallet & Returns Module | Coupons, Campaigns, Banners, RMA Returns UI (`AdminReturns`), Wallet UI (`AdminWallet`), Finance/Payouts UI (`AdminFinance`), Support Tickets, AI Review Moderation | M1 | PLANNED |
| 8 | Enterprise Verification & Forensic Audit | `npm run build`, `npm run build:admin`, Type check, E2E flow (`run_e2e_verification.js`), Forensic Integrity Audit | M1-M7 | PLANNED |

## Interface Contracts
### Supabase Client ↔ Admin Frontend
- Realtime subscriptions & React Query queries/mutations against Supabase DB tables.
- RLS enforced by Supabase Auth JWT and custom user role lookup (`is_admin()`, `has_role()`).
- Dynamic administrative analytics powered by custom RPC functions (`get_admin_dashboard_revenue_stats`, `get_admin_dashboard_order_breakdown`, `get_admin_revenue_timeseries`, etc.).

## Code Layout
- `src/pages/admin/`: Admin page routes (Dashboard, Users, Sellers, Products, Inventory, Orders, Payments, Shipping, Coupons, Campaigns, CMS, Security, Payments, Returns, Wallet, Finance, etc.).
- `src/components/admin/`: Reusable UI components & admin module components.
- `src/integrations/supabase/`: Supabase client configuration (`client.ts`) and generated types (`types.ts`).
- `src/lib/adminDb.ts`: Data access layer for administrative operations.
- `supabase/migrations/`: SQL migration files for DB tables, RLS policies, and RPC stored procedures.
