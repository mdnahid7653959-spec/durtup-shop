# Database & Backend Audit Report — Durtup Enterprise Marketplace Admin Panel

## Executive Summary
This audit provides a comprehensive inspection of the database schema, Supabase client integration, Row-Level Security (RLS) policies, RPC functions, database triggers, Edge Functions, and migration files for the Durtup Enterprise Marketplace Admin Panel (`bbfusyiykxxrsnhqgzrh`).

The audit evaluated existing assets against **Requirement R1** (*Enterprise Admin Panel Architecture & Complete Module Implementation*) and **Requirement R2** (*Database Integrity & Real Persistence*).

### Key Discovery Highlights:
1. **Supabase Client Setup**: Located at `src/integrations/supabase/client.ts` and `src/integrations/supabase/types.ts`. Configured with `createClient<Database>` and a custom fetch handler for `sb_publishable_` keys.
2. **Database Schema Volume**: 65 public tables, 1 public view (`products_public`), 8 RPC functions, 387 RLS policies, 75 migration SQL files, and 22 Supabase Edge Functions.
3. **Core Gaps Identified**:
   - **RPC Analytics Gap**: Zero (0) RPC functions exist for calculating dynamic revenue, net profit, commission breakdown, platform earnings, conversion rates, time-series charts, or live order status counts.
   - **Missing Tables**: 6 core marketplace tables are absent from the database schema: `return_requests` (or missing FKs), `campaign_products`, `support_tickets`, `ticket_messages`, `loyalty_transactions`, `traffic_analytics`, and `conversion_events`.
   - **KYC & Verification Gaps**: `sellers` table has basic string fields for document URLs, but lacks formal KYC document review workflow state (`kyc_status`, `kyc_rejected_reason`, `kyc_verified_at`, `kyc_verified_by`), as well as a `seller_warnings` log table.
   - **Order Lifecycle Gaps**: No discrete `order_timelines` / `order_status_history` table to store state transition history, notes, and changed-by metadata.
   - **Warehouse & Stock Gaps**: No multi-warehouse stock allocation table (`warehouse_stock`), no stock transfer workflow (`stock_transfers`), and no supplier / purchase order management (`suppliers`, `purchase_orders`).
   - **Platform Financial Ledger Gaps**: No platform-wide financial wallet/ledger table (`platform_wallets` / `platform_ledger`) to track aggregate gross volume, commission collected, payouts processed, and tax/VAT liability.

---

## 1. Supabase Client & Infrastructure Audit

### 1.1 Supabase Client Integration (`src/integrations/supabase/`)
- **`src/integrations/supabase/client.ts`**:
  - Uses `@supabase/supabase-js` `createClient<Database>`.
  - Configured with environment variables `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`.
  - Implements `createSupabaseFetch()` to handle new opaque Supabase API key formats (`sb_publishable_`) by injecting the `apikey` header and removing `Authorization: Bearer <key>` when key matches.
  - Enables local storage session persistence and automatic token refresh.

- **`src/integrations/supabase/types.ts`**:
  - Auto-generated TypeScript definitions (3,472 lines).
  - Explicitly details row, insert, and update definitions for 65 public tables.
  - Configured with PostgREST Version `"14.5"`.

### 1.2 Supabase Migrations (`supabase/migrations/`)
- **Total Migrations**: 75 `.sql` files spanning timestamps `20260111063052` to `20260718115255`.
- **Migration Coverage**:
  - Defines table schemas, initial indexes, and RLS policies across all domain areas.
  - Contains function definitions for auth helper checks (`has_role`, `is_admin`, `is_seller`, `is_staff`, `staff_has_permission`, `staff_effective_permissions`, `resolve_product_seller`).
  - Lacks SQL scripts for dynamic administrative analytical RPC queries.

### 1.3 Supabase Edge Functions (`supabase/functions/`)
22 Edge Functions implemented:
1. `admin-analytics`
2. `admin-auth`
3. `admin-banners`
4. `admin-db`
5. `admin-media`
6. `admin-orders`
7. `admin-products`
8. `admin-sellers`
9. `admin-theme`
10. `check-alerts`
11. `cj-products`
12. `mcp`
13. `payment-gateway`
14. `process-order`
15. `seller-media`
16. `seller-products`
17. `send-notification-email`
18. `send-push-notification`
19. `staff-activate`
20. `staff-admin`
21. `staff-products`
22. `staff-sellers`

---

## 2. Existing Database Schema Breakdown by Domain

