## 2026-07-31T01:10:26Z
You are a Worker subagent for Milestone 2 (Build Infra) & Milestone 3 (Dashboard & Analytics Dynamic RPC Integration).
Your Working Directory is: C:\Users\nahid\.gemini\antigravity\scratch\instapic-mvp\.agents\teamwork_preview_worker_m2_m3

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Objective:
Implement Milestone 2 package/config updates and Milestone 3 dynamic dashboard analytics RPC integration.

Detailed Steps:
1. **Milestone 2 (Build Infrastructure)**:
   - Update `package.json`:
     * Add `"build:admin": "vite build --config vite.admin.config.ts"` to `scripts`.
     * Update `"build"` script to `"tsc --noEmit && vite build"`.
   - Update `tsconfig.node.json`: Include `"vite.admin.config.ts"` in `include` array.

2. **Milestone 3 (Dashboard & Analytics RPC Integration)**:
   - In `src/pages/admin/AdminDashboard.tsx` and `src/pages/admin/AdminReports.tsx` (and any related analytics components under `src/components/admin/`):
     * Connect KPI summary cards and revenue charts directly to live Supabase RPC functions (`supabase.rpc('get_admin_dashboard_revenue_stats')`, `supabase.rpc('get_admin_dashboard_order_breakdown')`, `supabase.rpc('get_admin_revenue_timeseries')`, `supabase.rpc('get_admin_top_products')`, `supabase.rpc('get_admin_top_sellers')`, `supabase.rpc('get_admin_financial_summary')`, `supabase.rpc('get_admin_inventory_health_stats')`, `supabase.rpc('get_admin_conversion_metrics')`).
     * Ensure zero client-side dummy arrays or hardcoded fallback numbers.
     * Maintain automatic fallback handling for empty table states (e.g. 0 revenue, 0 orders).

3. Run `npm run build` and `npx tsc --noEmit` to verify zero TypeScript errors and clean build output.
4. Produce `changes.md` and `handoff.md`.

When finished, send a message to parent with build results and report path.
