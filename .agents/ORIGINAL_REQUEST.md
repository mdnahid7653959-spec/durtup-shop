# Original User Request

## Initial Request — 2026-07-31T00:47:15Z

# Teamwork Project Prompt — Durtup Enterprise Marketplace Admin Panel

Transform the existing Durtup Admin Panel into a complete, production-ready enterprise-grade marketplace administration system comparable to Daraz, Alibaba, Amazon Marketplace, Shopee, and Lazada.

Working directory: C:\Users\nahid\.gemini\antigravity\scratch\instapic-mvp
Integrity mode: development

## Requirements

### R1. Enterprise Admin Panel Architecture & Complete Module Implementation
Implement a fully functional, production-ready enterprise administration system for the Durtup Marketplace covering all core marketplace operations without placeholder data, mock APIs, or fake statistics:
1. **Dashboard & Analytics:** Real-time revenue metrics (Total, Today, Yesterday, Monthly, Yearly, Gross, Net, Commission, Platform Profit), live order breakdowns (Pending, Processing, Packed, Shipped, Delivered, Cancelled, Returned, Refunded), customer/seller metrics, traffic, conversion rate, revenue charts, and system health.
2. **User & Seller Management:** Complete Buyer/Seller/Admin CRUD, RBAC permissions, user suspension/ban, wallet, coupons, addresses, activity/login logs. Seller approval workflow, KYC verification (NID, Passport, Trade License, TIN, Bank Accounts), commission settings, wallet withdrawal/settlement, seller score, and warnings.
3. **Product & Inventory Management:** Complete Product CRUD (Physical/Digital), approval workflow, bulk upload/edit/delete, import/export, image/video support, SKU, barcode, category/subcategory/brand management, variants, warranty, return policy, and SEO. Multi-warehouse support, stock transfer, purchase orders, supplier logs, and low-stock alerts.
4. **Orders, Payments & Shipping:** Full order lifecycle management (Pending through Delivered/Returned/Refunded), order timeline, dynamic invoices, packing slips, shipping labels. Payment tracking (bKash, Nagad, Rocket, Cards, Stripe, PayPal, SSLCommerz), refunds, chargebacks, commission/tax calculations. Shipping zones, delivery charges, courier tracking, delivery boys.
5. **Marketing, Content, Security & CMS:** Coupon system (Flash, Referral, First Order, Category, Seller), Campaign management (Flash Sale, Mega Sale, Eid, Black Friday), Banner management, Review AI moderation, Returns & Refunds workflow, Customer Support tickets/live chat, Buyer/Seller/Admin Wallets, Financial reports (Tax, VAT, Payouts), Push/Email/SMS notification engine, Security (RBAC, 2FA, Activity/Login logs, Rate limiting, Audit logs), CMS Homepage Builder, Blog, FAQ, Terms, Privacy, and Dynamic Pages.

### R2. Database Integrity & Real Persistence
- All database operations must execute against the production Supabase PostgreSQL backend (bbfusyiykxxrsnhqgzrh).
- Every CRUD operation (Create, Read, Update, Delete/Soft-Delete) must validate input and persist changes to database tables with proper foreign keys, indices, and audit logging.
- All metrics, charts, and reports must compute dynamically from live database records without dummy fallbacks.

### R3. Production Verification & Quality Assurance
- Zero console errors, zero TypeScript compilation errors, zero broken routes.
- Full client-side and server-side authorization enforcement for all admin actions.

## Acceptance Criteria

### Core Functionality & Persistence
- [ ] Every admin module (Dashboard, Users, Sellers, Products, Inventory, Orders, Payments, Shipping, Coupons, Campaigns, Banners, Categories, Reviews, Returns, Support, Wallet, Finance, Marketing, Analytics, Security, CMS) operates with live database persistence.
- [ ] Product creation, update, bulk actions, and deletion reflect immediately in the database and storefront.
- [ ] Order status updates update order timelines, generate PDF/printable invoices and shipping labels.
- [ ] Seller approval/KYC workflow updates seller status, verification documents, and wallet settings.

### Code Quality & Security
- [ ] Zero TypeScript or Vite build errors (npm run build passes cleanly).
- [ ] RBAC permission layer prevents unauthorized access on all admin routes and API calls.
- [ ] System operates without mock data, fake charts, or unresolved TODOs.