### 2.1 Users, Profiles & RBAC
| Table Name | Columns | RLS Policies | Key Columns |
|---|---|---|---|
| `profiles` | 10 | 22 | `id`, `user_id`, `email`, `full_name`, `avatar_url`, `phone`, `role`, `is_active` |
| `user_roles` | 5 | 5 | `id`, `user_id`, `role` (`app_role` enum), `created_at`, `updated_at` |
| `addresses` | 15 | 7 | `id`, `user_id`, `full_name`, `phone`, `address_line1`, `address_line2`, `city`, `state`, `postal_code`, `country`, `is_default` |
| `admin_credentials` | 8 | 2 | `id`, `username`, `password_hash`, `display_name`, `is_active`, `last_login` |
| `admin_roles` | 8 | 3 | `id`, `role`, `name`, `permissions` (JSON), `is_system` |
| `admin_sessions` | 9 | 2 | `id`, `admin_id`, `session_token`, `expires_at`, `is_valid`, `ip_address`, `user_agent` |
| `admin_activity_logs` | 8 | 3 | `id`, `admin_id`, `action`, `entity_type`, `entity_id`, `details` (JSON), `ip_address` |
| `staff_members` | 16 | 3 | `id`, `user_id`, `email`, `full_name`, `department_id`, `role_id`, `status` (`staff_status`), `monthly_salary` |
| `staff_roles` | 9 | 2 | `id`, `name`, `department_id`, `default_permissions` (JSON), `dashboard_key` |
| `staff_permissions` | 5 | 2 | `id`, `staff_id`, `permission_key`, `granted_by` |
| `staff_departments` | 6 | 2 | `id`, `name`, `description`, `is_active` |
| `staff_invitations` | 6 | 1 | `id`, `staff_id`, `token_hash`, `expires_at`, `consumed_at` |
| `staff_tasks` | 11 | 3 | `id`, `staff_id`, `title`, `description`, `status` (`staff_task_status`), `due_date` |
| `staff_messages` | 7 | 3 | `id`, `from_admin_id`, `to_staff_id`, `subject`, `body`, `read_at` |
| `staff_audit_logs` | 10 | 2 | `id`, `staff_id`, `actor_user_id`, `action`, `target_type`, `target_id`, `metadata` |

### 2.2 Sellers & KYC Verification
| Table Name | Columns | RLS Policies | Key Columns |
|---|---|---|---|
| `sellers` | 53 | 12 | `id`, `user_id`, `shop_name`, `shop_slug`, `approval_status`, `is_verified`, `commission_rate`, `nid_number`, `trade_license_number`, `tin_number`, `bank_account` (JSON), `nid_front_image`, `nid_back_image`, `trade_license_image`, `warning_count`, `seller_score` |
| `seller_earnings` | 12 | 5 | `id`, `seller_id`, `order_id`, `gross_amount`, `commission_rate`, `commission_amount`, `net_amount`, `status` |
| `seller_payouts` | 16 | 6 | `id`, `seller_id`, `amount`, `net_amount`, `commission_deducted`, `payout_method`, `status`, `payment_details` (JSON) |
| `seller_support_tickets` | 11 | 3 | `id`, `seller_id`, `subject`, `status`, `assigned_staff_id`, `last_message_at` |
| `seller_support_messages` | 9 | 3 | `id`, `ticket_id`, `sender_id`, `sender_type`, `content`, `attachments` |

### 2.3 Products, Categories, Brands & Variants
| Table Name | Columns | RLS Policies | Key Columns |
|---|---|---|---|
| `products` | 49 | 17 | `id`, `seller_id`, `name`, `slug`, `sku`, `category_id`, `brand_id`, `regular_price`, `discount_price`, `cost_price`, `stock_quantity`, `status`, `approval_status`, `warranty_info`, `return_policy`, `is_featured`, `is_best_seller`, `tags` |
| `product_variants` | 12 | 6 | `id`, `product_id`, `name`, `sku`, `price`, `stock_quantity`, `color`, `size`, `storage`, `image_url` |
| `product_images` | 7 | 6 | `id`, `product_id`, `image_url`, `is_primary`, `sort_order`, `alt_text` |
| `categories` | 10 | 10 | `id`, `parent_id`, `name`, `slug`, `image_url`, `is_active`, `sort_order` |
| `brands` | 9 | 10 | `id`, `name`, `slug`, `logo_url`, `description`, `is_active` |
| `category_commissions` | 5 | 6 | `id`, `category_id`, `commission_rate` |
| `recently_viewed` | 5 | 6 | `id`, `user_id`, `product_id`, `view_count`, `viewed_at` |
| `wishlist` | 4 | 2 | `id`, `user_id`, `product_id`, `created_at` |
| `products_public` (VIEW) | - | - | View exposing active and published products with seller details |

