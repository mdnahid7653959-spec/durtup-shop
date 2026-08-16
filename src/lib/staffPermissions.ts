export interface PermissionDef {
  key: string;
  label: string;
}
export interface PermissionGroup {
  group: string;
  permissions: PermissionDef[];
}

export const PERMISSION_CATALOG: PermissionGroup[] = [
  {
    group: "Sellers",
    permissions: [
      { key: "sellers.view", label: "View sellers" },
      { key: "sellers.approve", label: "Approve seller applications" },
      { key: "sellers.suspend", label: "Suspend / activate sellers" },
    ],
  },
  {
    group: "Products",
    permissions: [
      { key: "products.view", label: "View products" },
      { key: "products.edit", label: "Edit products" },
      { key: "products.approve", label: "Approve products" },
      { key: "categories.manage", label: "Manage categories" },
    ],
  },
  {
    group: "Orders & Delivery",
    permissions: [
      { key: "orders.view", label: "View orders" },
      { key: "orders.update_status", label: "Update order status" },
      { key: "delivery.assign", label: "Assign delivery" },
      { key: "consignments.view", label: "View consignments" },
    ],
  },
  {
    group: "Finance",
    permissions: [
      { key: "finance.view_reports", label: "View finance reports" },
      { key: "finance.process_payouts", label: "Process payouts" },
      { key: "commissions.manage", label: "Manage commissions" },
    ],
  },
  {
    group: "Marketing",
    permissions: [
      { key: "marketing.campaigns", label: "Manage campaigns" },
      { key: "marketing.coupons", label: "Manage coupons" },
      { key: "marketing.banners", label: "Manage banners" },
    ],
  },
  {
    group: "Support",
    permissions: [
      { key: "support.tickets", label: "Handle support tickets" },
      { key: "support.messages", label: "Reply to customer messages" },
    ],
  },
  {
    group: "Analytics",
    permissions: [
      { key: "analytics.view", label: "View analytics" },
    ],
  },
  {
    group: "Workspace",
    permissions: [
      { key: "tasks.view", label: "View own tasks" },
      { key: "messages.view", label: "View admin messages" },
    ],
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_CATALOG.flatMap((g) => g.permissions.map((p) => p.key));

export const DASHBOARD_KEYS = [
  { key: "seller", label: "Seller Center" },
  { key: "product", label: "Product Center" },
  { key: "finance", label: "Finance Center" },
  { key: "marketing", label: "Marketing Center" },
  { key: "support", label: "Support Center" },
  { key: "delivery", label: "Delivery Center" },
  { key: "general", label: "General" },
];
