import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { adminDb } from "@/lib/adminDb";
import { supabase } from "@/lib/firebaseAdapter";
import { db } from "@/integrations/firebase/client";
import { collection, getDocs, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  RotateCcw,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  Eye,
  FileImage,
  User,
  Store,
  ShoppingBag,
  ExternalLink,
  Trash2
} from "lucide-react";

export interface ReturnRequest {
  id: string;
  order_id: string;
  user_id: string;
  seller_id: string | null;
  reason: string;
  details: string | null;
  status: "pending" | "approved" | "rejected" | "refunded" | string;
  refund_amount: number | null;
  images: string[] | null;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
  // Joined fields
  order_number?: string;
  customer_name?: string;
  customer_email?: string;
  phone?: string;
  shop_name?: string;
}

export default function AdminReturns() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [refundInput, setRefundInput] = useState<number | "">(0);
  const [processing, setProcessing] = useState(false);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  const { admin } = useAdminAuth();
  const { toast } = useToast();

  const fetchReturns = async () => {
    setLoading(true);
    let returnMap = new Map<string, ReturnRequest>();

    // 1. Fetch from Supabase / adminDb
    try {
      const { data: rows } = await adminDb.select<ReturnRequest>("return_requests", {
        columns: "*",
        orderBy: { col: "created_at", ascending: false },
      });
      if (rows && rows.length > 0) {
        rows.forEach(r => returnMap.set(r.id, r));
      }
    } catch (e) {}

    try {
      const { data: altRows } = await supabase.from("returns" as any).select("*");
      if (altRows && altRows.length > 0) {
        altRows.forEach((r: any) => {
          const key = r.id || `RET-${r.order_id}`;
          if (!returnMap.has(key)) {
            returnMap.set(key, {
              id: key,
              order_id: r.order_id || key,
              user_id: r.user_id || "",
              seller_id: r.seller_id || null,
              reason: r.reason || "Return Requested",
              details: r.details || r.note || "",
              status: (r.status || "pending").toLowerCase(),
              refund_amount: Number(r.refund_amount || 0),
              images: r.images || [],
              created_at: r.created_at || new Date().toISOString(),
              processed_at: r.processed_at || null,
              processed_by: r.processed_by || null,
              order_number: r.order_number,
              customer_name: r.customer_name,
              customer_email: r.customer_email,
              phone: r.phone
            });
          }
        });
      }
    } catch (e) {}

    // 2. Fetch from Firestore return_requests and returns
    try {
      const snap1 = await getDocs(collection(db, "return_requests"));
      if (!snap1.empty) {
        snap1.forEach(d => {
          const data = d.data();
          const key = d.id;
          returnMap.set(key, {
            id: key,
            order_id: data.order_id || key,
            user_id: data.user_id || "",
            seller_id: data.seller_id || null,
            reason: data.reason || "Return Requested",
            details: data.details || data.note || "",
            status: (data.status || "pending").toLowerCase(),
            refund_amount: Number(data.refund_amount || 0),
            images: data.images || [],
            created_at: data.created_at || new Date().toISOString(),
            processed_at: data.processed_at || null,
            processed_by: data.processed_by || null,
            order_number: data.order_number,
            customer_name: data.customer_name,
            customer_email: data.customer_email,
            phone: data.phone
          });
        });
      }

      const snap2 = await getDocs(collection(db, "returns"));
      if (!snap2.empty) {
        snap2.forEach(d => {
          const data = d.data();
          const key = d.id;
          if (!returnMap.has(key)) {
            returnMap.set(key, {
              id: key,
              order_id: data.order_id || key,
              user_id: data.user_id || "",
              seller_id: data.seller_id || null,
              reason: data.reason || "Return Requested",
              details: data.details || data.note || "",
              status: (data.status || "pending").toLowerCase(),
              refund_amount: Number(data.refund_amount || 0),
              images: data.images || [],
              created_at: data.created_at || new Date().toISOString(),
              processed_at: data.processed_at || null,
              processed_by: data.processed_by || null,
              order_number: data.order_number,
              customer_name: data.customer_name,
              customer_email: data.customer_email,
              phone: data.phone
            });
          }
        });
      }
    } catch (fsErr) {
      console.warn("Firestore returns fetch error:", fsErr);
    }

    // 3. Check LocalStorage
    try {
      const raw1 = localStorage.getItem("enterprise_admin_returns") || localStorage.getItem("durtup_return_requests");
      if (raw1) {
        const localList = JSON.parse(raw1);
        if (Array.isArray(localList)) {
          localList.forEach((r: any) => {
            const key = r.id || `RET-${r.order_id}`;
            if (!returnMap.has(key)) {
              returnMap.set(key, {
                id: key,
                order_id: r.order_id || key,
                user_id: r.user_id || "",
                seller_id: r.seller_id || null,
                reason: r.reason || "Return Requested",
                details: r.details || r.note || "",
                status: (r.status || "pending").toLowerCase(),
                refund_amount: Number(r.refund_amount || 0),
                images: r.images || [],
                created_at: r.created_at || new Date().toISOString(),
                processed_at: r.processed_at || null,
                processed_by: r.processed_by || null,
                order_number: r.order_number,
                customer_name: r.customer_name,
                customer_email: r.customer_email,
                phone: r.phone
              });
            }
          });
        }
      }
    } catch (lsErr) {}

    // 4. Also scan orders with return_requested flag
    try {
      const snapOrders = await getDocs(collection(db, "orders"));
      if (!snapOrders.empty) {
        snapOrders.forEach(d => {
          const od = d.data();
          if (od.return_requested) {
            const key = `RET-${d.id}`;
            if (!returnMap.has(key)) {
              const custName = od.shipping_address ? `${od.shipping_address.firstName || ""} ${od.shipping_address.lastName || ""}`.trim() : "Customer";
              returnMap.set(key, {
                id: key,
                order_id: d.id,
                user_id: od.user_id || "",
                seller_id: null,
                reason: od.return_reason || "Customer requested return",
                details: od.return_note || "",
                status: (od.return_status || "pending").toLowerCase(),
                refund_amount: Number(od.total || od.totalAmount || 0),
                images: [],
                created_at: od.updated_at || od.created_at || new Date().toISOString(),
                processed_at: null,
                processed_by: null,
                order_number: od.order_number || d.id.slice(0, 10),
                customer_name: custName || "Customer",
                customer_email: od.shipping_address?.email || "",
                phone: od.shipping_address?.phone || ""
              });
            }
          }
        });
      }
    } catch {}

    const list = Array.from(returnMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setReturns(list);
    setLoading(false);
  };

  useEffect(() => {
    fetchReturns();

    // Realtime listeners
    const unsub1 = onSnapshot(collection(db, "return_requests"), () => fetchReturns(), () => {});
    const unsub2 = onSnapshot(collection(db, "returns"), () => fetchReturns(), () => {});
    const onStorage = () => fetchReturns();
    window.addEventListener("storage", onStorage);

    return () => {
      unsub1();
      unsub2();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReturns();
    setRefreshing(false);
    toast({ title: "Return requests refreshed" });
  };

  const handleOpenModal = (item: ReturnRequest) => {
    setSelectedReturn(item);
    setResolutionNotes(item.details || "");
    setRefundInput(item.refund_amount || 0);
    setModalOpen(true);
  };

  const handleUpdateStatus = async (newStatus: "approved" | "rejected" | "refunded") => {
    if (!selectedReturn) return;
    setProcessing(true);
    const nowIso = new Date().toISOString();
    const refundAmt = typeof refundInput === "number" ? refundInput : Number(refundInput) || 0;

    try {
      const updates = {
        status: newStatus,
        refund_amount: refundAmt,
        details: resolutionNotes ? `${selectedReturn.reason} | Resolution: ${resolutionNotes}` : selectedReturn.details,
        processed_at: nowIso,
        processed_by: admin?.id || admin?.username || "admin",
      };

      // 1. Update React state immediately
      setReturns(prev => prev.map(r => r.id === selectedReturn.id ? { ...r, ...updates } : r));

      // 2. Update Firestore
      try {
        await setDoc(doc(db, "return_requests", selectedReturn.id), updates, { merge: true });
        await setDoc(doc(db, "returns", selectedReturn.id), updates, { merge: true });
        if (selectedReturn.order_id) {
          await setDoc(doc(db, "orders", selectedReturn.order_id), {
            return_status: newStatus,
            payment_status: newStatus === "refunded" ? "refunded" : undefined,
            status: newStatus === "refunded" ? "cancelled" : undefined,
            updated_at: nowIso
          }, { merge: true });
        }
      } catch (fsErr) {
        console.warn("Firestore return update error:", fsErr);
      }

      // 3. Update Supabase
      try {
        await supabase.from("return_requests" as any).update(updates).eq("id", selectedReturn.id);
        await supabase.from("returns" as any).update(updates).eq("id", selectedReturn.id);
      } catch {}

      // 4. Update LocalStorage
      try {
        const raw = localStorage.getItem("enterprise_admin_returns") || localStorage.getItem("durtup_return_requests");
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const updated = list.map((r: any) => r.id === selectedReturn.id ? { ...r, ...updates } : r);
            localStorage.setItem("enterprise_admin_returns", JSON.stringify(updated));
            localStorage.setItem("durtup_return_requests", JSON.stringify(updated));
          }
        }
      } catch {}

      toast({
        title: `Return ${newStatus.toUpperCase()}`,
        description: `Return request status set to ${newStatus}.`,
      });

      setModalOpen(false);
      fetchReturns();
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Update Failed", description: err.message || "Failed to update return status" });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteReturn = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this return record?")) return;
    try {
      setReturns(prev => prev.filter(r => r.id !== id));
      try {
        await deleteDoc(doc(db, "return_requests", id));
        await deleteDoc(doc(db, "returns", id));
      } catch {}
      try {
        await supabase.from("return_requests" as any).delete().eq("id", id);
        await supabase.from("returns" as any).delete().eq("id", id);
      } catch {}
      try {
        const raw = localStorage.getItem("enterprise_admin_returns") || localStorage.getItem("durtup_return_requests");
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const filtered = list.filter((r: any) => r.id !== id);
            localStorage.setItem("enterprise_admin_returns", JSON.stringify(filtered));
            localStorage.setItem("durtup_return_requests", JSON.stringify(filtered));
          }
        }
      } catch {}
      toast({ title: "Return record deleted" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to delete return" });
    }
  };

  // Filter returns
  const filteredReturns = returns.filter((item) => {
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.id.toLowerCase().includes(q) ||
      (item.order_number && item.order_number.toLowerCase().includes(q)) ||
      (item.customer_name && item.customer_name.toLowerCase().includes(q)) ||
      (item.customer_email && item.customer_email.toLowerCase().includes(q)) ||
      (item.phone && item.phone.toLowerCase().includes(q)) ||
      (item.shop_name && item.shop_name.toLowerCase().includes(q)) ||
      (item.reason && item.reason.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  // Calculate Metrics
  const totalCount = returns.length;
  const pendingCount = returns.filter((r) => r.status === "pending").length;
  const approvedCount = returns.filter((r) => r.status === "approved").length;
  const totalRefunded = returns
    .filter((r) => r.status === "refunded" || r.status === "approved")
    .reduce((sum, r) => sum + (r.refund_amount || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Rejected</Badge>;
      case "refunded":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout title="Returns & Refunds">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <RotateCcw className="h-6 w-6 text-primary" />
              Return Requests & Refunds
            </h1>
            <p className="text-sm text-muted-foreground">
              Review customer return requests, inspect reasons, approve or reject, and process refunds.
            </p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Returns</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{totalCount}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">All logged return requests</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <RotateCcw className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600 font-medium">Pending Review</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Requires admin action</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium">Approved</p>
                <h3 className="text-2xl font-bold text-blue-600 mt-1">{approvedCount}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Ready or processing refund</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600 font-medium">Total Refunded</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">৳{totalRefunded.toLocaleString()}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Processed refund amount</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-5 w-full sm:w-auto">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
              <TabsTrigger value="approved" className="text-xs">Approved</TabsTrigger>
              <TabsTrigger value="rejected" className="text-xs">Rejected</TabsTrigger>
              <TabsTrigger value="refunded" className="text-xs">Refunded</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search return #, order, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {/* Returns Table */}
        <div className="border rounded-xl bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs">Return ID</TableHead>
                <TableHead className="text-xs">Order #</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Reason</TableHead>
                <TableHead className="text-xs">Refund Amount</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading return requests...
                  </TableCell>
                </TableRow>
              ) : filteredReturns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No return requests found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReturns.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/20">
                    <TableCell className="font-mono text-xs font-semibold text-foreground">
                      #{item.id.slice(0, 10)}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      #{item.order_number || item.order_id?.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <p className="font-semibold text-foreground">{item.customer_name || "Customer"}</p>
                      {item.phone && <p className="text-muted-foreground text-[11px]">📞 {item.phone}</p>}
                      {item.customer_email && <p className="text-muted-foreground text-[11px] truncate max-w-[140px]">{item.customer_email}</p>}
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px]">
                      <p className="font-medium text-foreground truncate">{item.reason}</p>
                      {item.details && item.details !== item.reason && (
                        <p className="text-muted-foreground text-[11px] line-clamp-1">{item.details}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-primary">
                      ৳{(item.refund_amount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs">
                      {getStatusBadge(item.status)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenModal(item)}
                          className="h-8 text-xs font-semibold px-2.5 gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" /> Review
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteReturn(item.id)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Review & Action Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <RotateCcw className="h-5 w-5 text-primary" />
              Review Return Request #{selectedReturn?.id.slice(0, 10)}
            </DialogTitle>
            <DialogDescription>
              Order #{selectedReturn?.order_number || selectedReturn?.order_id} • Customer: {selectedReturn?.customer_name} ({selectedReturn?.phone || "No phone"})
            </DialogDescription>
          </DialogHeader>

          {selectedReturn && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-muted/50 rounded-xl space-y-1.5 border">
                <p><strong className="text-foreground">Return Reason:</strong> {selectedReturn.reason}</p>
                {selectedReturn.details && (
                  <p><strong className="text-foreground">Customer Note:</strong> {selectedReturn.details}</p>
                )}
                <p><strong className="text-foreground">Current Status:</strong> {selectedReturn.status.toUpperCase()}</p>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Refund Amount (৳)</label>
                <Input
                  type="number"
                  value={refundInput}
                  onChange={(e) => setRefundInput(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="e.g. 1320"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Admin Resolution Note</label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Notes on resolution (e.g. Approved and customer refunded via bKash)..."
                  rows={3}
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleUpdateStatus("rejected")} 
                  disabled={processing}
                  className="text-xs"
                >
                  <XCircle className="h-4 w-4 mr-1" /> Reject Return
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleUpdateStatus("approved")} 
                  disabled={processing}
                  className="text-xs"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1 text-blue-600" /> Approve Return
                </Button>
                <Button 
                  size="sm"
                  onClick={() => handleUpdateStatus("refunded")} 
                  disabled={processing}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  <DollarSign className="h-4 w-4 mr-1" /> Process & Refund
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
