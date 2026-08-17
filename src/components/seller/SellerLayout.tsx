import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  Store,
  BarChart3,
  MessageSquare,
  ChevronRight,
  Bell,
  HelpCircle,
  Truck,
  LifeBuoy,
} from "lucide-react";

interface SellerLayoutProps {
  children: ReactNode;
  title: string;
}

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/seller/dashboard" },
  { icon: Package, label: "Products", href: "/seller/products" },
  { icon: Truck, label: "Consignments", href: "/seller/consignments" },
  { icon: ShoppingCart, label: "Orders", href: "/seller/orders" },
  { icon: DollarSign, label: "Earnings", href: "/seller/earnings" },
  { icon: BarChart3, label: "Analytics", href: "/seller/analytics" },
  { icon: MessageSquare, label: "Messages", href: "/seller/messages" },
  { icon: LifeBuoy, label: "Help Center Support", href: "/seller/support" },
  { icon: Settings, label: "Shop Settings", href: "/seller/settings" },
];

function SidebarContent({ onItemClick }: { onItemClick?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b">
        <Link to="/seller" className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary">
            <Store className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Seller Center</h2>
            <p className="text-xs text-muted-foreground">Manage your shop</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== "/seller" && location.pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onItemClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
                {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 border-t space-y-2">
        <Link to="/" className="block">
          <Button variant="outline" className="w-full justify-start">
            <Store className="h-4 w-4 mr-2" />
            View Store
          </Button>
        </Link>
        <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export function SellerLayout({ children, title }: SellerLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r bg-card">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:pl-64 min-w-0 w-full">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 md:h-16 items-center gap-2 md:gap-4 px-3 md:px-6">
            {/* Mobile Menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <SidebarContent onItemClick={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>

            {/* Page Title */}
            <div className="flex-1 min-w-0">
              <h1 className="text-base md:text-xl font-semibold truncate">{title}</h1>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-1 md:gap-2 shrink-0">
              <Button variant="ghost" size="icon" className="relative h-9 w-9">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 hidden sm:inline-flex">
                <HelpCircle className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-3 md:p-6 lg:p-8 overflow-x-hidden pb-24 lg:pb-8">
          <div className="min-w-0 w-full max-w-full">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}
