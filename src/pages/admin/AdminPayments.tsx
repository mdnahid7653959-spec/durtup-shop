import { useEffect, useState } from "react";
import { 
  CreditCard, 
  DollarSign, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RotateCcw, 
  Eye, 
  Copy, 
  Check, 
  FileText,
  Building2,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/firebaseAdapter";
import { adminDb } from "@/lib/adminDb";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export interface PaymentTransaction {
  id: string;
  order_id: string | null;
  user_id: string;
  payment_method: string;
  payment_provider: string | null;
  amount: number;
  currency: string;
  status: string; // 'pending' | 'paid' | 'failed' | 'refunded'
  provider_reference: string | null;
  provider_status: string | null;
  provider_response: any;
  transaction_id: string | null;
  refund_amount: number | null;
  refund_reason: string | null;
  refunded_at: string | null;
  paid_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: any;
  orders?: {
    order_number: string;
    total: number;
    status: string;
    shipping_address: any;
  } | null;
  customer?: {
    email?: string;
    full_name?: string | null;
    phone?: string | null;
  } | null;
}

const statusBadgeVariant: Record<string, { label: string; className: string; icon: any }> = {
  paid: { label: "Paid", className: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
  pending: { label: "Pending", className: "bg-warning/10 text-warning border-warning/20", icon: Clock },
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
  refunded: { label: "Refunded", className: "bg-muted text-muted-foreground border-muted", icon: RotateCcw },
};

const providerBadgeColors: Record<string, string> = {
  bkash: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  nagad: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  rocket: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  sslcommerz: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  stripe: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  paypal: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  cod: "bg-slate-500/10 text-slate-700 border-slate-500/20 dark:text-slate-300",
};

export default function AdminPayments() {
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");

  const { admin } = useAdminAuth();
  const { toast } = useToast();

  // Response Viewer Dialog State
  const [jsonViewerOpen, setJsonViewerOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentTransaction | null>(null);
  const [copied, setCopied] = useState(false);

  // Refund Modal State
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundPayment, setRefundPayment] = useState<PaymentTransaction | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [refundReason, setRefundReason] = useState<string>("");
  const [processingRefund, setProcessingRefund] = useState(false);

  const fetchPayments = async () => {
    try {
      // First attempt using adminDb to bypass RLS with admin credentials fallback
      const { data, error } = await adminDb.select<PaymentTransaction>("payments", {
        columns: `
          *,
          orders:orders(order_number, total, status, shipping_address)
        `,
        orderBy: { col: "created_at", ascending: false },
        limit: 200,
      } as any);

      if (error || !data) {
        // Fallback to direct client query
        const { data: directData, error: directErr } = await supabase
          .from("payments")
          .select(`
            *,
            orders:orders(order_number, total, status, shipping_address)
          `)
          .order("created_at", { ascending: false })
          .limit(200);

        if (directErr) {
          console.error("Fetch payments error:", directErr);
          toast({ variant: "destructive", title: "Error", description: "Failed to load payment transactions" });
        } else {
          setPayments((directData as unknown as PaymentTransaction[]) || []);
        }
      } else {
        setPayments((data as unknown as PaymentTransaction[]) || []);
      }
    } catch (err) {
      console.error("Payments load error:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to load payment ledger" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();

    // Real-time listener for payment updates
    const channel = supabase
      .channel("admin-payments-ledger")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => {
          fetchPayments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPayments();
    toast({ title: "Ledger updated", description: "Fetched live payment records" });
    setRefreshing(false);
  };

  const handleOpenJsonViewer = (payment: PaymentTransaction) => {
    setSelectedPayment(payment);
    setJsonViewerOpen(true);
    setCopied(false);
  };

  const handleCopyJson = () => {
    if (!selectedPayment) return;
    const jsonStr = JSON.stringify(selectedPayment.provider_response || selectedPayment.metadata || {}, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenRefundModal = (payment: PaymentTransaction) => {
    setRefundPayment(payment);
    setRefundAmount(payment.amount.toString());
    setRefundReason("");
    setRefundModalOpen(true);
  };

  const handleExecuteRefund = async () => {
    if (!refundPayment) return;
    const numericAmount = parseFloat(refundAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({ variant: "destructive", title: "Invalid amount", description: "Please enter a valid refund amount" });
      return;
    }

    setProcessingRefund(true);
    try {
      const nowIso = new Date().toISOString();
      const updatedFields = {
        status: "refunded",
        refund_amount: numericAmount,
        refund_reason: refundReason || "Admin initiated refund",
        refunded_at: nowIso,
        updated_at: nowIso,
      };

      // 1. Update Payments table
      const { error: payErr } = await adminDb.update("payments", updatedFields, { id: refundPayment.id });
      if (payErr) {
        // Direct DB fallback
        const { error: directPayErr } = await supabase
          .from("payments")
          .update(updatedFields)
          .eq("id", refundPayment.id);
        if (directPayErr) throw directPayErr;
      }

      // 2. Update linked Order if applicable
      if (refundPayment.order_id) {
        const orderUpdate = {
          payment_status: "refunded",
          status: "refunded",
          updated_at: nowIso,
        };
        await adminDb.update("orders", orderUpdate, { id: refundPayment.order_id });
        await supabase.from("orders").update(orderUpdate).eq("id", refundPayment.order_id);

        // 3. Create Audit Timeline entry
        const timelineRecord = {
          order_id: refundPayment.order_id,
          status: "refunded",
          notes: `Payment refunded: ৳${numericAmount.toLocaleString()} (${refundPayment.payment_method.toUpperCase()}). Reason: ${refundReason || 'Admin refund'}`,
          changed_by: admin?.displayName || admin?.username || "Admin",
          created_at: nowIso,
        };

        try {
          await supabase.from("order_timelines" as any).insert(timelineRecord);
        } catch {
          // Graceful fallback if table is handled differently
        }
      }

      toast({
        title: "Refund processed successfully",
        description: `Refunded ৳${numericAmount.toLocaleString()} for Txn #${refundPayment.id.slice(0, 8)}`,
      });

      setRefundModalOpen(false);
      fetchPayments();
    } catch (err: any) {
      console.error("Refund error:", err);
      toast({ variant: "destructive", title: "Refund failed", description: err.message || "Could not process refund" });
    } finally {
      setProcessingRefund(false);
    }
  };

  // Filtered Payments
  const filteredPayments = payments.filter((p) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      p.id.toLowerCase().includes(searchLower) ||
      (p.orders?.order_number && p.orders.order_number.toLowerCase().includes(searchLower)) ||
      (p.provider_reference && p.provider_reference.toLowerCase().includes(searchLower)) ||
      (p.payment_provider && p.payment_provider.toLowerCase().includes(searchLower)) ||
      (p.payment_method && p.payment_method.toLowerCase().includes(searchLower)) ||
      (p.transaction_id && p.transaction_id.toLowerCase().includes(searchLower));

    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesProvider =
      providerFilter === "all" ||
      (p.payment_provider && p.payment_provider.toLowerCase() === providerFilter.toLowerCase()) ||
      (p.payment_method && p.payment_method.toLowerCase() === providerFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesProvider;
  });

  // Summary Metrics
  const totalTransactions = payments.length;
  const totalVolume = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const successfulPayments = payments.filter((p) => p.status === "paid");
  const successfulVolume = successfulPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const refundedVolume = payments
    .filter((p) => p.status === "refunded")
    .reduce((sum, p) => sum + (p.refund_amount || p.amount || 0), 0);

  return (
    <AdminLayout title="Payments Ledger">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-primary" />
              Payments & Transaction Ledger
            </h1>
            <p className="text-sm text-muted-foreground">
              Real-time audit log of customer payment transactions, gateway responses, and refunds
            </p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Sync Ledger
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTransactions}</div>
              <p className="text-xs text-muted-foreground mt-1">Logged payment events</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Volume</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">৳{totalVolume.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Gross attempted volume</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Successful Payments</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {successfulPayments.length} <span className="text-sm font-normal text-muted-foreground">(৳{successfulVolume.toLocaleString()})</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Completed & cleared</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Refunded Volume</CardTitle>
              <RotateCcw className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">৳{refundedVolume.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Total returned to customers</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Txn ID, Order #, Provider Ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>

            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                <SelectItem value="bkash">bKash</SelectItem>
                <SelectItem value="nagad">Nagad</SelectItem>
                <SelectItem value="rocket">Rocket</SelectItem>
                <SelectItem value="sslcommerz">SSLCommerz</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="cod">Cash on Delivery</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Transaction Table */}
        <div className="border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction / Ref</TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Provider & Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Loading payments ledger...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No payment transactions found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => {
                  const statusInfo = statusBadgeVariant[payment.status] || {
                    label: payment.status,
                    className: "bg-muted text-muted-foreground",
                    icon: Clock,
                  };
                  const StatusIcon = statusInfo.icon;
                  const provKey = (payment.payment_provider || payment.payment_method || "").toLowerCase();
                  const provBadgeStyle = providerBadgeColors[provKey] || "bg-secondary text-secondary-foreground";

                  return (
                    <TableRow key={payment.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-mono text-xs font-semibold text-foreground">
                            {payment.transaction_id || payment.id.slice(0, 13)}
                          </p>
                          {payment.provider_reference && (
                            <p className="text-[11px] text-muted-foreground font-mono">
                              Ref: {payment.provider_reference}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        {payment.orders?.order_number ? (
                          <Badge variant="outline" className="font-mono text-xs">
                            #{payment.orders.order_number}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground font-mono">N/A</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge variant="secondary" className={`capitalize font-medium ${provBadgeStyle}`}>
                          {payment.payment_provider || payment.payment_method}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="font-bold text-foreground">
                          ৳{(payment.amount || 0).toLocaleString()}{" "}
                          <span className="text-[10px] font-normal text-muted-foreground uppercase">
                            {payment.currency || "BDT"}
                          </span>
                        </div>
                        {payment.refund_amount ? (
                          <p className="text-xs text-amber-600 font-medium">
                            Refunded: ৳{payment.refund_amount.toLocaleString()}
                          </p>
                        ) : null}
                      </TableCell>

                      <TableCell>
                        <Badge className={`inline-flex items-center gap-1 font-medium ${statusInfo.className}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        <p>{format(new Date(payment.created_at), "dd MMM yyyy")}</p>
                        <p className="text-[11px] opacity-75">{format(new Date(payment.created_at), "hh:mm a")}</p>
                      </TableCell>

                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenJsonViewer(payment)}>
                              <FileText className="h-4 w-4 mr-2" />
                              View Response JSON
                            </DropdownMenuItem>
                            {payment.status !== "refunded" && (
                              <DropdownMenuItem
                                onClick={() => handleOpenRefundModal(payment)}
                                className="text-amber-600 focus:text-amber-700"
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Process Refund
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Response JSON Viewer Dialog */}
      <Dialog open={jsonViewerOpen} onOpenChange={setJsonViewerOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Gateway Response Payload</span>
              <Button variant="outline" size="sm" onClick={handleCopyJson} className="mr-6">
                {copied ? <Check className="h-4 w-4 mr-1 text-success" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? "Copied" : "Copy JSON"}
              </Button>
            </DialogTitle>
            <DialogDescription>
              Transaction ID: <span className="font-mono">{selectedPayment?.id}</span> | Provider: {selectedPayment?.payment_provider || selectedPayment?.payment_method}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto bg-slate-950 text-slate-100 p-4 rounded-lg font-mono text-xs border border-slate-800">
            <pre>
              {JSON.stringify(
                selectedPayment?.provider_response || selectedPayment?.metadata || { message: "No raw payload recorded" },
                null,
                2
              )}
            </pre>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund Action Modal */}
      <Dialog open={refundModalOpen} onOpenChange={setRefundModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <RotateCcw className="h-5 w-5" />
              Process Payment Refund
            </DialogTitle>
            <DialogDescription>
              Order #{refundPayment?.orders?.order_number || "N/A"} | Txn #{refundPayment?.id.slice(0, 10)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Original Payment:</span>
                <span className="font-bold">৳{refundPayment?.amount.toLocaleString()} ({refundPayment?.currency})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method:</span>
                <span className="capitalize">{refundPayment?.payment_method}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund-amount">Refund Amount (৳)</Label>
              <Input
                id="refund-amount"
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="Enter amount to refund"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund-reason">Reason for Refund</Label>
              <Textarea
                id="refund-reason"
                rows={3}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Customer return, out of stock, duplicate payment..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundModalOpen(false)} disabled={processingRefund}>
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleExecuteRefund}
              disabled={processingRefund}
            >
              {processingRefund ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Confirm Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
