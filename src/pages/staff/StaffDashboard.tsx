import { useEffect, useState } from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useStaff } from "@/contexts/StaffContext";
import { supabase } from "@/lib/firebaseAdapter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListChecks, Clock, CheckCircle2, Mail, Bell, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const DASHBOARD_TITLES: Record<string, string> = {
  seller: "Seller Center Dashboard",
  product: "Product Center Dashboard",
  finance: "Finance Center Dashboard",
  marketing: "Marketing Center Dashboard",
  support: "Support Center Dashboard",
  delivery: "Delivery Center Dashboard",
  general: "Staff Dashboard",
};

const QUICK_ACTIONS: { key: string; label: string; to: string }[] = [
  { key: "sellers.view", label: "Review Sellers", to: "/admin/sellers" },
  { key: "products.approve", label: "Approve Products", to: "/staff/products" },
  { key: "products.view", label: "View Products", to: "/staff/products" },
  { key: "orders.view", label: "View Orders", to: "/admin/orders" },
  { key: "delivery.assign", label: "Assign Delivery", to: "/admin/consignments" },
  { key: "finance.view_reports", label: "Finance Reports", to: "/admin/reports" },
  { key: "finance.process_payouts", label: "Process Payouts", to: "/admin/reports" },
  { key: "marketing.campaigns", label: "Campaigns", to: "/admin/marketing" },
  { key: "marketing.coupons", label: "Coupons", to: "/admin/coupons" },
  { key: "support.messages", label: "Customer Messages", to: "/messages" },
  { key: "analytics.view", label: "Analytics", to: "/admin/reports" },
];

export default function StaffDashboard() {
  const { staff, role, permissions, can } = useStaff();
  const [stats, setStats] = useState({ today: 0, pending: 0, completedToday: 0, unreadMessages: 0 });
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!staff) return;
    const today = new Date().toISOString().slice(0, 10);
    (async () => {
      const { data: tasks } = await supabase.from("staff_tasks").select("*").eq("staff_id", staff.id).order("due_date", { nullsFirst: false });
      const list = tasks || [];
      setTodayTasks(list.filter((t) => t.due_date === today && t.status !== "done" && t.status !== "cancelled"));
      setStats((s) => ({
        ...s,
        today: list.filter((t) => t.due_date === today && t.status !== "done").length,
        pending: list.filter((t) => t.status === "todo" || t.status === "in_progress").length,
        completedToday: list.filter((t) => t.status === "done" && t.completed_at?.slice(0, 10) === today).length,
      }));
      const { data: msgs } = await supabase.from("staff_messages").select("*").eq("to_staff_id", staff.id).order("created_at", { ascending: false }).limit(5);
      setMessages(msgs || []);
      setStats((s) => ({ ...s, unreadMessages: (msgs || []).filter((m) => !m.read_at).length }));
    })();
  }, [staff?.id]);

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{DASHBOARD_TITLES[role?.dashboard_key || "general"]}</h1>
          <p className="text-muted-foreground">Welcome back, {staff?.full_name}. Here is what needs your attention today.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard icon={ListChecks} label="Today's tasks" value={stats.today} color="text-blue-600" />
          <StatCard icon={Clock} label="Pending" value={stats.pending} color="text-amber-600" />
          <StatCard icon={CheckCircle2} label="Completed today" value={stats.completedToday} color="text-emerald-600" />
          <StatCard icon={Mail} label="Unread messages" value={stats.unreadMessages} color="text-purple-600" />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2"><ListChecks className="h-4 w-4" /> Today's Tasks</h2>
              <Link to="/staff/tasks" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            {todayTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No tasks due today. Great job!</p>
            ) : (
              <ul className="space-y-2">
                {todayTasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between p-3 rounded border">
                    <div>
                      <p className="font-medium text-sm">{t.title}</p>
                      {t.description && <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>}
                    </div>
                    <Badge variant={t.priority === "high" ? "destructive" : "secondary"}>{t.priority}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4 md:p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><Mail className="h-4 w-4" /> Messages</h2>
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No messages</p>
            ) : (
              <ul className="space-y-2">
                {messages.map((m) => (
                  <li key={m.id} className="text-sm border rounded p-2">
                    <p className="font-medium truncate">{m.subject}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{m.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="p-4 md:p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Your Modules</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {QUICK_ACTIONS.filter((a) => can(a.key)).map((a) => (
              <Button key={a.key} variant="outline" asChild className="h-auto py-3 justify-start">
                <Link to={a.to}>{a.label}</Link>
              </Button>
            ))}
            {[...permissions].filter((p) => !QUICK_ACTIONS.some((q) => q.key === p)).length > 0 && (
              <p className="col-span-full text-xs text-muted-foreground">Additional permissions: {[...permissions].join(", ")}</p>
            )}
          </div>
        </Card>
      </div>
    </StaffLayout>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
    </Card>
  );
}
