# Changes Summary — Milestone 1 Security & Analytics Hardening

## Overview
Remediated RLS policy flaws, hardened RPC procedure authorization, added foreign key indexes, added customer/seller ticket policies, and removed synthetic multipliers in `supabase/migrations/20260731000000_enterprise_marketplace_schema_and_analytics.sql`.

## Files Modified
1. `supabase/migrations/20260731000000_enterprise_marketplace_schema_and_analytics.sql`
   - **RLS Policy Remediation**: Removed `OR auth.uid() IS NULL` from all 13 admin table RLS policies (`order_timelines`, `return_requests`, `seller_warnings`, `warehouse_stock`, `stock_transfers`, `suppliers`, `purchase_orders`, `campaign_products`, `support_tickets`, `ticket_messages`, `review_moderation_logs`, `platform_wallets`, `courier_shipments`). Updated all USING and WITH CHECK expressions to strictly check `auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin'))`.
   - **Customer & Seller RLS Policies**: Added SELECT and INSERT RLS policies on `support_tickets` and `ticket_messages` for authenticated buyers (`user_id = auth.uid()`) and sellers (`seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())` / `sender_id = auth.uid()`).
   - **Foreign Key Indexes**: Added explicit `CREATE INDEX IF NOT EXISTS` for:
     - `idx_support_tickets_user_id` on `public.support_tickets(user_id)`
     - `idx_support_tickets_assigned_staff_id` on `public.support_tickets(assigned_staff_id)`
     - `idx_ticket_messages_ticket_id` on `public.ticket_messages(ticket_id)`
     - `idx_ticket_messages_sender_id` on `public.ticket_messages(sender_id)`
   - **RPC Hardening**: Updated all 8 admin analytics RPC procedures (`get_admin_dashboard_revenue_stats`, `get_admin_dashboard_order_breakdown`, `get_admin_revenue_timeseries`, `get_admin_top_products`, `get_admin_top_sellers`, `get_admin_financial_summary`, `get_admin_inventory_health_stats`, `get_admin_conversion_metrics`):
     - Added explicit admin check at start of function body: `IF NOT (public.is_admin() OR public.has_role(auth.uid(), 'admin')) THEN RAISE EXCEPTION 'Access denied: Admin privileges required'; END IF;`
     - Revoked execution permissions from `anon`: `REVOKE EXECUTE ON FUNCTION public.<func_name>(...) FROM anon;`
     - Granted execution permissions strictly to `authenticated, service_role`: `GRANT EXECUTE ON FUNCTION public.<func_name>(...) TO authenticated, service_role;`
   - **Real Metrics Computation**: Removed synthetic multipliers (`GREATEST(_completed * 10, ...)` and `GREATEST(_completed * 2, ...)`) from `get_admin_conversion_metrics()`. Replaced with actual table SQL count queries against `public.profiles`, `public.cart_items`, and `public.orders`.

## Verification Results
- **TypeScript Compilation**: Ran `npx tsc --noEmit` — PASSED with 0 errors.
