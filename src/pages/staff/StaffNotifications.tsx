import { useEffect, useState } from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { supabase } from "@/lib/firebaseAdapter";
import { useStaff } from "@/contexts/StaffContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, ClipboardList, Mail, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

type Item = {
  id: string;
  kind: "task" | "message";
  title: string;
  body?: string;
  meta?: string;
  createdAt: string;
  to: string;
  unread?: boolean;
};

export default function StaffNotifications() {
  const { staff } = useStaff();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!staff) return;
    setLoading(true);
    const [tasksRes, msgsRes] = await Promise.all([
      supabase
        .from("staff_tasks")
        .select("id, title, description, status, priority, created_at")
        .eq("staff_id", staff.id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("staff_messages")
        .select("id, subject, body, read_at, created_at")
        .eq("to_staff_id", staff.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const merged: Item[] = [
      ...(tasksRes.data || []).map((t: any) => ({
        id: `t-${t.id}`,
        kind: "task" as const,
        title: t.title,
        body: t.description,
        meta: `${t.priority} · ${t.status}`,
        createdAt: t.created_at,
        to: "/staff/tasks",
        unread: t.status === "todo",
      })),
      ...(msgsRes.data || []).map((m: any) => ({
        id: `m-${m.id}`,
        kind: "message" as const,
        title: m.subject,
        body: m.body,
        createdAt: m.created_at,
        to: "/staff/messages",
        unread: !m.read_at,
      })),
    ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

    setItems(merged);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!staff) return;
    const ch = supabase
      .channel(`staff-notif-${staff.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_tasks", filter: `staff_id=eq.${staff.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_messages", filter: `to_staff_id=eq.${staff.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [staff?.id]);

  return (
    <StaffLayout>
      <div className="flex items-center gap-2 mb-4">
        <Bell className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Notifications</h1>
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          You're all caught up. New tasks and messages from your admin will appear here.
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Link key={n.id} to={n.to}>
              <Card className={`p-4 hover:bg-muted/50 transition ${n.unread ? "border-primary/40 bg-primary/5" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className={`rounded-full p-2 ${n.kind === "task" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                    {n.kind === "task" ? <ClipboardList className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{n.title}</p>
                      {n.unread && <Badge variant="default" className="text-[10px] h-4">NEW</Badge>}
                      {n.meta && <Badge variant="outline" className="text-[10px] h-4">{n.meta}</Badge>}
                    </div>
                    {n.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </StaffLayout>
  );
}
