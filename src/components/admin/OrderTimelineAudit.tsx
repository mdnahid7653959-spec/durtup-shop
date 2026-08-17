import { useState, useEffect } from "react";
import { 
  Clock, 
  CheckCircle2, 
  Truck, 
  Package, 
  XCircle, 
  RotateCcw, 
  User, 
  Plus, 
  Send,
  History,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/firebaseAdapter";
import { adminDb } from "@/lib/adminDb";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export interface OrderTimelineEntry {
  id: string;
  order_id: string;
  status: string;
  notes: string | null;
  changed_by: string | null;
  created_at: string;
}

interface OrderTimelineAuditProps {
  orderId: string;
  orderNumber: string;
  currentStatus: string;
  onRefreshNeeded?: () => void;
}

const statusIcons: Record<string, any> = {
  pending: Clock,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle2,
  cancelled: XCircle,
  refunded: RotateCcw,
};

const statusBadgeColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  processing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  shipped: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  delivered: "bg-success/10 text-success border-success/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  refunded: "bg-muted text-muted-foreground border-muted",
};

export function OrderTimelineAudit({
  orderId,
  orderNumber,
  currentStatus,
  onRefreshNeeded,
}: OrderTimelineAuditProps) {
  const [timelines, setTimelines] = useState<OrderTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const { admin } = useAdminAuth();
  const { toast } = useToast();

  const fetchTimelines = async () => {
    if (!orderId) return;
    try {
      // 1. Try querying order_timelines table
      const { data, error } = await supabase
        .from("order_timelines" as any)
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setTimelines((data as unknown as OrderTimelineEntry[]) || []);
      } else {
        // Fallback using adminDb or empty array
        const { data: adminData } = await adminDb.select<OrderTimelineEntry>("order_timelines", {
          filters: [{ col: "order_id", op: "eq", value: orderId }],
          orderBy: { col: "created_at", ascending: true },
        } as any);
        if (adminData) setTimelines((adminData as unknown as OrderTimelineEntry[]) || []);
      }
    } catch (err) {
      console.error("Timeline fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimelines();

    const channel = supabase
      .channel(`order-timeline-${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_timelines", filter: `order_id=eq.${orderId}` },
        () => {
          fetchTimelines();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const handleAddTimelineNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const nowIso = new Date().toISOString();
      const entry = {
        order_id: orderId,
        status: currentStatus,
        notes: newNote.trim(),
        changed_by: admin?.displayName || admin?.username || "Admin Staff",
        created_at: nowIso,
      };

      const { error } = await supabase.from("order_timelines" as any).insert(entry);
      if (error) {
        await adminDb.insert("order_timelines", entry);
      }

      toast({ title: "Audit note logged", description: "Added note to order timeline" });
      setNewNote("");
      fetchTimelines();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      console.error("Add timeline note error:", err);
      toast({ variant: "destructive", title: "Failed to add note", description: err.message });
    } finally {
      setAddingNote(false);
    }
  };

  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <span>Order Audit & Status Timeline</span>
          </div>
          <Badge className={`capitalize font-medium ${statusBadgeColors[currentStatus] || "bg-muted"}`}>
            {currentStatus}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timeline Trail */}
        {loading ? (
          <div className="py-6 text-center text-xs text-muted-foreground">Loading audit trail...</div>
        ) : timelines.length === 0 ? (
          <div className="p-4 bg-muted/40 rounded-lg text-xs text-muted-foreground text-center space-y-1">
            <p className="font-semibold text-foreground">No specific timeline entries logged yet.</p>
            <p>Transitions and custom audit notes will appear here in sequence.</p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted-foreground/20">
            {timelines.map((entry, index) => {
              const IconComp = statusIcons[entry.status] || Clock;
              const badgeStyle = statusBadgeColors[entry.status] || "bg-muted";

              return (
                <div key={entry.id || index} className="relative flex items-start gap-3 text-xs">
                  <div className="absolute -left-6 top-0 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center text-primary">
                    <IconComp className="h-3 w-3" />
                  </div>

                  <div className="flex-1 bg-muted/30 p-2.5 rounded-lg border border-muted/50 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] capitalize ${badgeStyle}`}>
                          {entry.status}
                        </Badge>
                        {entry.changed_by && (
                          <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {entry.changed_by}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {format(new Date(entry.created_at), "dd MMM yyyy, hh:mm a")}
                      </span>
                    </div>

                    {entry.notes && (
                      <p className="text-xs text-foreground mt-1 whitespace-pre-line">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Note Form */}
        <div className="flex gap-2 pt-2 border-t">
          <Input
            placeholder="Add internal audit note or status update note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAddTimelineNote();
              }
            }}
            className="text-xs h-9"
          />
          <Button
            size="sm"
            onClick={handleAddTimelineNote}
            disabled={addingNote || !newNote.trim()}
            className="h-9 px-3"
          >
            <Send className="h-3.5 w-3.5 mr-1" />
            Log Note
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