### 2.4 Inventory, Warehouses & Logistics
| Table Name | Columns | RLS Policies | Key Columns |
|---|---|---|---|
| `warehouses` | 10 | 7 | `id`, `name`, `address`, `city`, `country`, `contact_phone`, `is_active` |
| `inventory_logs` | 11 | 10 | `id`, `product_id`, `variant_id`, `previous_quantity`, `new_quantity`, `quantity_change`, `change_type`, `created_by`, `notes` |
| `inventory_alerts` | 7 | 3 | `id`, `product_id`, `threshold`, `alert_type`, `is_active`, `triggered_at` |

### 2.5 Orders, Payments & Shipping
| Table Name | Columns | RLS Policies | Key Columns |
|---|---|---|---|
| `orders` | 19 | 14 | `id`, `order_number`, `user_id`, `seller_id`, `status`, `payment_status`, `payment_method`, `subtotal`, `tax_amount`, `shipping_cost`, `discount_amount`, `total`, `shipping_address` (JSON), `billing_address` (JSON), `courier_name`, `tracking_number` |
| `order_items` | 10 | 8 | `id`, `order_id`, `product_id`, `variant_id`, `product_name`, `variant_name`, `sku`, `price`, `quantity`, `total` |
| `payments` | 20 | 7 | `id`, `order_id`, `user_id`, `payment_method`, `payment_provider`, `amount`, `currency`, `status`, `transaction_id`, `provider_reference`, `provider_response` (JSON), `refund_amount` |
| `consignments` | 26 | 8 | `id`, `consignment_number`, `order_id`, `seller_id`, `courier`, `tracking_number`, `status`, `delivery_type`, `amount_to_collect`, `recipient_name`, `recipient_phone`, `recipient_address` |
| `shipping_zones` | 7 | 6 | `id`, `name`, `regions` (array), `areas` (array), `is_active` |
| `shipping_rates` | 16 | 6 | `id`, `zone_id`, `courier_name`, `name`, `min_weight`, `max_weight`, `base_rate`, `per_kg_rate`, `cod_charge`, `cod_percentage`, `estimated_days`, `is_active` |

### 2.6 Marketing, Coupons & Banners
| Table Name | Columns | RLS Policies | Key Columns |
|---|---|---|---|
| `coupons` | 13 | 7 | `id`, `code`, `description`, `discount_type`, `discount_value`, `min_order_amount`, `max_discount_amount`, `usage_limit`, `used_count`, `start_date`, `end_date`, `is_active` |
| `user_vouchers` | 9 | 5 | `id`, `user_id`, `code`, `discount_type`, `discount_value`, `is_used`, `used_at`, `expires_at` |
| `campaigns` | 16 | 4 | `id`, `name`, `slug`, `campaign_type`, `banner_image`, `discount_type`, `discount_value`, `starts_at`, `ends_at`, `is_active` |
| `cms_banners` | 15 | 5 | `id`, `title`, `subtitle`, `position`, `image_url`, `mobile_image_url`, `link_url`, `sort_order`, `is_active`, `starts_at`, `ends_at` |
| `free_delivery_rules` | 12 | 4 | `id`, `name`, `rule_type`, `min_order_amount`, `zone_id`, `start_date`, `end_date`, `is_active` |

### 2.7 Reviews, Support, Wallets & CMS
| Domain | Table Name | Cols | RLS | Key Columns |
|---|---|---|---|---|
| **Reviews** | `reviews` | 8 | 6 | `id`, `product_id`, `user_id`, `rating`, `title`, `comment`, `is_approved` |
| **Support** | `conversations` | 15 | 11 | `id`, `user_id`, `buyer_id`, `seller_id`, `subject`, `product_name`, `status` |
| **Support** | `messages` | 8 | 5 | `id`, `conversation_id`, `sender_id`, `sender_type`, `content`, `attachments` |
| **Wallets** | `wallet_transactions` | 10 | 4 | `id`, `user_id`, `type`, `amount`, `balance_after`, `category`, `description`, `reference_id` |
| **Loyalty** | `loyalty_points` | 11 | 4 | `id`, `user_id`, `points`, `lifetime_points`, `tier`, `transaction_type` |
| **Loyalty** | `loyalty_rewards` | 10 | 4 | `id`, `name`, `reward_type`, `points_cost`, `reward_value` (JSON), `is_active` |
| **CMS** | `cms_pages` | 10 | 4 | `id`, `title`, `slug`, `content`, `is_published`, `meta_title`, `meta_description` |
| **CMS** | `blog_posts` | 15 | 4 | `id`, `title`, `slug`, `content`, `excerpt`, `cover_image`, `is_published`, `author_id` |
| **CMS** | `theme_config` | 6 | 3 | `id`, `name`, `config` (JSON), `is_active` |
| **CMS** | `layout_config` | 8 | 3 | `id`, `page`, `page_type`, `config` (JSON), `sections` (JSON), `is_active` |
| **CMS** | `custom_sections` | 9 | 3 | `id`, `name`, `section_type`, `config` (JSON), `is_active`, `sort_order` |
| **CMS** | `site_config` | 6 | 4 | `id`, `key`, `value` (JSON), `description` |
| **CMS** | `site_settings` | 4 | 11 | `id`, `key`, `value` (JSON) |
| **CMS** | `studio_theme_versions` | 15 | 2 | `id`, `name`, `version_number`, `status`, `theme_config`, `layout_config`, `bento_config` |

