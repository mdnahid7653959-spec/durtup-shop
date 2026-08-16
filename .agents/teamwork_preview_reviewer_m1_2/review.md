# Database & TypeScript Review Report — Milestone 1

**Reviewer Agent**: teamwork_preview_reviewer_m1_2  
**Date**: 2026-07-31  
**Target Files**:
- `supabase/migrations/20260731000000_enterprise_marketplace_schema_and_analytics.sql`
- `src/integrations/supabase/types.ts`

---

## Executive Summary

**Verdict**: **FAIL** (REQUEST_CHANGES)

While the database schema structures, foreign key definitions, and TypeScript type declarations pass static compilation (`npx tsc --noEmit` completed with 0 errors), **critical security vulnerabilities** were identified in the Row Level Security (RLS) policies and RPC stored procedure permissions. Specifically, unauthenticated (`anon`) users are granted full read/write access to sensitive enterprise marketplace tables and are permitted to execute `SECURITY DEFINER` administrative financial functions.

---

## Detailed Findings

### 1. [CRITICAL] RLS Policy Security Bypass (`auth.uid() IS NULL`)

- **Location**: `supabase/migrations/20260731000000_enterprise_marketplace_schema_and_analytics.sql`, lines 246–308
- **Description**:
  All 13 master admin RLS policies use the following clause pattern:
  ```sql
  CREATE POLICY "Admins full access on <table_name>" ON public.<table_name>
    FOR ALL USING (public.is_admin() OR public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL)
    WITH CHECK (public.is_admin() OR public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL);
  ```
- **Why this is a problem**:
  In Supabase PostgREST requests from unauthenticated clients (or using the anonymous public API key), `auth.uid()` evaluates to `NULL`. Consequently, `auth.uid() IS NULL` returns `TRUE` for **all unauthenticated requests**. This completely disables RLS protection for all 13 new tables, granting anonymous users unrestricted `SELECT`, `INSERT`, `UPDATE`, and `DELETE` access to sensitive tables including `platform_wallets`, `return_requests`, `seller_warnings`, `warehouse_stock`, `suppliers`, `purchase_orders`, `support_tickets`, `ticket_messages`, and `review_moderation_logs`.
- **Required Fix**:
  Remove `OR auth.uid() IS NULL` from all policies. Note that Supabase's `service_role` key automatically bypasses RLS at the database level and does not require `auth.uid() IS NULL`.

---

### 2. [CRITICAL] Unrestricted Public Access to Administrative `SECURITY DEFINER` RPC Functions

- **Location**: `supabase/migrations/20260731000000_enterprise_marketplace_schema_and_analytics.sql`, lines 364, 410, 454, 484, 516, 539, 561, 609
- **Description**:
  All 8 newly introduced admin RPC procedures (`get_admin_dashboard_revenue_stats`, `get_admin_dashboard_order_breakdown`, `get_admin_revenue_timeseries`, `get_admin_top_products`, `get_admin_top_sellers`, `get_admin_financial_summary`, `get_admin_inventory_health_stats`, `get_admin_conversion_metrics`) are granted to `anon` and `authenticated`:
  ```sql
  GRANT EXECUTE ON FUNCTION public.get_admin_<name>(...) TO authenticated, service_role, anon;
  ```
  Additionally, none of these functions contain internal role verification logic (e.g., checking `IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;`).
- **Why this is a problem**:
  Because these functions are declared with `SECURITY DEFINER`, any anonymous public user or low-privileged authenticated user can invoke `supabase.rpc('get_admin_financial_summary')` or `supabase.rpc('get_admin_dashboard_revenue_stats')` to extract confidential platform finances, total payouts, tax liabilities, wallet balances, and top seller revenues.
- **Required Fix**:
  1. Revoke `EXECUTE` privileges from `anon` on all `get_admin_*` RPC procedures.
  2. Add internal authorization checks at the beginning of each procedure:
     ```sql
     IF NOT (public.is_admin() OR public.has_role(auth.uid(), 'admin')) THEN
       RAISE EXCEPTION 'Access denied: Admin role required';
     END IF;
     ```

---

### 3. [MINOR] Missing Indexes on Foreign Keys and High-Frequency Query Columns

- **Location**: `supabase/migrations/20260731000000_enterprise_marketplace_schema_and_analytics.sql`
- **Description**:
  - `warehouse_stock(variant_id)`: missing FK index.
  - `ticket_messages(ticket_id)`: missing index on foreign key `ticket_id`, which will cause sequential scans during message thread rendering.
  - Secondary FK columns (`order_timelines.changed_by`, `return_requests.processed_by`, `seller_warnings.issued_by`, `stock_transfers.created_by/received_by`, `support_tickets.user_id/seller_id/order_id/assigned_staff_id`) lack indexes.
- **Required Fix**:
  Add `CREATE INDEX IF NOT EXISTS` for `ticket_messages(ticket_id)` and `warehouse_stock(variant_id)`.

---

## Verified Items

| Check Item | Status | Verification Method |
|---|---|---|
| Foreign key constraint definitions | **PASS** | Inspected foreign keys across all 13 tables |
| `npx tsc --noEmit` compilation | **PASS** | Executed in terminal — 0 errors found |
| TypeScript type coverage in `types.ts` | **PASS** | Verified table and function types match SQL definitions |
| SQL Injection vulnerability check | **PASS** | Confirmed all RPCs use parameterized queries and safe PL/pgSQL constructs |
| Division by zero in RPCs | **PASS** | Confirmed guard clauses in `get_admin_conversion_metrics` prevent DB errors |

---

## Recommendations & Next Steps

1. Update RLS policies in `supabase/migrations/20260731000000_enterprise_marketplace_schema_and_analytics.sql` to strip `OR auth.uid() IS NULL`.
2. Restrict `GRANT EXECUTE` permissions on `get_admin_*` RPC functions and inject admin role verification checks into procedure bodies.
3. Add missing index `idx_ticket_messages_ticket_id` on `public.ticket_messages(ticket_id)`.
4. Re-submit Milestone 1 for review once changes are applied.
