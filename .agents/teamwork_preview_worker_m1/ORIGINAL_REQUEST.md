## 2026-07-31T00:54:09Z
You are a Worker subagent for Milestone 1: DB Schema, Dynamic RPC Analytics & RLS Security Hardening.
Your Working Directory is: C:\Users\nahid\.gemini\antigravity\scratch\instapic-mvp\.agents\teamwork_preview_worker_m1

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Objective:
Implement database schema expansions, KYC workflow fields, RLS hardening, dynamic analytics RPC stored procedures, and TypeScript type updates.

Detailed Steps:
1. Create a comprehensive SQL migration file in `supabase/migrations/` (e.g. `20260731000000_enterprise_marketplace_schema_and_analytics.sql`) that implements:
   - Missing Tables with proper PKs, FKs, defaults, indexes, and RLS enabled:
     * `order_timelines` (id, order_id FK to orders, status, notes, changed_by, created_at)
     * `return_requests` (id, order_id FK, user_id FK, seller_id FK, reason, details, status, refund_amount, images, processed_at, processed_by, created_at)
     * `seller_warnings` (id, seller_id FK, issued_by FK, reason, severity, status, created_at)
     * `warehouse_stock` (id, warehouse_id FK, product_id FK, variant_id FK, quantity, reserved_quantity, rack_location)
     * `stock_transfers` (id, transfer_number, source_warehouse_id FK, dest_warehouse_id FK, status, created_by, received_by, notes, created_at)
     * `suppliers` (id, name, contact_person, email, phone, address, tax_id, is_active, created_at)
     * `purchase_orders` (id, po_number, supplier_id FK, warehouse_id FK, total_amount, status, expected_date, created_by, created_at)
     * `campaign_products` (id, campaign_id FK, product_id FK, special_price, discount_percentage, stock_limit, sold_count, is_approved)
     * `support_tickets` (id, ticket_number, user_id FK, subject, category, priority, status, assigned_staff_id, created_at) (if not existing)
     * `ticket_messages` (id, ticket_id FK, sender_id FK, sender_type, message, attachments, created_at) (if not existing)
     * `review_moderation_logs` (id, review_id FK, ai_sentiment, toxicity_score, spam_score, auto_action, flagged_keywords, moderated_at)
     * `platform_wallets` (id, wallet_type, balance, total_credited, total_debited, currency, updated_at)
     * `courier_shipments` (id, consignment_id FK, courier_name, tracking_id, status, current_location, last_api_sync)
   - Add KYC workflow columns to `sellers` table:
     * `kyc_status` (TEXT DEFAULT 'pending_review'), `kyc_rejected_reason` (TEXT), `kyc_verified_at` (TIMESTAMPTZ), `kyc_verified_by` (UUID)
   - Implement the 8 dynamic analytics RPC functions:
     1. `get_admin_dashboard_revenue_stats()` -> Returns JSON or table with total_revenue, today_revenue, yesterday_revenue, monthly_revenue, yearly_revenue, gross_revenue, net_revenue, commission_revenue, platform_profit.
     2. `get_admin_dashboard_order_breakdown()` -> Returns JSON or table with counts and sums for pending, processing, packed, shipped, delivered, cancelled, returned, refunded.
     3. `get_admin_revenue_timeseries(_period text, _start_date timestamptz, _end_date timestamptz)` -> Returns aggregated dates, revenues, order counts.
     4. `get_admin_top_products(_limit int)` -> Returns top products by quantity sold & total revenue.
     5. `get_admin_top_sellers(_limit int)` -> Returns top sellers by total sales, orders, commission.
     6. `get_admin_financial_summary()` -> Returns payout totals, pending payouts, tax liability, VAT collected, platform balance.
     7. `get_admin_inventory_health_stats()` -> Returns low stock count, out of stock count, total valuation.
     8. `get_admin_conversion_metrics()` -> Returns visitor, cart, checkout, conversion rate stats.
   - Master Admin RLS override policies for all new and existing admin tables allowing full access to admin users (`is_admin()` or `has_role('admin')`).

2. Update `src/integrations/supabase/types.ts` to add TypeScript definitions for all new tables and RPC functions.

3. Run `npx tsc --noEmit` to verify zero TypeScript errors.

4. Produce a detailed `changes.md` and write a handoff report at `handoff.md`.

When finished, send a message to parent with build/test results and report path.
