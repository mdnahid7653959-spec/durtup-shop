import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { AdminRBACService, PermissionAction } from "@/services/admin/security/AdminRBACService";
import { AdminAuditLogService } from "@/services/admin/security/AdminAuditLogService";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  CreditCard,
  Percent,
  Truck,
  Users,
  Building2,
  Plug,
  Sparkles,
  Palette,
  Megaphone,
  ShieldCheck,
  LogOut,
  ChevronRight,
  ShieldAlert,
  Search,
  Bell,
  Clock,
  Menu,
  X,
  Sliders,
  Sun,
  Moon,
  Tags,
  Store,
  Warehouse,
  BarChart3,
  TrendingUp,
  FileText,
  RotateCcw,
  Star,
  Zap,
  Globe,
  SlidersHorizontal,
  Settings,
  Shield,
  Activity,
  Layers,
  SearchCode,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: PermissionAction;
  badge?: string;
}

const ENTERPRISE_NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: "OVERVIEW & ANALYTICS",
    items: [
      { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
      { title: "Analytics", href: "/admin/analytics", icon: BarChart3, permission: "analytics:view", badge: "Live" },
      { title: "Reports", href: "/admin/reports", icon: FileText, permission: "analytics:view" },
      { title: "Activity Logs", href: "/admin/activity-logs", icon: Activity, permission: "security:view_logs" }
    ]
  },
  {
    group: "CORE COMMERCE",
    items: [
      { title: "Products", href: "/admin/products", icon: Package, permission: "products:read" },
      { title: "Categories", href: "/admin/categories", icon: Layers, permission: "categories:manage" },
      { title: "Brands", href: "/admin/brands", icon: Tags, permission: "brands:manage" },
      { title: "Orders", href: "/admin/orders", icon: ShoppingCart, permission: "orders:read" },
      { title: "Returns", href: "/admin/returns", icon: RotateCcw, permission: "orders:read" },
      { title: "Reviews", href: "/admin/reviews", icon: Star, permission: "products:read" }
    ]
  },
  {
    group: "SUPPLY CHAIN & PARTNERS",
    items: [
      { title: "Customers", href: "/admin/customers", icon: Users, permission: "dashboard:view" },
      { title: "Sellers", href: "/admin/sellers", icon: Store, permission: "dashboard:view", badge: "KYC" },
      { title: "Supplier Center", href: "/admin/suppliers", icon: Plug, permission: "suppliers:read", badge: "API Engine" },
      { title: "Inventory", href: "/admin/inventory", icon: Boxes, permission: "inventory:view" },
      { title: "Warehouse", href: "/admin/warehouses", icon: Warehouse, permission: "warehouses:manage" }
    ]
  },
  {
    group: "MARKETING & PROMOTIONS",
    items: [
      { title: "Marketing", href: "/admin/marketing", icon: Megaphone, permission: "campaigns:manage" },
      { title: "Coupons", href: "/admin/coupons", icon: Percent, permission: "coupons:manage" },
      { title: "Flash Sale", href: "/admin/flash-sale", icon: Zap, permission: "campaigns:manage", badge: "Hot" },
      { title: "Notifications", href: "/admin/notifications", icon: Bell, permission: "marketing:notifications" },
      { title: "Search Management", href: "/admin/search-management", icon: SearchCode, permission: "cms:builder" },
      { title: "SEO Manager", href: "/admin/seo-manager", icon: Globe, permission: "cms:builder" }
    ]
  },
  {
    group: "SITE BUILDER & CONTROL",
    items: [
      { title: "CMS Builder", href: "/admin/cms-builder", icon: Palette, permission: "cms:builder", badge: "Visual" },
      { title: "Theme Builder", href: "/admin/theme-builder", icon: SlidersHorizontal, permission: "cms:builder", badge: "NoCode" },
      { title: "Website Control Center", href: "/admin/website-control", icon: Sliders, permission: "dashboard:view", badge: "Live OS" }
    ]
  },
  {
    group: "FINANCE & SECURITY",
    items: [
      { title: "Finance", href: "/admin/finance", icon: DollarSign, permission: "payments:view" },
      { title: "Payment Gateway", href: "/admin/payments", icon: CreditCard, permission: "payments:view" },
      { title: "Shipping", href: "/admin/shipping", icon: Truck, permission: "shipping:manage" },
      { title: "AI Tools", href: "/admin/ai-studio", icon: Sparkles, permission: "ai_studio:access", badge: "AI OS" },
      { title: "Security", href: "/admin/security", icon: ShieldCheck, permission: "security:view_logs" },
      { title: "RBAC", href: "/admin/rbac", icon: Shield, permission: "security:manage_roles" },
      { title: "Settings", href: "/admin/settings", icon: Settings, permission: "dashboard:view" }
    ]
  }
];

