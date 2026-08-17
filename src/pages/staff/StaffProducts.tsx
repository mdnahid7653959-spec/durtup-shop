import { useEffect, useMemo, useState } from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useStaff } from "@/contexts/StaffContext";
import { supabase } from "@/lib/firebaseAdapter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, CheckCircle2, XCircle, Ban, Search, PackageX, Eye } from "lucide-react";
import { StaffProductPreviewDialog } from "@/components/staff/StaffProductPreviewDialog";


interface Row {
  id: string; name: string; slug: string; regular_price: number; discount_price: number | null;
  stock_quantity: number; status: string; approval_status: string | null; seller_id: string | null;
  is_featured: boolean; created_at: string; sellers?: { shop_name?: string } | null;
}

export default function StaffProducts() {
  const { staff, can, loading: staffLoading } = useStaff();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("pending");
  const [action, setAction] = useState<{ open: boolean; id: string; kind: "reject" | "ban" }>({ open: false, id: "", kind: "reject" });
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const openView = (id: string) => {
    setViewId(id);
    setViewOpen(true);
  };


  const canView = can("products.view") || can("products.approve") || can("products.manage");
  const canApprove = can("products.approve");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("staff-products", { body: { action: "list" } });
    if (error || data?.error) {
      toast({ title: "Failed to load", description: error?.message || data?.error, variant: "destructive" });
      setRows([]);
    } else setRows(data.products || []);
    setLoading(false);
  };

  useEffect(() => { if (!staffLoading && canView) load(); }, [staffLoading, canView]);

  useEffect(() => {
    if (!canView) return;
    const ch = supabase.channel("staff-products-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [canView]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === "pending" && (r.approval_status || "pending") !== "pending") return false;
      if (tab === "approved" && r.approval_status !== "approved") return false;
      if (tab === "rejected" && r.approval_status !== "rejected") return false;
      if (tab === "banned" && r.approval_status !== "banned") return false;
      if (!term) return true;
      return r.name.toLowerCase().includes(term) || r.sellers?.shop_name?.toLowerCase().includes(term);
    });
  }, [rows, tab, q]);

  const counts = useMemo(() => ({
    all: rows.length,
    pending: rows.filter((r) => (r.approval_status || "pending") === "pending").length,
    approved: rows.filter((r) => r.approval_status === "approved").length,
    rejected: rows.filter((r) => r.approval_status === "rejected").length,
    banned: rows.filter((r) => r.approval_status === "banned").length,
  }), [rows]);

  const doApprove = async (id: string) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("staff-products", { body: { action: "approve", productId: id } });
    setBusy(false);
    if (error || data?.error) toast({ title: "Failed", description: error?.message || data?.error, variant: "destructive" });
    else { toast({ title: "Approved" }); load(); }
  };
  const doReasonAction = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("staff-products", { body: { action: action.kind, productId: action.id, reason } });
    setBusy(false);
    if (error || data?.error) toast({ title: "Failed", description: error?.message || data?.error, variant: "destructive" });
    else { toast({ title: action.kind === "reject" ? "Rejected" : "Banned" }); setAction({ open: false, id: "", kind: "reject" }); setReason(""); load(); }
  };

  if (staffLoading) return <StaffLayout><div className="p-8 text-center text-muted-foreground">Loading…</div></StaffLayout>;
  if (!canView) return <StaffLayout><Card className="p-8 text-center"><p className="text-muted-foreground">You do not have permission to view products.</p></Card></StaffLayout>;

  return (
    <StaffLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Products</h1>
            <p className="text-sm text-muted-foreground">Review and approve products submitted by sellers.</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="pending">Pending <Badge variant="secondary" className="ml-2">{counts.pending}</Badge></TabsTrigger>
            <TabsTrigger value="approved">Approved <Badge variant="secondary" className="ml-2">{counts.approved}</Badge></TabsTrigger>
            <TabsTrigger value="rejected">Rejected <Badge variant="secondary" className="ml-2">{counts.rejected}</Badge></TabsTrigger>
            <TabsTrigger value="banned">Banned <Badge variant="secondary" className="ml-2">{counts.banned}</Badge></TabsTrigger>
            <TabsTrigger value="all">All <Badge variant="secondary" className="ml-2">{counts.all}</Badge></TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by product or seller…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <PackageX className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="font-medium">No products in this view</p>
              <p className="text-sm text-muted-foreground">Try another tab or refresh.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((p) => (
                <li key={p.id} className="p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{p.name}</p>
                      <ApprovalBadge status={p.approval_status} />
                      <Badge variant="outline" className="text-xs">{p.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      Seller: {p.sellers?.shop_name || "Unknown"} · Stock: {p.stock_quantity} · ৳{p.discount_price ?? p.regular_price}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => openView(p.id)}>
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                    {canApprove && (p.approval_status || "pending") !== "approved" && (
                      <>
                        <Button size="sm" onClick={() => doApprove(p.id)} disabled={busy}>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setAction({ open: true, id: p.id, kind: "reject" }); setReason(""); }} disabled={busy}>
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setAction({ open: true, id: p.id, kind: "ban" }); setReason(""); }} disabled={busy}>
                          <Ban className="h-4 w-4 mr-1" /> Ban
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Dialog open={action.open} onOpenChange={(o) => setAction((s) => ({ ...s, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action.kind === "reject" ? "Reject product" : "Ban product"}</DialogTitle>
          </DialogHeader>
          <Textarea placeholder="Reason (shown to the seller)" value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction({ open: false, id: "", kind: "reject" })}>Cancel</Button>
            <Button onClick={doReasonAction} disabled={busy}>{action.kind === "reject" ? "Reject" : "Ban"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StaffProductPreviewDialog
        productId={viewId}
        open={viewOpen}
        onOpenChange={setViewOpen}
        canApprove={canApprove}
        actionLoading={busy}
        onApprove={(id) => { doApprove(id); setViewOpen(false); }}
        onReject={(id) => { setAction({ open: true, id, kind: "reject" }); setReason(""); setViewOpen(false); }}
        onBan={(id) => { setAction({ open: true, id, kind: "ban" }); setReason(""); setViewOpen(false); }}
      />

    </StaffLayout>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium truncate">{value}</p>
    </div>
  );
}


function ApprovalBadge({ status }: { status: string | null }) {
  const s = status || "pending";
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    rejected: "bg-rose-100 text-rose-800 border-rose-200",
    banned: "bg-zinc-200 text-zinc-800 border-zinc-300",
  };
  return <Badge variant="outline" className={map[s] || ""}>{s}</Badge>;
}