---

## 3. Analysis of Existing RPC Functions & RLS Enforcement

### 3.1 Existing RPC Functions in Database
Only 8 stored procedures currently exist in the Database schema:
1. `current_staff_id()`: Returns the staff member ID associated with the calling user.
2. `has_role(_role app_role, _user_id uuid)`: Validates if `user_id` has a specific role in `user_roles`.
3. `is_admin()`: Boolean check verifying if `auth.uid()` possesses the `'admin'` role.
4. `is_seller_or_admin()`: Boolean check verifying if calling user is either seller or admin.
5. `is_staff()`: Boolean check verifying if calling user has an active staff record.
6. `resolve_product_seller(_product_seller_id uuid)`: Helper function resolving seller UUID for a product.
7. `staff_effective_permissions(_staff_id uuid)`: Computes combined role and custom permissions for staff.
8. `staff_has_permission(_key text, _user_id uuid)`: Checks whether user has permission key enabled.

### 3.2 Dynamic Analytics RPC Deficit (Requirement R1 / R2)
The dashboard and reporting modules require real-time SQL aggregation without client-side memory overload. **The following 8 critical RPC functions are currently MISSING**:
1. `get_admin_dashboard_revenue_stats()`: Computes total gross revenue, net revenue, commission revenue, platform profit, today revenue, yesterday revenue, monthly revenue, yearly revenue.
2. `get_admin_dashboard_order_breakdown()`: Computes counts and monetary sums for order statuses (`pending`, `processing`, `packed`, `shipped`, `delivered`, `cancelled`, `returned`, `refunded`).
3. `get_admin_revenue_timeseries(_period text, _start_date timestamptz, _end_date timestamptz)`: Groups revenue and order count by day, week, or month for dynamic analytics charts.
4. `get_admin_top_products(_limit int)`: Aggregates total sales, quantity sold, and revenue generated per product.
5. `get_admin_top_sellers(_limit int)`: Aggregates total sales, completed orders, and commission generated per seller.
6. `get_admin_financial_summary()`: Computes total payouts pending, payouts completed, tax liability, VAT collected, and admin wallet balance.
7. `get_admin_inventory_health_stats()`: Computes total low-stock SKUs, out-of-stock items, total stock valuation, and stock transfers in progress.
8. `get_admin_conversion_metrics()`: Computes visitor traffic, cart additions, checkout initiations, and completed order conversion percentage.

---

## 4. Comprehensive Missing Tables & Schema Expansion Requirements

