# Durtup Enterprise Marketplace Admin Panel — Master Plan

## Project Overview
Transform the Durtup Admin Panel into a production-ready enterprise-grade marketplace administration system (Daraz/Alibaba/Amazon/Shopee/Lazada level) with live Supabase PostgreSQL backend persistence, full RBAC, zero mock data, zero console/TypeScript errors.

## Milestones & Decomposition

### Milestone 0: Comprehensive Codebase & Database Exploration
- Inspect existing React/Vite/Supabase structure (`src/`, `supabase/`, schema).
- Identify existing vs missing tables, views, RPCs, routes, components, and state management.
- Produce initial audit report detailing exact gaps for requirements R1, R2, R3.

### Milestone 1: Core Database & Backend Architecture (Supabase Schema & Security)
- Database schema expansion/verification: Users, Sellers, KYC, Products, Variants, Inventory, Warehouses, Orders, Payments, Shipping, Coupons, Campaigns, Banners, Categories, Reviews, Returns, Support Tickets, Wallets, Audit Logs, CMS.
- RLS Policies & RBAC: Admin roles (Super Admin, Manager, Finance, Support, Catalog), permission enforcement.
- DB functions/RPCs for dynamic analytics (Revenue, Profit, Commission, Live Order breakdowns, Tax/VAT).

### Milestone 2: Dashboard & Analytics Module
- Real-time revenue metrics (Total, Today, Yesterday, Monthly, Yearly, Gross, Net, Commission, Platform Profit).
- Live order breakdowns (Pending, Processing, Packed, Shipped, Delivered, Cancelled, Returned, Refunded).
- Customer/seller metrics, traffic, conversion rate, interactive revenue/sales charts, system health.
- Connect 100% to live Supabase database queries (zero hardcoded numbers).

### Milestone 3: User & Seller Management Module
- Buyer / Seller / Admin CRUD, user suspension/ban, wallet, addresses, activity/login logs.
- Seller approval workflow, KYC verification (NID, Passport, Trade License, TIN, Bank Accounts).
- Commission settings, wallet withdrawal/settlement, seller score & warning system.

### Milestone 4: Product & Inventory Management Module
- Product CRUD (Physical / Digital), approval workflow, bulk upload/edit/delete, import/export (CSV/Excel).
- Image & video media support, SKU, barcode generator, category/subcategory/brand management, variants, warranty, return policy, SEO metadata.
- Multi-warehouse support, stock transfer, purchase orders, supplier logs, low-stock alerts.

### Milestone 5: Orders, Payments & Shipping Module
- Full order lifecycle management (Pending -> Processing -> Packed -> Shipped -> Delivered -> Cancelled -> Returned -> Refunded).
- Order timeline, printable dynamic invoices, packing slips, shipping labels.
- Payment tracking (bKash, Nagad, Rocket, Cards, Stripe, PayPal, SSLCommerz), refunds, chargebacks, commission/tax logic.
- Shipping zones, delivery charges, courier integration tracking, delivery boy assignment.

### Milestone 6: Marketing, CMS, Customer Support, Wallet & Security Module
- Coupon system (Flash, Referral, First Order, Category, Seller).
- Campaign management (Flash Sale, Mega Sale, Eid, Black Friday), Banner management.
- Review AI moderation system, Returns & Refunds workflow, Customer Support tickets & live chat.
- Buyer/Seller/Admin Wallets, Financial reports (Tax, VAT, Payouts), Push/Email/SMS notification engine.
- RBAC, 2FA settings, Activity/Login logs, Rate limiting, Audit logs.
- CMS Homepage Builder, Blog, FAQ, Terms, Privacy, Dynamic Pages.

### Milestone 7: Enterprise Testing, Hardening & Audit Verification
- Build check (`npm run build`), TypeScript type checking (`tsc --noEmit`), lint checks.
- Verification of zero console errors, zero mock fallbacks, 100% live database persistence.
- Forensic Auditor integrity verification.

## Execution Strategy
- Iterative cycles with specialized subagents (Explorers, Workers, Reviewers, Challengers, Forensic Auditor).
- Safety timers & Heartbeat cron active.
- Self-succession after 16 spawns.
