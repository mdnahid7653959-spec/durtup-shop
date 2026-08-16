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
    try {
      const { data: rows, error } = await adminDb.select<ReturnRequest>("return_requests", {
        columns: "*",
        orderBy: { col: "created_at", ascending: false },
      });

      if (error) {
        console.error("Error fetching return_requests:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to fetch return requests" });
        setReturns([]);
        setLoading(false);
        return;
      }

      const list = rows || [];

      // Fetch related orders, sellers, and profiles
      const orderIds = Array.from(new Set(list.map((r) => r.order_id).filter(Boolean)));
      const sellerIds = Array.from(new Set(list.map((r) => r.seller_id).filter(Boolean))) as string[];
      const userIds = Array.from(new Set(list.map((r) => r.user_id).filter(Boolean)));

      const ordersMap = new Map<string, any>();
      const sellersMap = new Map<string, any>();
      const usersMap = new Map<string, any>();

      if (orderIds.length > 0) {
        const { data: orders } = await supabase.from("orders").select("id, order_number, total_amount").in("id", orderIds);
        (orders || []).forEach((o) => ordersMap.set(o.id, o));
      }

      if (sellerIds.length > 0) {
        const { data: sellers } = await supabase.from("sellers").select("id, shop_name, business_name").in("id", sellerIds);
        (sellers || []).forEach((s) => sellersMap.set(s.id, s));
      }

      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
        (profiles || []).forEach((p) => usersMap.set(p.id, p));
      }

      const enriched: ReturnRequest[] = list.map((item) => {
        const ord = ordersMap.get(item.order_id);
        const sel = item.seller_id ? sellersMap.get(item.seller_id) : null;
        const usr = usersMap.get(item.user_id);
        return {
          ...item,
          order_number: ord?.order_number || item.order_id.slice(0, 8),
          customer_name: usr?.full_name || "Customer",
          customer_email: usr?.email || "",
          shop_name: sel?.shop_name || sel?.business_name || "Direct Store",
        };
      });

      setReturns(enriched);
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: err?.message || "Failed to load returns" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
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

    try {
      const updates = {
        status: newStatus,
        refund_amount: typeof refundInput === "number" ? refundInput : Number(refundInput) || 0,
        details: resolutionNotes ? `${selectedReturn.reason} | Resolution: ${resolutionNotes}` : selectedReturn.details,
        processed_at: new Date().toISOString(),
        processed_by: admin?.id || admin?.username || "admin",
      };

      const { error } = await adminDb.update("return_requests", updates, { id: selectedReturn.id });

      if (error) {
        throw error;
      }

      toast({
        title: `Return ${newStatus.toUpperCase()}`,
        description: `Return request #${selectedReturn.id.slice(0, 8)} status set to ${newStatus}.`,
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
              Review customer return requests, inspect photo evidence, approve or reject, and process refunds.
            </p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Returns</CardTitle>
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCount}</div>
              <p className="text-xs text-muted-foreground">All logged return requests</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-amber-600">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">Requires admin action</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">Approved</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{approvedCount}</div>
              <p className="text-xs text-muted-foreground">Ready or processing refund</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-emerald-600">Total Refunded</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">৳{totalRefunded.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Processed refund amount</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-5 w-full sm:w-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="refunded">Refunded</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search return #, order, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Returns Table */}
        <div className="border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Return ID</TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Seller / Shop</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Refund Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading return requests...
                  </TableCell>
                </TableRow>
              ) : filteredReturns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    No return requests found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReturns.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs font-semibold">
                      #{item.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium text-xs">
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                        {item.order_number}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <p className="font-medium">{item.customer_name}</p>
                        <p className="text-muted-foreground text-[11px] truncate max-w-[140px]">{item.customer_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-xs">
                        <Store className="h-3.5 w-3.5 text-muted-foreground" />
                        {item.shop_name}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[180px]">
                      <p className="text-xs font-medium truncate">{item.reason}</p>
                      {item.details && <p className="text-[11px] text-muted-foreground truncate">{item.details}</p>}
                    </TableCell>
                    <TableCell className="font-semibold text-xs">
                      ৳{(item.refund_amount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenModal(item)}
                        className="gap-1 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View & Resolve
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Resolution & Photo Viewer Dialog */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedReturn && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <RotateCcw className="h-5 w-5 text-primary" />
                    Return Request #{selectedReturn.id.slice(0, 8)}
                  </DialogTitle>
                  <DialogDescription>
                    Review customer return request details, inspect evidence, and decide resolution.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 p-3 rounded-lg text-xs">
                    <div>
                      <span className="text-muted-foreground block">Order Number</span>
                      <span className="font-medium">{selectedReturn.order_number}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Customer</span>
                      <span className="font-medium">{selectedReturn.customer_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Seller</span>
                      <span className="font-medium">{selectedReturn.shop_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Current Status</span>
                      {getStatusBadge(selectedReturn.status)}
                    </div>
                  </div>

                  {/* Reason & Details */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Return Reason</label>
                    <div className="p-3 rounded-md border bg-card text-xs font-medium">
                      {selectedReturn.reason}
                    </div>
                  </div>

                  {selectedReturn.details && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Customer Explanation / Details</label>
                      <div className="p-3 rounded-md border bg-card text-xs text-muted-foreground">
                        {selectedReturn.details}
                      </div>
                    </div>
                  )}

                  {/* Photo attachments viewer */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <FileImage className="h-4 w-4 text-primary" />
                      Photo Evidence Attachments ({selectedReturn.images?.length || 0})
                    </label>
                    {selectedReturn.images && selectedReturn.images.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {selectedReturn.images.map((imgUrl, idx) => (
                          <div
                            key={idx}
                            onClick={() => setActivePhoto(imgUrl)}
                            className="group relative aspect-square rounded-md overflow-hidden border cursor-pointer bg-muted hover:ring-2 hover:ring-primary transition"
                          >
                            <img src={imgUrl} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                              <Eye className="h-5 w-5" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 border border-dashed rounded-md text-center text-xs text-muted-foreground">
                        No photo evidence attached to this request.
                      </div>
                    )}
                  </div>

                  {/* Refund Amount Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Refund Amount (৳)</label>
                    <Input
                      type="number"
                      value={refundInput}
                      onChange={(e) => setRefundInput(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="0.00"
                      className="h-9"
                    />
                  </div>

                  {/* Resolution Notes */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Resolution Notes / Reason for Decision</label>
                    <Textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Enter admin resolution comments, refund instructions or rejection reasoning..."
                      rows={3}
                      className="text-xs"
                    />
                  </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus("rejected")}
                    disabled={processing}
                    className="border-destructive text-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Reject Return
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleUpdateStatus("approved")}
                    disabled={processing}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Approve Return
                  </Button>
                  <Button
                    onClick={() => handleUpdateStatus("refunded")}
                    disabled={processing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <DollarSign className="h-4 w-4 mr-1.5" />
                    Approve & Issue Refund
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Full Image Lightbox Modal */}
        <Dialog open={!!activePhoto} onOpenChange={() => setActivePhoto(null)}>
          <DialogContent className="max-w-3xl p-2 bg-black/90 border-none">
            {activePhoto && (
              <div className="relative flex items-center justify-center p-2">
                <img src={activePhoto} alt="Full attachment" className="max-h-[80vh] w-auto object-contain rounded-md" />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
