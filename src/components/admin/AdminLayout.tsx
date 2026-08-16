import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Tag, 
  Settings,
  LogOut,
  ChevronRight,
  Layers,
  Percent,
  Star,
  Menu,
  Home,
  Warehouse,
  Megaphone,
  Gift,
  Truck,
  BarChart3,
  Shield,
  FileText,
  Store,
  CreditCard,
  MessageSquare,
  Bell,
  Download,
  Palette,
  RotateCcw,
  Wallet,
  Banknote,
  Link2,
  Search
} from "lucide-react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAdminPWAInstall } from "@/hooks/useAdminPWAInstall";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
  { icon: Package, label: "Products", href: "/admin/products" },

  { icon: Layers, label: "Categories", href: "/admin/categories" },
  { icon: Tag, label: "Brands", href: "/admin/brands" },
  { icon: Warehouse, label: "Inventory", href: "/admin/inventory" },
  { icon: ShoppingCart, label: "Orders", href: "/admin/orders" },
  { icon: RotateCcw, label: "Returns & Refunds", href: "/admin/returns" },
  { icon: Wallet, label: "Wallets", href: "/admin/wallet" },
  { icon: Banknote, label: "Finance & Payouts", href: "/admin/finance" },
  { icon: CreditCard, label: "Payments", href: "/admin/payments" },
  { icon: Users, label: "Customers", href: "/admin/users" },
  { icon: Store, label: "Sellers", href: "/admin/sellers" },
  { icon: Users, label: "Staff", href: "/admin/staff" },
  { icon: Truck, label: "Consignments", href: "/admin/consignments" },
  { icon: Warehouse, label: "Warehouses", href: "/admin/warehouses" },
  { icon: Percent, label: "Commissions", href: "/admin/commissions" },
  { icon: Megaphone, label: "Marketing", href: "/admin/marketing" },
  { icon: Percent, label: "Coupons", href: "/admin/coupons" },
  { icon: Gift, label: "Loyalty", href: "/admin/loyalty" },
  { icon: Truck, label: "Free Delivery", href: "/admin/free-delivery" },
  { icon: Truck, label: "Shipping", href: "/admin/shipping" },
  { icon: BarChart3, label: "Reports", href: "/admin/reports" },
  { icon: Shield, label: "Security", href: "/admin/security" },
  { icon: Palette, label: "Visual Editor", href: "/admin/visual-editor" },
  { icon: FileText, label: "CMS", href: "/admin/cms" },
  { icon: Gift, label: "Home Promos", href: "/admin/home-promos" },
  { icon: MessageSquare, label: "Reviews", href: "/admin/reviews" },
  { icon: MessageSquare, label: "Seller Support", href: "/admin/seller-support" },
  { icon: Bell, label: "Push Notifications", href: "/admin/push-notifications" },
  { icon: Settings, label: "CJ Settings", href: "/admin/cj-settings" },
  { icon: Link2, label: "Supplier Integrations", href: "/admin/supplier-integrations" },
  { icon: Settings, label: "Settings", href: "/admin/settings" },
];


function SidebarContent({ onItemClick }: { onItemClick?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuth();
  const { canInstall, isInstalled, install } = useAdminPWAInstall();

  const handleSignOut = () => {
    logout();
    navigate("/admin/login");
  };

  return (
    <>
      <div className="p-4 sm:p-6 border-b">
        <Link to="/" className="flex items-center gap-2" onClick={onItemClick}>
          <img 
            src="/darzo-logo.png" 
            alt="Darzo.com" 
            className="h-9 w-auto object-contain"
          />
          <div>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== "/admin" && location.pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  onClick={onItemClick}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t mt-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-semibold">
              {admin?.displayName?.charAt(0) || "A"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {admin?.displayName || "Admin"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {admin?.username}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
        {canInstall && !isInstalled && (
          <Button 
            variant="default" 
            size="sm" 
            className="w-full mt-2" 
            onClick={install}
          >
            <Download className="h-4 w-4 mr-2" />
            Install Admin App
          </Button>
        )}
        {isInstalled && (
          <p className="text-[10px] text-center text-muted-foreground mt-2">✅ App Installed</p>
        )}
      </div>
    </>
  );
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-card border-r flex-col fixed h-full">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
              <SidebarContent onItemClick={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="font-semibold text-foreground truncate">{title}</span>
        </div>
        <Link to="/" className="text-sm text-primary hover:underline flex items-center gap-1">
          <Home className="h-4 w-4" />
          <span className="hidden sm:inline">View Store</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-64 h-screen overflow-hidden">
        {/* Desktop Header */}
        <header className="hidden lg:flex h-16 border-b bg-card items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-2 text-sm">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground">
              Admin
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground font-medium">{title}</span>
          </div>
          <Link to="/" className="text-sm text-primary hover:underline flex items-center gap-1">
            <Home className="h-4 w-4" />
            View Store
          </Link>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto mt-14 lg:mt-0">
          {children}
        </main>
      </div>
    </div>
  );
}
