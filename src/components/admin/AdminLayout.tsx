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
  Menu, 
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
  ExternalLink
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
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Package, label: "Products", href: "/products" },
  { icon: Layers, label: "Categories", href: "/categories" },
  { icon: Tag, label: "Brands", href: "/brands" },
  { icon: Warehouse, label: "Inventory", href: "/inventory" },
  { icon: ShoppingCart, label: "Orders", href: "/orders" },
  { icon: RotateCcw, label: "Returns & Refunds", href: "/returns" },
  { icon: Wallet, label: "Wallets", href: "/wallet" },
  { icon: Banknote, label: "Finance & Payouts", href: "/finance" },
  { icon: CreditCard, label: "Payments", href: "/payments" },
  { icon: Users, label: "Customers", href: "/users" },
  { icon: Store, label: "Sellers", href: "/sellers" },
  { icon: Users, label: "Staff", href: "/staff" },
  { icon: Truck, label: "Consignments", href: "/consignments" },
  { icon: Warehouse, label: "Warehouses", href: "/warehouses" },
  { icon: Percent, label: "Commissions", href: "/commissions" },
  { icon: Megaphone, label: "Marketing", href: "/marketing" },
  { icon: Percent, label: "Coupons", href: "/coupons" },
  { icon: Gift, label: "Loyalty", href: "/loyalty" },
  { icon: Truck, label: "Free Delivery", href: "/free-delivery" },
  { icon: Truck, label: "Shipping", href: "/shipping" },
  { icon: BarChart3, label: "Reports & Analytics", href: "/reports" },
  { icon: Shield, label: "Security & Logs", href: "/security" },
  { icon: Palette, label: "Visual Editor", href: "/visual-editor" },
  { icon: FileText, label: "CMS Pages", href: "/cms" },
  { icon: Gift, label: "Home Promos", href: "/home-promos" },
  { icon: MessageSquare, label: "Reviews", href: "/reviews" },
  { icon: MessageSquare, label: "Seller Support", href: "/seller-support" },
  { icon: Bell, label: "Push Notifications", href: "/push-notifications" },
  { icon: Settings, label: "CJ Settings", href: "/cj-settings" },
  { icon: Link2, label: "Supplier Integrations", href: "/supplier-integrations" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

function SidebarContent({ onItemClick }: { onItemClick?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuth();
  const { canInstall, isInstalled, install } = useAdminPWAInstall();

  const handleSignOut = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      <div className="p-4 sm:p-6 border-b">
        <Link to="/" className="flex items-center gap-3" onClick={onItemClick}>
          <img 
            src="/darzo-logo.png" 
            alt="Durtup Admin" 
            className="h-9 w-auto object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <span className="font-bold text-foreground text-lg tracking-tight">Durtup</span>
            <p className="text-xs text-muted-foreground font-medium">Control Center</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const current = location.pathname;
            const isActive = 
              current === item.href || 
              (item.href !== "/dashboard" && current.startsWith(item.href)) ||
              (item.href === "/dashboard" && (current === "/" || current === "/dashboard" || current === "/admin" || current === "/admin/dashboard")) ||
              (current.startsWith("/admin" + item.href));

            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  onClick={onItemClick}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-card border-r flex-col fixed h-full z-20">
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
        <a 
          href="https://durtup.shop" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
        >
          <span>Live Store</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-64 h-screen overflow-hidden">
        {/* Desktop Header */}
        <header className="hidden lg:flex h-16 border-b bg-card items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-2 text-sm">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
              Admin
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground font-medium">{title}</span>
          </div>
          <a 
            href="https://durtup.shop" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-sm text-primary hover:underline flex items-center gap-1.5 font-medium bg-primary/5 px-3 py-1.5 rounded-md border border-primary/20"
          >
            <span>Open Durtup.shop</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto mt-14 lg:mt-0">
          {children}
        </main>
      </div>
    </div>
  );
}
