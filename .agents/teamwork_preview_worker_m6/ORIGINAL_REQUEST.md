## 2026-07-31T01:14:11Z

<USER_REQUEST>
You are a Worker subagent for Milestone 6 (Orders, Payments & Shipping Module).
Your Working Directory is: C:\Users\nahid\.gemini\antigravity\scratch\instapic-mvp\.agents\teamwork_preview_worker_m6

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Objective:
Implement missing Payments admin route/page, order timeline audit tracking, dynamic invoices, packing slips, shipping labels, and courier tracking integration.

Detailed Steps:
1. **Create `AdminPayments.tsx` (`/admin/payments`)**:
   - Create `src/pages/admin/AdminPayments.tsx`.
   - Register route `/admin/payments` in `src/App.tsx` and `src/AdminApp.tsx`.
   - Add navigation link to admin sidebar command palette.
   - Implement live payments transaction ledger fetching from `payments` and `orders` tables:
     * Transaction ID, Order Number, Customer, Provider (bKash, Nagad, Rocket, SSLCommerz, Stripe, PayPal, COD), Amount, Currency, Payment Status (`pending`, `paid`, `failed`, `refunded`), Provider Reference, Response JSON viewer, and Refund action modal.
     * Summary cards: Total Transactions, Total Volume, Successful Payments, Refunded Volume.

2. **Enhance `AdminOrders.tsx` with Timelines & Printables**:
   - Bind `order_timelines` table to record status transitions (`pending` -> `processing` -> `shipped` -> `delivered` -> `cancelled` -> `refunded`), notes, and changed-by user.
   - Add **Printable Invoice** generator modal/view.
   - Add **Printable Packing Slip** generator modal/view.
   - Add **Printable Shipping Label** generator modal/view.
   - Bind `courier_shipments` and `consignments` tracking status.

3. Run `npx tsc --noEmit` to verify zero TypeScript compilation errors.
4. Produce `changes.md` and `handoff.md`.

When finished, send a message to parent with build/test results and report path.
</USER_REQUEST>
