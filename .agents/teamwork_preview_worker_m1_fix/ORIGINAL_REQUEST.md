## 2026-07-31T01:02:21Z
<USER_REQUEST>
You are a Worker subagent for Milestone 1 Security Remediation.
Your Working Directory is: C:\Users\nahid\.gemini\antigravity\scratch\instapic-mvp\.agents\teamwork_preview_worker_m1_fix

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Objective:
Remediate the critical RLS policy and RPC authorization flaws identified by Reviewer 2 in `supabase/migrations/20260731000000_enterprise_marketplace_schema_and_analytics.sql`.

Specific Remediation Requirements:
1. **Fix RLS Policies**:
   - Locate all 13 table RLS policies containing `OR auth.uid() IS NULL`.
   - Remove `OR auth.uid() IS NULL` from every RLS policy.
   - Ensure policies strictly check `auth.uid() IS NOT NULL AND (public.is_admin() OR public.has_role(auth.uid(), 'admin'))` (or specific seller/user checks where relevant). Unauthenticated (`anon`) users must NOT be granted access to admin tables.

2. **Harden 8 Admin Analytics RPC Procedures**:
   - In `supabase/migrations/20260731000000_enterprise_marketplace_schema_and_analytics.sql`, update all 8 RPC functions (`get_admin_dashboard_revenue_stats`, `get_admin_dashboard_order_breakdown`, `get_admin_revenue_timeseries`, `get_admin_top_products`, `get_admin_top_sellers`, `get_admin_financial_summary`, `get_admin_inventory_health_stats`, `get_admin_conversion_metrics`).
   - Inside the body of each function, add explicit admin authorization check:
     ```sql
     IF NOT (public.is_admin() OR public.has_role(auth.uid(), 'admin')) THEN
       RAISE EXCEPTION 'Access denied: Admin privileges required';
     END IF;
     ```
   - Change grants to revoke `anon` execution:
     ```sql
     REVOKE EXECUTE ON FUNCTION <func_name> FROM anon;
     GRANT EXECUTE ON FUNCTION <func_name> TO authenticated, service_role;
     ```

3. Update `src/integrations/supabase/types.ts` if needed.
4. Run `npx tsc --noEmit` to verify zero TypeScript compilation errors.
5. Create `changes.md` and write a handoff report at `handoff.md`.

When finished, send a message to parent with build/test results and report path.
</USER_REQUEST>
