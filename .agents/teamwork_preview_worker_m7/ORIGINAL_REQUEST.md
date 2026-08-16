## 2026-07-31T01:14:11Z
<USER_REQUEST>
You are a Worker subagent for Milestone 7 (Marketing, CMS, Customer Support, Wallets, Returns & Finance Module).
Your Working Directory is: C:\Users\nahid\.gemini\antigravity\scratch\instapic-mvp\.agents\teamwork_preview_worker_m7

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Objective:
Implement the 3 missing admin pages (`AdminReturns`, `AdminWallet`, `AdminFinance`), wire support tickets & ticket messages to `AdminSellerSupport`, and connect AI review moderation logs to `AdminReviews`.

Detailed Steps:
1. **Create `AdminReturns.tsx` (`/admin/returns`)**:
   - Create `src/pages/admin/AdminReturns.tsx`.
   - Register route `/admin/returns` in `src/App.tsx` and `src/AdminApp.tsx`.
   - Bind to `return_requests` table: Return ID, Order Number, Customer, Seller, Return Reason, Status (`pending`, `approved`, `rejected`, `refunded`), Refund Amount, Photo attachments viewer, Approve/Reject modal with resolution notes.

2. **Create `AdminWallet.tsx` (`/admin/wallet`)**:
   - Create `src/pages/admin/AdminWallet.tsx`.
   - Register route `/admin/wallet` in `src/App.tsx` and `src/AdminApp.tsx`.
   - Bind to `wallet_transactions` and `platform_wallets` tables: User & Seller wallet balance lookup, Manual balance credit/debit adjustment modal, master platform ledger summary (`commission`, `tax`, `payout`, `reserve`).

3. **Create `AdminFinance.tsx` (`/admin/finance`)**:
   - Create `src/pages/admin/AdminFinance.tsx`.
   - Register route `/admin/finance` in `src/App.tsx` and `src/AdminApp.tsx`.
   - Bind to `seller_payouts`, `seller_earnings`, and `platform_wallets`: Vendor payout request approval workflow, payout method details (Bank, bKash, Nagad), commission deductions, payout history, tax/VAT liability report.

4. **Wire Support Ticketing (`AdminSellerSupport.tsx`)**:
   - Connect live data querying from `support_tickets` and `ticket_messages` for customer and seller helpdesk ticketing.

5. **Wire AI Review Moderation (`AdminReviews.tsx`)**:
   - Bind `review_moderation_logs` table showing AI sentiment score, toxicity score, spam score, auto-moderation action, and flagged keywords.

6. Run `npx tsc --noEmit` to verify zero TypeScript errors.
7. Produce `changes.md` and `handoff.md`.

When finished, send a message to parent with build/test results and report path.
</USER_REQUEST>