export const EnterpriseAdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { adminUser, adminRole, logout } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inactivityCountdown, setInactivityCountdown] = useState(900); // 15 mins
  const [moduleSearch, setModuleSearch] = useState("");
  const [adminTheme, setAdminTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("admin_theme") as "light" | "dark") || "light";
  });

  const toggleTheme = () => {
    const nextTheme = adminTheme === "light" ? "dark" : "light";
    setAdminTheme(nextTheme);
    localStorage.setItem("admin_theme", nextTheme);
  };

  const isLight = adminTheme === "light";

  // Inactivity timeout handler
  useEffect(() => {
    const timer = setInterval(() => {
      setInactivityCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const resetInactivity = () => setInactivityCountdown(900);
    window.addEventListener("mousemove", resetInactivity);
    window.addEventListener("keydown", resetInactivity);

    return () => {
      clearInterval(timer);
      window.removeEventListener("mousemove", resetInactivity);
      window.removeEventListener("keydown", resetInactivity);
    };
  }, []);

  const handleAutoLogout = async () => {
    if (adminUser) {
      await AdminAuditLogService.logAction({
        adminId: adminUser.uid,
        adminEmail: adminUser.email || "",
        adminRole: adminRole || "Admin",
        action: "AUTO_LOGOUT_INACTIVITY",
        module: "SECURITY",
        details: "Automatic logout due to 15 minutes of inactivity",
        status: "SUCCESS"
      });
    }
    await logout();
    navigate("/admin/login");
  };

  const formatSeconds = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className={`min-h-screen flex overflow-hidden font-sans transition-colors duration-200 ${
      isLight ? "bg-slate-100 text-slate-900" : "bg-slate-950 text-slate-100"
    }`}>
      {/* SIDEBAR NAVIGATION */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 transition-all duration-300 flex flex-col ${
          sidebarOpen ? "w-64" : "w-20"
        } ${
          isLight ? "bg-white border-r border-slate-200 text-slate-800 shadow-md" : "bg-slate-900 border-r border-slate-800 text-slate-100"
        }`}
      >
        {/* LOGO HEADER */}
        <div className={`h-16 px-4 flex items-center justify-between border-b shrink-0 ${
          isLight ? "border-slate-200 bg-white" : "border-slate-800 bg-slate-900"
        }`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-orange-600 flex items-center justify-center font-black text-white shadow-md shadow-orange-600/30 text-base">
                D
              </div>
              <div className="flex flex-col">
                <span className={`font-extrabold text-sm tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                  Durtup Marketplace OS
                </span>
                <span className="text-[10px] font-bold text-orange-600">
                  Enterprise Control v4.0
                </span>
              </div>
            </div>
          ) : (
            <div className="h-9 w-9 mx-auto rounded-xl bg-orange-600 flex items-center justify-center font-black text-white">
              D
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`hidden lg:flex p-1.5 rounded-lg transition ${
              isLight ? "hover:bg-slate-100 text-slate-500 hover:text-slate-800" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* SIDEBAR SEARCH FILTER */}
        {sidebarOpen && (
          <div className="p-3 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <Input
                value={moduleSearch}
                onChange={(e) => setModuleSearch(e.target.value)}
                placeholder="Search 31 Modules..."
                className="pl-8 text-xs h-8 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>
        )}

        {/* NAVIGATION LINKS - 31 MODULES */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-5 custom-scrollbar">
          {ENTERPRISE_NAV_GROUPS.map((group) => {
            const filteredItems = group.items.filter((item) =>
              item.title.toLowerCase().includes(moduleSearch.toLowerCase())
            );

            if (filteredItems.length === 0) return null;

            return (
              <div key={group.group} className="space-y-1">
                {sidebarOpen && (
                  <p className={`px-3 text-[10px] font-black uppercase tracking-wider mb-1.5 ${
                    isLight ? "text-slate-400" : "text-slate-500"
                  }`}>
                    {group.group}
                  </p>
                )}
                {filteredItems.map((item) => {
                  const isActive = location.pathname === item.href || (item.href !== "/admin/dashboard" && location.pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? "bg-orange-600 text-white shadow-md shadow-orange-600/30"
                          : isLight
                          ? "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                          : "text-slate-300 hover:bg-slate-800/80 hover:text-slate-100"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : isLight ? "text-slate-500" : "text-slate-400"}`} />
                      {sidebarOpen && (
                        <span className="flex-1 truncate">{item.title}</span>
                      )}
                      {sidebarOpen && item.badge && (
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${
                          isActive
                            ? "bg-white/20 text-white border-transparent"
                            : isLight
                            ? "border-orange-300 text-orange-600 bg-orange-50 font-bold"
                            : "border-orange-500/40 text-orange-400 font-bold"
                        }`}>
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* USER FOOTER */}
        <div className={`p-3 border-t shrink-0 ${
          isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-900/60"
        }`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-orange-600 border border-orange-500 flex items-center justify-center font-black text-xs text-white shrink-0 shadow-sm">
                {adminUser?.email?.[0].toUpperCase() || "A"}
              </div>
              {sidebarOpen && (
                <div className="min-w-0">
                  <p className={`text-xs font-bold truncate ${isLight ? "text-slate-900" : "text-slate-200"}`}>
                    {adminUser?.email || "admin@durtup.shop"}
                  </p>
                  <p className="text-[10px] text-orange-600 font-extrabold uppercase">{adminRole || "Super Admin"}</p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <button
                onClick={handleAutoLogout}
                className={`p-2 rounded-lg transition ${
                  isLight ? "text-slate-500 hover:bg-red-50 hover:text-red-600" : "text-slate-400 hover:bg-red-500/10 hover:text-red-400"
                }`}
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-20"}`}>
        {/* HEADER BAR */}
        <header className={`h-16 border-b px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md ${
          isLight ? "bg-white/90 border-slate-200 text-slate-800" : "bg-slate-900/90 border-slate-800 text-slate-100"
        }`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`lg:hidden p-2 rounded-lg ${
                isLight ? "hover:bg-slate-100 text-slate-600" : "hover:bg-slate-800 text-slate-300"
              }`}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className={`flex items-center gap-2 text-xs font-semibold ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              <span>Enterprise Admin</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              <span className={`font-bold capitalize ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                {location.pathname.split("/")[2] || "Dashboard"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* THEME TOGGLE BUTTON */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className={`text-xs font-bold gap-1.5 ${
                isLight
                  ? "border-slate-300 bg-slate-50 hover:bg-slate-200 text-slate-800"
                  : "border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
              }`}
              title="Toggle Light/Dark Theme"
            >
              {isLight ? (
                <>
                  <Sun className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-indigo-400 fill-indigo-400" />
                  <span>Dark Mode</span>
                </>
              )}
            </Button>

            {/* INACTIVITY SESSION TIMEOUT BADGE */}
            <div className={`hidden sm:flex items-center gap-1.5 border px-3 py-1.5 rounded-full text-xs font-mono ${
              isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-slate-800/80 border-slate-700/60 text-slate-300"
            }`}>
              <Clock className="h-3.5 w-3.5 text-orange-600" />
              <span className="text-[11px]">Session Timeout:</span>
              <span className="text-orange-600 font-bold">{formatSeconds(inactivityCountdown)}</span>
            </div>

            {/* SECURITY BADGE */}
            <Badge className={`px-3 py-1 text-[11px] font-bold hidden md:flex items-center gap-1.5 ${
              isLight ? "bg-emerald-50 border border-emerald-300 text-emerald-700" : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
            }`}>
              <ShieldCheck className="h-3.5 w-3.5" />
              ENTERPRISE OS
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoLogout}
              className={`text-xs font-bold gap-1.5 ${
                isLight
                  ? "border-slate-300 bg-slate-50 hover:bg-red-50 hover:text-red-600 text-slate-700"
                  : "border-slate-700 bg-slate-800 hover:bg-red-950 hover:text-red-400 text-slate-200"
              }`}
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </header>

        {/* CONTENT CONTAINER */}
        <main className={`flex-1 p-4 sm:p-6 overflow-y-auto ${
          isLight ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100"
        }`}>
          {children}
        </main>
      </div>
    </div>
  );
};


