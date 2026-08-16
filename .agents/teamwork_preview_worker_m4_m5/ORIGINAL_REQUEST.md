## 2026-07-31T01:10:28Z
You are a Worker subagent for Milestone 4 (Seller KYC & Warnings UI) & Milestone 5 (Warehouse, Stock Transfers, Suppliers & POs UI).
Your Working Directory is: C:\Users\nahid\.gemini\antigravity\scratch\instapic-mvp\.agents\teamwork_preview_worker_m4_m5

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Objective:
Implement seller KYC workflow controls, seller warnings tracking, multi-warehouse stock allocations, stock transfers, suppliers, and purchase orders.

Detailed Steps:
1. **Milestone 4 (User & Seller Management with KYC Workflow)**:
   - Update `src/pages/admin/AdminSellers.tsx` (and related seller components):
     * Bind `kyc_status` (`pending_review`, `approved`, `rejected`), `kyc_rejected_reason`, `kyc_verified_at`, `kyc_verified_by` to seller approval action modals.
     * Display seller warnings log using `seller_warnings` table (issued reason, severity, status, creation timestamp). Allow admin to issue seller warnings.

2. **Milestone 5 (Warehouse, Stock Transfers, Suppliers & POs UI)**:
   - Update `src/pages/admin/AdminWarehouses.tsx` & `src/pages/admin/AdminInventory.tsx`:
     * Bind multi-warehouse stock allocations (`warehouse_stock` table).
     * Add Stock Transfers tab/manager (`stock_transfers` table).
     * Add Suppliers management tab/manager (`suppliers` table).
     * Add Purchase Orders manager (`purchase_orders` table).

3. Run `npx tsc --noEmit` to verify zero TypeScript errors.
4. Produce `changes.md` and `handoff.md`.

When finished, send a message to parent with build results and report path.
