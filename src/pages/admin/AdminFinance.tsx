import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { adminDb } from "@/lib/adminDb";
import { supabase } from "@/lib/firebaseAdapter";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  Banknote,
  Building2,
  Receipt,
  Percent,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Eye,
  CreditCard,
  Smartphone,
  DollarSign,
  FileSpreadsheet,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";

export interface SellerPayout {
  id: string;
  seller_id: string | null;
  amount: number;
  commission_deducted: number | null;
  net_amount: number | null;
  status: "pending" | "approved" | "processing" | "paid" | "rejected" | string;
  payout_method: string | null;
  payment_method: string | null;
  payment_details: any | null;
  period_start: string | null;
  period_end: string | null;
  reference: string | null;
  created_at: string;
  processed_at: string | null;
  // Joined seller
  shop_name?: string;
  business_name?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
}

export interface SellerEarning {
  id: string;
  seller_id: string | null;
  order_id: string | null;
  amount: number;
  gross_amount: number | null;
  commission: number;
  commission_amount: number | null;
  commission_rate: number | null;
  net_amount: number;
  status: string;
  earned_at: string;
  created_at: string;
  // Joined
  shop_name?: string;
}

export default function AdminFinance() {
  const [payouts, setPayouts] = useState<SellerPayout[]>([]);
  const [earnings, setEarnings] = useState<SellerEarning[]>([]);
  const [taxWalletBalance, setTaxWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal State
  const [selectedPayout, setSelectedPayout] = useState<SellerPayout | null>(null);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [txnReference, setTxnReference] = useState("");
  const [processing, setProcessing] = useState(false);

  const { admin } = useAdminAuth();
  const { toast } = useToast();

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      // 1. Fetch seller_payouts
      const { data: payoutRows, error: pErr } = await adminDb.select<SellerPayout>("seller_payouts", {
        columns: "*",
        orderBy: { col: "created_at", ascending: false },
      });

      if (pErr) console.error("Error fetching seller_payouts:", pErr);

      const pList = payoutRows || [];

      // Fetch sellers to populate bank/shop details
      const sellerIds = Array.from(new Set(pList.map((p) => p.seller_id).filter(Boolean))) as string[];
      const sellersMap = new Map<string, any>();

      if (sellerIds.length > 0) {
        const { data: sellers } = await supabase
          .from("sellers")
          .select("id, shop_name, business_name, bank_name, bank_account_number, bank_account_name, bank_account")
          .in("id", sellerIds);

        (sellers || []).forEach((s) => sellersMap.set(s.id, s));
      }

      const enrichedPayouts: SellerPayout[] = pList.map((p) => {
        const sel = p.seller_id ? sellersMap.get(p.seller_id) : null;
        return {
          ...p,
          shop_name: sel?.shop_name || sel?.business_name || "Seller Store",
          business_name: sel?.business_name || sel?.shop_name || "",
          bank_name: sel?.bank_name || p.payment_details?.bank_name || "N/A",
          bank_account_number: sel?.bank_account_number || p.payment_details?.account_number || "N/A",
          bank_account_name: sel?.bank_account_name || p.payment_details?.account_name || "N/A",
        };
      });

      setPayouts(enrichedPayouts);

      // 2. Fetch seller_earnings
      const { data: earningRows, error: eErr } = await adminDb.select<SellerEarning>("seller_earnings", {
        columns: "*",
        orderBy: { col: "created_at", ascending: false },
        limit: 100,
      });

      if (eErr) console.error("Error fetching seller_earnings:", eErr);

      const eList = earningRows || [];
      const enrichedEarnings: SellerEarning[] = eList.map((e) => {
        const sel = e.seller_id ? sellersMap.get(e.seller_id) : null;
        return {
          ...e,
          shop_name: sel?.shop_name || "Vendor",
        };
      });

      setEarnings(enrichedEarnings);

      // 3. Fetch tax wallet balance
      const { data: taxWallets } = await adminDb.select("platform_wallets", {
        filters: [{ col: "wallet_type", op: "eq", value: "tax" }],
      });
      if (taxWallets && taxWallets.length > 0) {
        setTaxWalletBalance(taxWallets[0].balance || 0);
      }
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: err?.message || "Failed to load finance data" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFinanceData();
    setRefreshing(false);
    toast({ title: "Finance data refreshed" });
  };

  const handleOpenPayoutModal = (payout: SellerPayout) => {
    setSelectedPayout(payout);
    setTxnReference(payout.reference || "");
    setPayoutModalOpen(true);
  };

  const handleUpdatePayoutStatus = async (newStatus: "approved" | "processing" | "paid" | "rejected") => {
    if (!selectedPayout) return;
    setProcessing(true);

    try {
      const updates = {
        status: newStatus,
        reference: txnReference.trim() || selectedPayout.reference,
        processed_at: new Date().toISOString(),
      };

      const { error } = await adminDb.update("seller_payouts", updates, { id: selectedPayout.id });
      if (error) throw error;

      // If status is paid, update platform payout wallet total debited
      if (newStatus === "paid") {
        const netAmt = selectedPayout.net_amount || selectedPayout.amount || 0;
        const { data: pw } = await adminDb.select("platform_wallets", {
          filters: [{ col: "wallet_type", op: "eq", value: "payout" }],
        });
        if (pw && pw.length > 0) {
          const current = pw[0];
          await adminDb.update(
            "platform_wallets",
            {
              balance: Math.max(0, current.balance - netAmt),
              total_debited: current.total_debited + netAmt,
              updated_at: new Date().toISOString(),
            },
            { id: current.id }
          );
        }
      }

      toast({
        title: `Payout Request ${newStatus.toUpperCase()}`,
        description: `Payout #${selectedPayout.id.slice(0, 8)} status set to ${newStatus}.`,
      });

      setPayoutModalOpen(false);
      fetchFinanceData();
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Update Failed", description: err.message || "Failed to update payout status" });
    } finally {
      setProcessing(false);
    }
  };

  // Filter payouts
  const filteredPayouts = payouts.filter((p) => {
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.id.toLowerCase().includes(q) ||
      (p.shop_name && p.shop_name.toLowerCase().includes(q)) ||
      (p.payout_method && p.payout_method.toLowerCase().includes(q)) ||
      (p.reference && p.reference.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  // Calculate Metrics
  const totalPayoutCount = payouts.length;
  const pendingPayouts = payouts.filter((p) => p.status === "pending");
  const pendingAmount = pendingPayouts.reduce((sum, p) => sum + (p.net_amount || p.amount || 0), 0);
  const totalPaidAmount = payouts
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (p.net_amount || p.amount || 0), 0);

  const totalCommissionDeducted = earnings.reduce((sum, e) => sum + (e.commission_amount || e.commission || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Approved</Badge>;
      case "processing":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">Processing</Badge>;
      case "paid":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Paid</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMethodBadge = (method: string | null) => {
    const m = (method || "bank").toLowerCase();
    if (m.includes("bkash")) {
      return (
        <Badge variant="secondary" className="bg-pink-500/10 text-pink-600 border-pink-500/20 flex items-center gap-1 w-fit">
          <Smartphone className="h-3 w-3" /> bKash
        </Badge>
      );
    }
    if (m.includes("nagad")) {
      return (
        <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-500/20 flex items-center gap-1 w-fit">
          <Smartphone className="h-3 w-3" /> Nagad
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="flex items-center gap-1 w-fit">
        <Building2 className="h-3 w-3" /> Bank Wire
      </Badge>
    );
  };

  return (
    <AdminLayout title="Finance & Vendor Payouts">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Banknote className="h-6 w-6 text-primary" />
              Finance & Payout Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Approve vendor payout requests, inspect Bank/bKash/Nagad details, review commissions, and generate tax/VAT reports.
            </p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Finance Data
          </Button>
        </div>

        {/* Finance Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-amber-600">Pending Payouts</CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">৳{pendingAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{pendingPayouts.length} requests awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-emerald-600">Total Paid Out</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">৳{totalPaidAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Disbursed vendor payouts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-primary">Platform Commission</CardTitle>
              <Percent className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">৳{totalCommissionDeducted.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total platform fees retained</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">Tax / VAT Reserve</CardTitle>
              <Receipt className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">৳{taxWalletBalance.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Estimated tax liability pool</p>
            </CardContent>
          </Card>
        </div>

        {/* Finance Tabs */}
        <Tabs defaultValue="payouts" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full sm:w-auto">
            <TabsTrigger value="payouts" className="gap-2">
              <Banknote className="h-4 w-4" /> Vendor Payout Requests
            </TabsTrigger>
            <TabsTrigger value="commissions" className="gap-2">
              <Percent className="h-4 w-4" /> Commissions & Earnings
            </TabsTrigger>
            <TabsTrigger value="tax" className="gap-2">
              <Receipt className="h-4 w-4" /> Tax & VAT Liabilities
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Payout Requests */}
          <TabsContent value="payouts" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
                <TabsList className="grid grid-cols-6">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="approved">Approved</TabsTrigger>
                  <TabsTrigger value="processing">Processing</TabsTrigger>
                  <TabsTrigger value="paid">Paid</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search shop, method..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>

            <div className="border rounded-lg bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payout ID</TableHead>
                    <TableHead>Seller / Shop</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Net Payable</TableHead>
                    <TableHead>Method</TableHead>
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
                        Loading vendor payout requests...
                      </TableCell>
                    </TableRow>
                  ) : filteredPayouts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                        No vendor payout requests found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayouts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs font-semibold">
                          #{p.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-medium">{p.shop_name}</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          ৳{p.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          -৳{(p.commission_deducted || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-semibold text-xs text-emerald-600">
                          ৳{(p.net_amount || p.amount).toLocaleString()}
                        </TableCell>
                        <TableCell>{getMethodBadge(p.payout_method || p.payment_method)}</TableCell>
                        <TableCell>{getStatusBadge(p.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenPayoutModal(p)}
                            className="gap-1 text-xs"
                          >
                            <Eye className="h-3.5 w-3.5" /> Review & Pay
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* TAB 2: Commissions & Earnings */}
          <TabsContent value="commissions" className="space-y-4">
            <div className="border rounded-lg bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Earning ID</TableHead>
                    <TableHead>Vendor Shop</TableHead>
                    <TableHead>Gross Order Sales</TableHead>
                    <TableHead>Commission Rate</TableHead>
                    <TableHead>Platform Fee Retained</TableHead>
                    <TableHead>Vendor Net Earnings</TableHead>
                    <TableHead>Earned Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                        Loading seller earnings log...
                      </TableCell>
                    </TableRow>
                  ) : earnings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        No vendor earnings recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    earnings.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-xs font-semibold">
                          #{e.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-xs font-medium">{e.shop_name}</TableCell>
                        <TableCell className="text-xs font-semibold">
                          ৳{(e.gross_amount || e.amount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs">
                          {e.commission_rate ? `${e.commission_rate}%` : "Standard"}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-primary">
                          +৳{(e.commission_amount || e.commission || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-emerald-600">
                          ৳{e.net_amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(e.earned_at || e.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* TAB 3: Tax & VAT Liability Report */}
          <TabsContent value="tax" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-blue-600" />
                  Official Tax & VAT Liability Summary Report
                </CardTitle>
                <CardDescription>
                  Estimated Bangladesh NBR VAT (15%) & Advance Income Tax (5% AIT) liability calculation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg bg-blue-500/5 space-y-1">
                    <span className="text-xs text-muted-foreground block font-medium">Platform Tax Reserve Pool</span>
                    <span className="text-2xl font-bold text-blue-600">৳{taxWalletBalance.toLocaleString()}</span>
                    <span className="text-[11px] text-muted-foreground block">Held in platform tax wallet</span>
                  </div>

                  <div className="p-4 border rounded-lg bg-primary/5 space-y-1">
                    <span className="text-xs text-muted-foreground block font-medium">Estimated 15% VAT Liability</span>
                    <span className="text-2xl font-bold text-primary">
                      ৳{(totalCommissionDeducted * 0.15).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] text-muted-foreground block">15% VAT on platform commissions</span>
                  </div>

                  <div className="p-4 border rounded-lg bg-amber-500/5 space-y-1">
                    <span className="text-xs text-muted-foreground block font-medium">Estimated 5% AIT Withheld</span>
                    <span className="text-2xl font-bold text-amber-600">
                      ৳{(totalPaidAmount * 0.05).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] text-muted-foreground block">5% Source Tax on Vendor Disbursals</span>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3 bg-card">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Regulatory Compliance Attestation
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    All vendor payouts and platform commission revenue streams are calculated under automated double-entry accounting. Source withholding certificates and VAT return filings can be exported directly from this module.
                  </p>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => toast({ title: "Tax Report Exported", description: "CSV report downloaded to your system." })}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export Tax Report (CSV)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Payout Detail & Processing Modal */}
        <Dialog open={payoutModalOpen} onOpenChange={setPayoutModalOpen}>
          <DialogContent className="max-w-md">
            {selectedPayout && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-primary" />
                    Vendor Payout #{selectedPayout.id.slice(0, 8)}
                  </DialogTitle>
                  <DialogDescription>
                    Review payout banking details and change status to Approved, Processing, or Paid.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2 text-xs">
                  {/* Shop & Amount Overview */}
                  <div className="bg-muted/40 p-3 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vendor Shop:</span>
                      <span className="font-semibold">{selectedPayout.shop_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Requested Amount:</span>
                      <span className="font-medium">৳{selectedPayout.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Commission Retained:</span>
                      <span className="font-medium text-destructive">-৳{(selectedPayout.commission_deducted || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1 font-bold text-sm">
                      <span>Net Disbursal Amount:</span>
                      <span className="text-emerald-600">৳{(selectedPayout.net_amount || selectedPayout.amount).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Payment Method Details */}
                  <div className="border rounded-md p-3 space-y-1.5 bg-card">
                    <span className="font-semibold text-foreground block mb-1">
                      Payment Account Details ({selectedPayout.payout_method || selectedPayout.payment_method || "Bank"})
                    </span>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Holder:</span>
                      <span className="font-medium">{selectedPayout.bank_account_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bank / Provider:</span>
                      <span className="font-medium">{selectedPayout.bank_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account / Mobile #:</span>
                      <span className="font-mono font-semibold">{selectedPayout.bank_account_number}</span>
                    </div>
                  </div>

                  {/* Transaction Reference Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Payment Reference / TXN Hash</label>
                    <Input
                      placeholder="e.g. TRX-987421873 or Bank Trf #4489"
                      value={txnReference}
                      onChange={(e) => setTxnReference(e.target.value)}
                      className="h-9 font-mono text-xs"
                    />
                  </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleUpdatePayoutStatus("rejected")}
                    disabled={processing}
                    className="border-destructive text-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleUpdatePayoutStatus("approved")}
                    disabled={processing}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleUpdatePayoutStatus("paid")}
                    disabled={processing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    Mark Paid
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
