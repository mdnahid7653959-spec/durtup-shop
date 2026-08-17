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
import { RefreshCw, CheckCircle2, XCircle, Ban, Search, Store, Eye, Star, Pause, Play } from "lucide-react";

interface Seller {
  id: string; user_id: string; shop_name: string; shop_slug: string; shop_logo: string | null;
  business_name: string | null; business_type: string | null;
  contact_phone: string; contact_email: string; status: string;
  rejection_reason: string | null; warning_count: number; rating_average: number; rating_count: number;
  total_products: number; total_orders: number; total_sales: number;
  is_verified: boolean; is_featured: boolean; created_at: string;
  nid_number?: string | null; trade_license_number?: string | null;
  nid_front_image?: string | null; nid_back_image?: string | null;
  birth_certificate_image?: string | null; trade_license_image?: string | null;
  warehouse_address?: any;
}

type ActionKind = "reject" | "suspend" | "ban";

export default function StaffSellers() {
  const { can, loading: staffLoading } = useStaff();
  const { toast } = useToast();
  const [rows, setRows] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("pending");
  const [view, setView] = useState<Seller | null>(null);
  const [action, setAction] = useState<{ open: boolean; id: string; kind: ActionKind }>({ open: false, id: "", kind: "reject" });
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState<Record<string, string>>({});

  const canView = can("sellers.view") || can("sellers.approve") || can("sellers.suspend");
  const canApprove = can("sellers.approve");
  const canSuspend = can("sellers.suspend");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("staff-sellers", { body: { action: "list" } });
    if (error || data?.error) {
      toast({ title: "Failed to load", description: error?.message || data?.error, variant: "destructive" });
      setRows([]);
    } else setRows(data.sellers || []);
    setLoading(false);
  };

  useEffect(() => { if (!staffLoading && canView) load(); }, [staffLoading, canView]);

  useEffect(() => {
    if (!canView) return;
    const ch = supabase.channel("staff-sellers-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "sellers" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [canView]);

  const resolveImg = async (ref?: string | null) => {
    if (!ref) return null;
    if (/^https?:\/\//i.test(ref)) return ref;
    const path = ref.replace(/^product-media\//, "");
    const { data } = await supabase.storage.from("product-media").createSignedUrl(path, 3600);
    return data?.signedUrl || null;
  };

  useEffect(() => {
    if (!view) { setImages({}); return; }
    (async () => {
      const refs: Record<string, string | null | undefined> = {
        shop_logo: view.shop_logo,
        nid_front_image: view.nid_front_image,
        nid_back_image: view.nid_back_image,
        birth_certificate_image: view.birth_certificate_image,
        trade_license_image: view.trade_license_image,
      };
      const entries = await Promise.all(Object.entries(refs).map(async ([k, v]) => [k, await resolveImg(v)] as const));
      setImages(Object.fromEntries(entries.filter(([, v]) => v)) as Record<string, string>);
    })();
  }, [view]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false;
      if (!term) return true;
      return r.shop_name.toLowerCase().includes(term) || r.contact_email?.toLowerCase().includes(term) || r.contact_phone?.includes(term);
    });
  }, [rows, tab, q]);

  const counts = useMemo(() => ({
    all: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    suspended: rows.filter((r) => r.status === "suspended").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
    banned: rows.filter((r) => r.status === "banned").length,
  }), [rows]);

  const doSimple = async (id: string, kind: "approve" | "unsuspend") => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("staff-sellers", { body: { action: kind, sellerId: id } });
    setBusy(false);
    if (error || data?.error) toast({ title: "Failed", description: error?.message || data?.error, variant: "destructive" });
    else { toast({ title: kind === "approve" ? "Approved" : "Reactivated" }); setView(null); load(); }
  };
  const doReasonAction = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("staff-sellers", { body: { action: action.kind, sellerId: action.id, reason } });
    setBusy(false);
    if (error || data?.error) toast({ title: "Failed", description: error?.message || data?.error, variant: "destructive" });
    else {
      toast({ title: action.kind === "reject" ? "Rejected" : action.kind === "suspend" ? "Suspended" : "Banned" });
      setAction({ open: false, id: "", kind: "reject" }); setReason(""); setView(null); load();
    }
  };

  if (staffLoading) return <StaffLayout><div className="p-8 text-center text-muted-foreground">Loading…</div></StaffLayout>;
  if (!canView) return <StaffLayout><Card className="p-8 text-center"><p className="text-muted-foreground">You do not have permission to view sellers.</p></Card></StaffLayout>;

  return (
    <StaffLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Sellers</h1>
            <p className="text-sm text-muted-foreground">Review, approve and moderate seller accounts.</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="pending">Pending <Badge variant="secondary" className="ml-2">{counts.pending}</Badge></TabsTrigger>
            <TabsTrigger value="approved">Approved <Badge variant="secondary" className="ml-2">{counts.approved}</Badge></TabsTrigger>
            <TabsTrigger value="suspended">Suspended <Badge variant="secondary" className="ml-2">{counts.suspended}</Badge></TabsTrigger>
            <TabsTrigger value="rejected">Rejected <Badge variant="secondary" className="ml-2">{counts.rejected}</Badge></TabsTrigger>
            <TabsTrigger value="banned">Banned <Badge variant="secondary" className="ml-2">{counts.banned}</Badge></TabsTrigger>
            <TabsTrigger value="all">All <Badge variant="secondary" className="ml-2">{counts.all}</Badge></TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by shop, email or phone…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <Store className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="font-medium">No sellers in this view</p>
              <p className="text-sm text-muted-foreground">Try another tab or refresh.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((s) => (
                <li key={s.id} className="p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {s.shop_logo && /^https?:\/\//.test(s.shop_logo) ? (
                      <img src={s.shop_logo} alt={s.shop_name} className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Store className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{s.shop_name}</p>
                        <StatusBadge status={s.status} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.contact_email} · {s.contact_phone} · ★ {Number(s.rating_average || 0).toFixed(1)} ({s.rating_count || 0})
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => setView(s)}>
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                    {canApprove && s.status === "pending" && (
                      <Button size="sm" onClick={() => doSimple(s.id, "approve")} disabled={busy}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                      </Button>
                    )}
                    {canApprove && s.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => { setAction({ open: true, id: s.id, kind: "reject" }); setReason(""); }} disabled={busy}>
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    )}
                    {canSuspend && s.status === "approved" && (
                      <Button size="sm" variant="outline" onClick={() => { setAction({ open: true, id: s.id, kind: "suspend" }); setReason(""); }} disabled={busy}>
                        <Pause className="h-4 w-4 mr-1" /> Suspend
                      </Button>
                    )}
                    {canApprove && s.status === "suspended" && (
                      <Button size="sm" onClick={() => doSimple(s.id, "unsuspend")} disabled={busy}>
                        <Play className="h-4 w-4 mr-1" /> Reactivate
                      </Button>
                    )}
                    {canSuspend && s.status !== "banned" && (
                      <Button size="sm" variant="outline" onClick={() => { setAction({ open: true, id: s.id, kind: "ban" }); setReason(""); }} disabled={busy}>
                        <Ban className="h-4 w-4 mr-1" /> Ban
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Action dialog */}
      <Dialog open={action.open} onOpenChange={(o) => setAction((st) => ({ ...st, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action.kind === "reject" ? "Reject seller" : action.kind === "suspend" ? "Suspend seller" : "Ban seller"}
            </DialogTitle>
          </DialogHeader>
          <Textarea placeholder="Reason (shown to the seller)" value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction({ open: false, id: "", kind: "reject" })}>Cancel</Button>
            <Button onClick={doReasonAction} disabled={busy}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {view && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {view.shop_name}
                  <StatusBadge status={view.status} />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {images.shop_logo ? (
                    <img src={images.shop_logo} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                      <Store className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{view.business_name || view.shop_name}</p>
                    <p className="text-xs text-muted-foreground">{view.business_type || "Individual"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <Info label="Email" value={view.contact_email} />
                  <Info label="Phone" value={view.contact_phone} />
                  <Info label="Rating" value={`★ ${Number(view.rating_average || 0).toFixed(1)} (${view.rating_count || 0})`} />
                  <Info label="Products" value={String(view.total_products || 0)} />
                  <Info label="Orders" value={String(view.total_orders || 0)} />
                  <Info label="Sales" value={`৳${Number(view.total_sales || 0).toLocaleString()}`} />
                  <Info label="NID #" value={view.nid_number || "—"} />
                  <Info label="Trade Lic. #" value={view.trade_license_number || "—"} />
                  <Info label="Warnings" value={String(view.warning_count || 0)} />
                </div>

                {view.rejection_reason && (
                  <Card className="p-3 bg-muted/50 text-sm">
                    <p className="text-xs text-muted-foreground mb-1">Reason on file</p>
                    <p>{view.rejection_reason}</p>
                  </Card>
                )}

                {(images.nid_front_image || images.nid_back_image || images.birth_certificate_image || images.trade_license_image) && (
                  <div>
                    <p className="text-sm font-medium mb-2">Documents</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {images.nid_front_image && <DocImg src={images.nid_front_image} label="NID Front" />}
                      {images.nid_back_image && <DocImg src={images.nid_back_image} label="NID Back" />}
                      {images.birth_certificate_image && <DocImg src={images.birth_certificate_image} label="Birth Cert." />}
                      {images.trade_license_image && <DocImg src={images.trade_license_image} label="Trade License" />}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-wrap gap-2">
                {canApprove && view.status === "pending" && (
                  <>
                    <Button onClick={() => doSimple(view.id, "approve")} disabled={busy}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button variant="outline" onClick={() => { setAction({ open: true, id: view.id, kind: "reject" }); setReason(""); }} disabled={busy}>
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </>
                )}
                {canSuspend && view.status === "approved" && (
                  <Button variant="outline" onClick={() => { setAction({ open: true, id: view.id, kind: "suspend" }); setReason(""); }} disabled={busy}>
                    <Pause className="h-4 w-4 mr-1" /> Suspend
                  </Button>
                )}
                {canApprove && view.status === "suspended" && (
                  <Button onClick={() => doSimple(view.id, "unsuspend")} disabled={busy}>
                    <Play className="h-4 w-4 mr-1" /> Reactivate
                  </Button>
                )}
                {canSuspend && view.status !== "banned" && (
                  <Button variant="outline" onClick={() => { setAction({ open: true, id: view.id, kind: "ban" }); setReason(""); }} disabled={busy}>
                    <Ban className="h-4 w-4 mr-1" /> Ban
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
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

function DocImg({ src, label }: { src: string; label: string }) {
  return (
    <a href={src} target="_blank" rel="noreferrer" className="block group">
      <div className="aspect-video rounded-md overflow-hidden bg-muted border">
        <img src={src} alt={label} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
      </div>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </a>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    rejected: "bg-rose-100 text-rose-800 border-rose-200",
    suspended: "bg-orange-100 text-orange-800 border-orange-200",
    banned: "bg-zinc-200 text-zinc-800 border-zinc-300",
  };
  return <Badge variant="outline" className={map[status] || ""}>{status}</Badge>;
}
