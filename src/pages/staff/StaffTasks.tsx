import { useEffect, useState, useMemo } from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { supabase } from "@/lib/firebaseAdapter";
import { useStaff } from "@/contexts/StaffContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ClipboardList, Loader2, RefreshCw, Inbox } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: "todo" | "in_progress" | "done" | "cancelled";
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
};

const TABS: { key: "all" | "todo" | "in_progress" | "done"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

export default function StaffTasks() {
  const { staff } = useStaff();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "todo" | "in_progress" | "done">("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    if (!staff) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("staff_tasks")
      .select("id, title, description, priority, status, due_date, created_at, completed_at")
      .eq("staff_id", staff.id)
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Failed to load tasks", description: error.message, variant: "destructive" });
    setTasks((data as Task[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!staff) return;
    const ch = supabase
      .channel(`staff-tasks-${staff.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "staff_tasks", filter: `staff_id=eq.${staff.id}` },
        load,
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [staff?.id]);

  const update = async (id: string, status: Task["status"]) => {
    setBusyId(id);
    const patch: any = { status };
    if (status === "done") patch.completed_at = new Date().toISOString();
    if (status !== "done") patch.completed_at = null;
    const { error } = await supabase.from("staff_tasks").update(patch).eq("id", id);
    setBusyId(null);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Task updated" });
  };

  const filtered = useMemo(
    () => (tab === "all" ? tasks : tasks.filter((t) => t.status === tab)),
    [tasks, tab],
  );

  const counts = useMemo(() => ({
    all: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  }), [tasks]);

  return (
    <StaffLayout>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">My Tasks</h1>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={tab === t.key ? "default" : "outline"}
            onClick={() => setTab(t.key)}
            className="whitespace-nowrap"
          >
            {t.label}
            <Badge variant="secondary" className="ml-2 h-5">{counts[t.key]}</Badge>
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">
            {tab === "all" ? "No tasks assigned yet" : `No ${tab.replace("_", " ")} tasks`}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            When your admin assigns a task from the Staff Management panel, it will appear here in real time.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{t.title}</h3>
                    <Badge variant={t.priority === "high" ? "destructive" : t.priority === "low" ? "outline" : "secondary"}>
                      {t.priority}
                    </Badge>
                    <Badge variant="outline">{t.status.replace("_", " ")}</Badge>
                  </div>
                  {t.description && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{t.description}</p>}
                  <div className="text-xs text-muted-foreground mt-2 flex gap-3 flex-wrap">
                    <span>Assigned {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</span>
                    {t.due_date && <span>Due {format(new Date(t.due_date), "dd MMM yyyy")}</span>}
                    {t.completed_at && <span>Completed {format(new Date(t.completed_at), "dd MMM, HH:mm")}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {t.status === "todo" && (
                    <Button size="sm" variant="outline" disabled={busyId === t.id} onClick={() => update(t.id, "in_progress")}>
                      Start
                    </Button>
                  )}
                  {t.status === "in_progress" && (
                    <Button size="sm" variant="outline" disabled={busyId === t.id} onClick={() => update(t.id, "todo")}>
                      Pause
                    </Button>
                  )}
                  {t.status !== "done" && (
                    <Button size="sm" disabled={busyId === t.id} onClick={() => update(t.id, "done")}>
                      {busyId === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark done"}
                    </Button>
                  )}
                  {t.status === "done" && (
                    <Button size="sm" variant="outline" disabled={busyId === t.id} onClick={() => update(t.id, "todo")}>
                      Reopen
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </StaffLayout>
  );
}
