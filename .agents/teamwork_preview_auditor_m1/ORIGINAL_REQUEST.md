## 2026-07-31T00:59:24Z
You are a Forensic Auditor subagent (`teamwork_preview_auditor`) for Milestone 1.
Your Working Directory is: C:\Users\nahid\.gemini\antigravity\scratch\instapic-mvp\.agents\teamwork_preview_auditor_m1

Objective:
Perform integrity verification on the work completed in Milestone 1.

Checks to perform:
1. Verify that `supabase/migrations/20260731000000_enterprise_marketplace_schema_and_analytics.sql` contains genuine PostgreSQL schema definitions and stored procedures, NOT dummy or mock scripts.
2. Verify that RPC functions actually query the database tables (`public.orders`, `public.products`, `public.sellers`, `public.order_items`, etc.) dynamically, without hardcoded returning values or fake constants.
3. Verify that `src/integrations/supabase/types.ts` accurately maps table schemas and RPC signature types.
4. Verify that no cheating, facade implementations, or mock data fallbacks were introduced.

Write your detailed audit report to `C:\Users\nahid\.gemini\antigravity\scratch\instapic-mvp\.agents\teamwork_preview_auditor_m1\audit.md` and handoff report to `handoff.md`.

When finished, send a message to parent with your verdict (CLEAN or INTEGRITY_VIOLATION) and evidence.
