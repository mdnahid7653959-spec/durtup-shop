export type AdminRole = "Super Admin" | "Admin" | "Manager" | "Finance" | "Marketing" | "Warehouse" | "Support";

export type PermissionAction =
  | "dashboard:view"
  | "products:read" | "products:create" | "products:edit" | "products:delete"
  | "categories:manage" | "brands:manage"
  | "inventory:view" | "inventory:edit" | "warehouses:manage"
  | "orders:read" | "orders:update_status" | "orders:cancel" | "orders:forward_supplier"
  | "payments:view" | "payments:process_refund" | "payments:payout"
  | "commissions:read" | "commissions:edit"
  | "shipping:manage"
  | "campaigns:manage" | "coupons:manage"
  | "cms:builder" | "banners:manage"
  | "marketing:notifications" | "marketing:referral"
  | "analytics:view"
  | "ai_studio:access"
  | "suppliers:read" | "suppliers:configure" | "suppliers:pricing_margin"
  | "security:view_logs" | "security:manage_2fa" | "security:manage_roles" | "security:backup_restore";

const ROLE_PERMISSIONS_MATRIX: Record<AdminRole, Set<PermissionAction>> = {
  "Super Admin": new Set([
    "dashboard:view", "products:read", "products:create", "products:edit", "products:delete",
    "categories:manage", "brands:manage", "inventory:view", "inventory:edit", "warehouses:manage",
    "orders:read", "orders:update_status", "orders:cancel", "orders:forward_supplier",
    "payments:view", "payments:process_refund", "payments:payout",
    "commissions:read", "commissions:edit", "shipping:manage",
    "campaigns:manage", "coupons:manage", "cms:builder", "banners:manage",
    "marketing:notifications", "marketing:referral", "analytics:view", "ai_studio:access",
    "suppliers:read", "suppliers:configure", "suppliers:pricing_margin",
    "security:view_logs", "security:manage_2fa", "security:manage_roles", "security:backup_restore"
  ]),

  "Admin": new Set([
    "dashboard:view", "products:read", "products:create", "products:edit", "products:delete",
    "categories:manage", "brands:manage", "inventory:view", "inventory:edit", "warehouses:manage",
    "orders:read", "orders:update_status", "orders:cancel", "orders:forward_supplier",
    "payments:view", "commissions:read", "shipping:manage", "campaigns:manage", "coupons:manage",
    "cms:builder", "banners:manage", "marketing:notifications", "analytics:view", "ai_studio:access",
    "suppliers:read", "suppliers:configure", "suppliers:pricing_margin", "security:view_logs"
  ]),

  "Manager": new Set([
    "dashboard:view", "products:read", "products:create", "products:edit",
    "categories:manage", "brands:manage", "inventory:view", "inventory:edit",
    "orders:read", "orders:update_status", "orders:cancel", "shipping:manage", "analytics:view"
  ]),

  "Finance": new Set([
    "dashboard:view", "orders:read", "payments:view", "payments:process_refund", "payments:payout",
    "commissions:read", "commissions:edit", "analytics:view"
  ]),

  "Marketing": new Set([
    "dashboard:view", "products:read", "categories:manage", "brands:manage",
    "campaigns:manage", "coupons:manage", "cms:builder", "banners:manage",
    "marketing:notifications", "marketing:referral", "ai_studio:access"
  ]),

  "Warehouse": new Set([
    "dashboard:view", "inventory:view", "inventory:edit", "warehouses:manage",
    "orders:read", "orders:update_status", "shipping:manage"
  ]),

  "Support": new Set([
    "dashboard:view", "products:read", "orders:read", "orders:update_status",
    "payments:view", "analytics:view"
  ])
};

export class AdminRBACService {
  public static hasPermission(role: AdminRole | undefined | null, permission: PermissionAction): boolean {
    if (!role) return false;
    const permissions = ROLE_PERMISSIONS_MATRIX[role];
    if (!permissions) return false;
    return permissions.has(permission);
  }

  public static getPermissionsForRole(role: AdminRole): PermissionAction[] {
    const permissions = ROLE_PERMISSIONS_MATRIX[role];
    return permissions ? Array.from(permissions) : [];
  }

  public static getAllRoles(): AdminRole[] {
    return ["Super Admin", "Admin", "Manager", "Finance", "Marketing", "Warehouse", "Support"];
  }
}
