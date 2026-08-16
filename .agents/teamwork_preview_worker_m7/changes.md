# Summary of Changes - Milestone 7 Admin Pages & Integrations

## 1. Created `AdminReturns.tsx` (`/admin/returns`)
- Path: `src/pages/admin/AdminReturns.tsx`
- Registered route `/admin/returns` in `src/App.tsx` and `src/AdminApp.tsx`.
- Bound to `return_requests` table with joins to `orders`, `profiles`, and `sellers`.
- Features:
  - Overview KPI metrics (Total Returns, Pending Review, Approved Returns, Total Refunded Amount).
  - Status tab filters (`all`, `pending`, `approved`, `rejected`, `refunded`) and search filter.
  - Interactive table displaying Return ID, Order Number, Customer, Seller/Shop, Reason, Refund Amount, Status, and Date.
  - Resolution modal with photo attachments gallery & lightbox viewer, refund amount input, resolution notes textarea, and Approve/Reject/Refund actions updating `return_requests` status, `refund_amount`, `details`, `processed_at`, and `processed_by`.

## 2. Created `AdminWallet.tsx` (`/admin/wallet`)
- Path: `src/pages/admin/AdminWallet.tsx`
- Registered route `/admin/wallet` in `src/App.tsx` and `src/AdminApp.tsx`.
- Bound to `platform_wallets` and `wallet_transactions` tables.
- Features:
  - Master Platform Ledger Summary Cards for `commission`, `tax`, `payout`, and `reserve` wallets showing balances, total credited, and total debited.
  - User & Seller transaction ledger table with credit/debit indicators, categories, and account lookup.
  - Manual Balance Credit/Debit Adjustment modal inserting audit records into `wallet_transactions` and updating platform wallet balances.

## 3. Created `AdminFinance.tsx` (`/admin/finance`)
- Path: `src/pages/admin/AdminFinance.tsx`
- Registered route `/admin/finance` in `src/App.tsx` and `src/AdminApp.tsx`.
- Bound to `seller_payouts`, `seller_earnings`, and `platform_wallets`.
- Features:
  - Overview metrics (Pending Payouts, Total Paid Out, Platform Commission Retained, Tax Reserve Pool).
  - Vendor Payout Requests approval workflow: Table showing requested amount, commission deducted, net payable, payout method (Bank, bKash, Nagad), status, and date.
  - Payout review modal showing complete payment account details (bank account name/number, bKash, Nagad) with transaction reference input and Approve/Reject/Mark Paid actions.
  - Seller Earnings & Commission Deductions tab showing gross sales, commission rates, platform fee retained, and vendor net earnings.
  - Tax & VAT Liability Report tab with 15% VAT on commissions, 5% source tax (AIT) calculation, and CSV export.

## 4. Wired Support Ticketing (`AdminSellerSupport.tsx`, `SupportTicketList.tsx`, `SupportChatPanel.tsx`)
- Connected live data querying from `support_tickets` and `ticket_messages` (Customer & Seller helpdesk tickets) in addition to `seller_support_tickets` and `seller_support_messages`.
- Added realtime postgres changes subscriptions on `support_tickets` and `ticket_messages`.
- Updated `SupportChatPanel.tsx` to handle ticket message history, sending new messages, updating ticket status, and handling attachments.

## 5. Wired AI Review Moderation (`AdminReviews.tsx`)
- Bound `review_moderation_logs` table to `AdminReviews.tsx`.
- Displays AI sentiment score (`positive`, `neutral`, `negative`), toxicity score %, spam score %, auto-moderation action (`approved`, `flagged_for_review`, `auto_rejected`), and flagged keywords tags.
- Added AI Flagged tab filter and re-run AI moderation scan tool.

## 6. Layout Navigation (`AdminLayout.tsx`)
- Added sidebar navigation items for `Returns & Refunds`, `Wallets`, and `Finance & Payouts`.