| Domain | Missing Entity / Table | Mandatory Columns & Purpose | Milestone Target |
|---|---|---|---|
| **Orders** | `order_timelines` | `id`, `order_id`, `status`, `notes`, `changed_by`, `created_at`. Tracks full lifecycle audit trail with timestamps. | Milestone 1 / 5 |
| **Orders** | `return_requests` | `id`, `order_id`, `user_id`, `seller_id`, `reason`, `details`, `status`, `refund_amount`, `images`, `processed_at`, `processed_by`. Manages product returns and refund approvals. | Milestone 1 / 5 |
| **Sellers** | `seller_warnings` | `id`, `seller_id`, `issued_by`, `reason`, `severity`, `status`, `created_at`. Log table for seller penalty/score enforcement. | Milestone 1 / 3 |
| **Inventory** | `warehouse_stock` | `id`, `warehouse_id`, `product_id`, `variant_id`, `quantity`, `reserved_quantity`, `rack_location`. Multi-warehouse inventory split. | Milestone 1 / 4 |
| **Inventory** | `stock_transfers` | `id`, `transfer_number`, `source_warehouse_id`, `dest_warehouse_id`, `status`, `created_by`, `received_by`, `notes`, `created_at`. | Milestone 1 / 4 |
| **Inventory** | `suppliers` | `id`, `name`, `contact_person`, `email`, `phone`, `address`, `tax_id`, `is_active`. Supplier registry. | Milestone 1 / 4 |
| **Inventory** | `purchase_orders` | `id`, `po_number`, `supplier_id`, `warehouse_id`, `total_amount`, `status`, `expected_date`, `created_by`. | Milestone 1 / 4 |
| **Marketing** | `campaign_products` | `id`, `campaign_id`, `product_id`, `special_price`, `discount_percentage`, `stock_limit`, `sold_count`, `is_approved`. Campaign participation. | Milestone 1 / 6 |
| **Support** | `support_tickets` | `id`, `ticket_number`, `user_id`, `subject`, `category`, `priority`, `status`, `assigned_staff_id`, `created_at`. Customer helpdesk. | Milestone 1 / 6 |
| **Support** | `ticket_messages` | `id`, `ticket_id`, `sender_id`, `sender_type`, `message`, `attachments`, `created_at`. Ticket response log. | Milestone 1 / 6 |
| **Reviews** | `review_moderation_logs` | `id`, `review_id`, `ai_sentiment`, `toxicity_score`, `spam_score`, `auto_action`, `flagged_keywords`, `moderated_at`. AI review moderation engine. | Milestone 1 / 6 |
| **Finance** | `platform_wallets` | `id`, `wallet_type` (`commission`, `tax`, `payout`, `reserve`), `balance`, `total_credited`, `total_debited`, `currency`, `updated_at`. Master platform ledger. | Milestone 1 / 6 |
| **Logistics** | `courier_shipments` | `id`, `consignment_id`, `courier_name`, `tracking_id`, `status`, `current_location`, `last_api_sync`. Courier API integration tracking. | Milestone 1 / 5 |

---

## 5. Security & RLS Policy Gap Analysis

### 5.1 RLS Audit Status
- All 65 existing tables have Row Level Security enabled (`ENABLE ROW LEVEL SECURITY`).
- 387 total policies exist.

### 5.2 RLS Vulnerabilities & Coverage Gaps
1. **Public Read Leak on Admin Tables**:
   - `admin_roles` has policies allowing generic authenticated users to view role definitions in certain migrations.
   - `staff_roles` allows `Authenticated read staff roles`. Access must be restricted strictly to users with `is_admin()` or `is_staff()` privileges.
2. **Missing Admin Master Override Policies**:
   - Some tables (e.g. `wishlist`, `recently_viewed`, `user_vouchers`) only have user-level ownership policies (`user_id = auth.uid()`), preventing Super Admin from inspecting or managing data on behalf of users during customer support escalation.
3. **Seller Data Isolation**:
   - `inventory_logs` and `consignments` contain policies that must strictly validate `seller_id = get_seller_id(auth.uid())` to prevent cross-seller data exposure.

---

## 6. Recommendations & Implementation Roadmap for Subsequent Milestones

1. **Milestone 1 (Core Schema & Security Architecture)**:
   - Create SQL migration script adding missing tables (`order_timelines`, `return_requests`, `seller_warnings`, `warehouse_stock`, `stock_transfers`, `suppliers`, `purchase_orders`, `campaign_products`, `support_tickets`, `ticket_messages`, `review_moderation_logs`, `platform_wallets`, `courier_shipments`).
   - Create SQL migration script adding the 8 dynamic analytics RPC functions (`get_admin_dashboard_revenue_stats`, `get_admin_dashboard_order_breakdown`, `get_admin_revenue_timeseries`, etc.).
   - Harden RLS policies so Super Admin has master CRUD access while strict RBAC isolates customer and seller data.
   - Regenerate `src/integrations/supabase/types.ts`.

2. **Milestone 2 (Dashboard & Analytics)**:
   - Connect `AdminDashboard` page and analytics components to the new Supabase RPC functions (`supabase.rpc('get_admin_dashboard_revenue_stats')`, etc.).
   - Remove any client-side hardcoded fallback arrays or numbers.

3. **Milestones 3–6 (Module Implementations)**:
   - Wire all administrative pages (Users, Sellers, Products, Inventory, Orders, Payments, Shipping, Coupons, Campaigns, Banners, Reviews, Support, Wallets, Audit Logs, CMS) directly to live Supabase table queries with React Query hooks.

---
*Report compiled by Explorer Subagent for Milestone 0.*
