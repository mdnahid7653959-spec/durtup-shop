import { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useStaff } from "@/contexts/StaffContext";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, LayoutDashboard, ListChecks, Mail, User, Bell, ShieldCheck, Package, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem { to: string; icon: any; label: string; requires?: string; }

const NAV: NavItem[] = [
  { to: "/staff", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/staff/tasks", icon: ListChecks, label: "My Tasks", requires: "tasks.view" },
  { to: "/staff/sellers", icon: Store, label: "Sellers", requires: "sellers.view" },
  { to: "/staff/products", icon: Package, label: "Products", requires: "products.view" },
  { to: "/staff/messages", icon: Mail, label: "Seller Support", requires: "messages.view" },
  { to: "/staff/notifications", icon: Bell, label: "Notifications" },
  { to: "/staff/profile", icon: User, label: "Profile" },
];

export function StaffLayout({ children }: { children: ReactNode }) {
  const { staff, role, can } = useStaff();
  const { signOut } = useAuth();
  const nav = useNavigate();

  return (
    <div className="min-h-screen flex bg-muted/30">
      <aside className="w-64 bg-card border-r flex flex-col hidden md:flex">
        <div className="p-4 border-b">
          <Link to="/staff" className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span>Staff Portal</span>
          </Link>
          <p className="text-xs text-muted-foreground mt-2">{role?.department_name}</p>
          <p className="text-xs font-medium truncate">{role?.name}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.filter((n) => !n.requires || can(n.requires)).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/staff"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`
              }
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t space-y-2">
          <div className="text-xs">
            <p className="font-medium truncate">{staff?.full_name}</p>
            <p className="text-muted-foreground truncate">{staff?.email}</p>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={async () => { await signOut(); nav("/staff/login"); }}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <header className="md:hidden flex items-center justify-between p-3 border-b bg-card">
          <Link to="/staff" className="flex items-center gap-2 font-semibold text-sm">
            <ShieldCheck className="h-4 w-4 text-primary" /> Staff
          </Link>
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); nav("/staff/login"); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
