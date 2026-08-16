import json

with open(r"C:\Users\nahid\.gemini\antigravity\scratch\instapic-mvp\.agents\teamwork_preview_explorer_m0_2\schema_summary.json", "r", encoding="utf-8") as f:
    data = json.load(f)

tables = data["tables_detail"]
policies = data["policies"]

# Group tables by domain
domains = {
    "1. Users, Profiles & RBAC": ["profiles", "user_roles", "addresses", "admin_credentials", "admin_roles", "admin_sessions", "admin_activity_logs", "staff_members", "staff_roles", "staff_permissions", "staff_departments", "staff_invitations", "staff_tasks", "staff_messages", "staff_audit_logs"],
    "2. Sellers & KYC": ["sellers", "seller_earnings", "seller_payouts", "seller_support_tickets", "seller_support_messages"],
    "3. Products, Categories, Brands & Variants": ["products", "product_variants", "product_images", "categories", "brands", "category_commissions", "recently_viewed", "wishlist"],
    "4. Inventory, Warehouses & Suppliers": ["warehouses", "inventory_logs", "inventory_alerts"],
    "5. Orders, Payments & Shipping": ["orders", "order_items", "payments", "consignments", "shipping_zones", "shipping_rates", "return_requests"],
    "6. Marketing, Coupons & Banners": ["coupons", "user_vouchers", "campaigns", "campaign_products", "cms_banners", "free_delivery_rules"],
    "7. Reviews & Moderation": ["reviews"],
    "8. Customer & Seller Support": ["support_tickets", "ticket_messages", "conversations", "messages"],
    "9. Wallets, Payouts & Finance": ["wallet_transactions", "seller_earnings", "seller_payouts", "loyalty_points", "loyalty_rewards", "loyalty_transactions"],
    "10. Audit Logs & Analytics": ["admin_activity_logs", "staff_audit_logs", "traffic_analytics", "conversion_events", "search_history"],
    "11. CMS & Customization": ["cms_banners", "cms_pages", "blog_posts", "theme_config", "layout_config", "custom_sections", "site_config", "site_settings", "studio_theme_versions", "theme_versions"],
    "12. Integration & Logistics": ["cj_settings", "cj_api_tokens", "cj_category_mappings", "notifications", "push_notifications", "push_tokens", "cart_items"]
}

report_output = []

for domain_name, tbl_list in domains.items():
    report_output.append(f"### {domain_name}")
    for t in tbl_list:
        if t in tables:
            cols = tables[t]
            pols = policies.get(t, [])
            c_str = ", ".join([f"{c['name']} ({c['type'].split('|')[0].strip()})" for c in cols])
            p_str = ", ".join([p["name"] for p in pols]) if pols else "NONE"
            report_output.append(f"- **Table `{t}`** ({len(cols)} columns, {len(pols)} RLS policies)")
            report_output.append(f"  - *Columns*: {c_str}")
            report_output.append(f"  - *Policies*: {p_str}")
        else:
            report_output.append(f"- **Table `{t}`**: MISSING FROM SCHEMA")
    report_output.append("")

with open(r"C:\Users\nahid\.gemini\antigravity\scratch\instapic-mvp\.agents\teamwork_preview_explorer_m0_2\domain_breakdown.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(report_output))

print("Domain breakdown written to domain_breakdown.txt")
