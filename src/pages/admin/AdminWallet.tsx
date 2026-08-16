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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { adminDb } from "@/lib/adminDb";
import { supabase } from "@/lib/firebaseAdapter";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  Search,
  RefreshCw,
  Landmark,
  ShieldAlert,
  Coins,
  Percent,
  Receipt,
  UserCheck,
  Building2,
} from "lucide-react";

export interface PlatformWallet {
  id: string;
  wallet_type: "commission" | "tax" | "payout" | "reserve" | string;
  balance: number;
  currency: string;
  total_credited: number;
  total_debited: number;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: "credit" | "debit" | string | null;
  transaction_type: string | null;
  category: string | null;
  description: string | null;
  reference_id: string | null;
  balance_after: number | null;
  created_at: string;
  // Resolved info
  user_name?: string;
  user_email?: string;
}

export default function AdminWallet() {
  const [platformWallets, setPlatformWallets] = useState<PlatformWallet[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [adjustType, setAdjustType] = useState<"credit" | "debit">("credit");
  const [adjustCategory, setAdjustCategory] = useState("adjustment");
  const [adjustAmount, setAdjustAmount] = useState<number | "">("");
  const [adjustDescription, setAdjustDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { toast } = useToast();

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      // 1. Fetch platform_wallets
      const { data: pWallets, error: pErr } = await adminDb.select<PlatformWallet>("platform_wallets", {
        columns: "*",
        orderBy: { col: "wallet_type", ascending: true },
      });

      if (pErr) {
        console.error("Error fetching platform_wallets:", pErr);
      }

      let wallets = pWallets || [];

      // If platform_wallets table is empty, seed defaults
      const requiredTypes = ["commission", "tax", "payout", "reserve"];
      const existingTypes = new Set(wallets.map((w) => w.wallet_type));
      const missingTypes = requiredTypes.filter((t) => !existingTypes.has(t));

      if (missingTypes.length > 0) {
        for (const missing of missingTypes) {
          await adminDb.insert("platform_wallets", {
            wallet_type: missing,
            balance: 0,
            currency: "BDT",
            total_credited: 0,
            total_debited: 0,
          });
        }
        const { data: refetched } = await adminDb.select<PlatformWallet>("platform_wallets", { columns: "*" });
        if (refetched) wallets = refetched;
      }

      setPlatformWallets(wallets);

      // 2. Fetch wallet_transactions
      const { data: txRows, error: txErr } = await adminDb.select<WalletTransaction>("wallet_transactions", {
        columns: "*",
        orderBy: { col: "created_at", ascending: false },
        limit: 100,
      });

      if (txErr) {
        console.error("Error fetching wallet_transactions:", txErr);
      }

      const list = txRows || [];

      // Fetch profiles to map user_id -> name/email
      const uIds = Array.from(new Set(list.map((t) => t.user_id).filter(Boolean)));
      const profilesMap = new Map<string, any>();

      if (uIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", uIds);
        (profiles || []).forEach((p) => profilesMap.set(p.id, p));
      }

      const enrichedTx: WalletTransaction[] = list.map((tx) => {
        const prof = profilesMap.get(tx.user_id);
        return {
          ...tx,
          user_name: prof?.full_name || "User / Seller",
          user_email: prof?.email || tx.user_id.slice(0, 8),
        };
      });

      setTransactions(enrichedTx);
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: err?.message || "Failed to load wallet data" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWalletData();
    setRefreshing(false);
    toast({ title: "Wallet data refreshed" });
  };

  const handleManualAdjustment = async () => {
    if (!targetUserId.trim()) {
      toast({ variant: "destructive", title: "Missing Input", description: "Please provide a valid User or Seller ID." });
      return;
    }
    const numAmt = Number(adjustAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a positive numeric amount." });
      return;
    }

    setSubmitting(true);
    try {
      const finalAmount = adjustType === "debit" ? -numAmt : numAmt;

      // Create transaction record
      const txPayload = {
        user_id: targetUserId.trim(),
        amount: Math.abs(finalAmount),
        type: adjustType,
        transaction_type: adjustType,
        category: adjustCategory,
        description: adjustDescription.trim() || `Manual ${adjustType} adjustment by Admin`,
        balance_after: null, // calculated dynamically or stored
      };

      const { error: txError } = await adminDb.insert("wallet_transactions", txPayload);

      if (txError) throw txError;

      // Update commission/reserve wallet balance if applicable
      const targetPlatformWallet = platformWallets.find((w) => w.wallet_type === "commission") || platformWallets[0];
      if (targetPlatformWallet) {
        const newBal = adjustType === "credit"
          ? targetPlatformWallet.balance + numAmt
          : targetPlatformWallet.balance - numAmt;
        const newCredited = adjustType === "credit" ? targetPlatformWallet.total_credited + numAmt : targetPlatformWallet.total_credited;
        const newDebited = adjustType === "debit" ? targetPlatformWallet.total_debited + numAmt : targetPlatformWallet.total_debited;

        await adminDb.update(
          "platform_wallets",
          { balance: Math.max(0, newBal), total_credited: newCredited, total_debited: newDebited, updated_at: new Date().toISOString() },
          { id: targetPlatformWallet.id }
        );
      }

      toast({
        title: "Balance Adjusted Successfully",
        description: `${adjustType.toUpperCase()} of ৳${numAmt.toLocaleString()} posted for account ${targetUserId.slice(0, 8)}.`,
      });

      setAdjustModalOpen(false);
      setTargetUserId("");
      setAdjustAmount("");
      setAdjustDescription("");
      fetchWalletData();
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Adjustment Failed", description: err.message || "Failed to record adjustment" });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter Transactions
  const filteredTransactions = transactions.filter((tx) => {
    const txType = tx.type || tx.transaction_type || "";
    const matchesType = typeFilter === "all" || txType.toLowerCase() === typeFilter.toLowerCase();

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      tx.id.toLowerCase().includes(q) ||
      tx.user_id.toLowerCase().includes(q) ||
      (tx.user_name && tx.user_name.toLowerCase().includes(q)) ||
      (tx.user_email && tx.user_email.toLowerCase().includes(q)) ||
      (tx.category && tx.category.toLowerCase().includes(q)) ||
      (tx.description && tx.description.toLowerCase().includes(q));

    return matchesType && matchesSearch;
  });

  const getWalletIcon = (type: string) => {
    switch (type) {
      case "commission":
        return <Percent className="h-5 w-5 text-emerald-600" />;
      case "tax":
        return <Receipt className="h-5 w-5 text-blue-600" />;
      case "payout":
        return <Landmark className="h-5 w-5 text-purple-600" />;
      case "reserve":
        return <ShieldAlert className="h-5 w-5 text-amber-600" />;
      default:
        return <Coins className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <AdminLayout title="Platform & User Wallets">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Wallet className="h-6 w-6 text-primary" />
              Platform & Ledger Wallets
            </h1>
            <p className="text-sm text-muted-foreground">
              Master ledger summary across platform commission, tax, payout, and reserve pools with manual adjustment tools.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={() => setAdjustModalOpen(true)} className="bg-primary text-primary-foreground gap-2">
              <PlusCircle className="h-4 w-4" />
              Manual Adjustment
            </Button>
          </div>
        </div>

        {/* Master Platform Ledger Summary Cards */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            Master Platform Ledger Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {platformWallets.map((wallet) => (
              <Card key={wallet.id} className="relative overflow-hidden border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold capitalize flex items-center gap-2">
                    {getWalletIcon(wallet.wallet_type)}
                    {wallet.wallet_type} Wallet
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    {wallet.currency || "BDT"}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="text-2xl font-bold text-foreground">
                    ৳{wallet.balance.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground flex justify-between pt-1 border-t mt-2">
                    <span>Credited: ৳{wallet.total_credited.toLocaleString()}</span>
                    <span>Debited: ৳{wallet.total_debited.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* User & Seller Wallet Lookup & Ledger */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              User & Seller Wallet Transactions Log
            </h2>

            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <Tabs value={typeFilter} onValueChange={setTypeFilter} className="w-full sm:w-auto">
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="credit">Credits (+)</TabsTrigger>
                  <TabsTrigger value="debit">Debits (-)</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search user ID, category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="border rounded-lg bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tx ID</TableHead>
                  <TableHead>User / Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Loading wallet transactions...
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      No wallet transactions found. Use "Manual Adjustment" to credit or debit an account.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isCredit = (tx.type || tx.transaction_type) === "credit";
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono text-xs font-semibold">
                          #{tx.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <p className="font-medium text-foreground">{tx.user_name}</p>
                            <p className="text-muted-foreground font-mono text-[11px]">{tx.user_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              isCredit
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1"
                                : "bg-destructive/10 text-destructive border-destructive/30 gap-1"
                            }
                          >
                            {isCredit ? (
                              <>
                                <ArrowDownLeft className="h-3 w-3" /> Credit
                              </>
                            ) : (
                              <>
                                <ArrowUpRight className="h-3 w-3" /> Debit
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize text-[11px]">
                            {tx.category || "General"}
                          </Badge>
                        </TableCell>
                        <TableCell className={`font-semibold text-xs ${isCredit ? "text-emerald-600" : "text-destructive"}`}>
                          {isCredit ? "+" : "-"}৳{tx.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="max-w-[200px] text-xs text-muted-foreground truncate">
                          {tx.description || "N/A"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Manual Balance Credit/Debit Modal */}
        <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                Manual Wallet Adjustment
              </DialogTitle>
              <DialogDescription>
                Credit (+) or Debit (-) balance for a specific User or Seller account with master audit trail.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">User / Seller Account ID</label>
                <Input
                  placeholder="Enter User UUID or Seller ID..."
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Adjustment Type</label>
                  <Select value={adjustType} onValueChange={(val: any) => setAdjustType(val)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">Credit (+) Add</SelectItem>
                      <SelectItem value="debit">Debit (-) Deduct</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Category</label>
                  <Select value={adjustCategory} onValueChange={setAdjustCategory}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adjustment">Manual Adjustment</SelectItem>
                      <SelectItem value="bonus">Bonus / Promotion</SelectItem>
                      <SelectItem value="penalty">Penalty / Fine</SelectItem>
                      <SelectItem value="refund">Refund Correction</SelectItem>
                      <SelectItem value="commission">Commission Payout</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Amount (৳)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Reason / Description</label>
                <Textarea
                  placeholder="Provide explicit explanation for this manual balance change..."
                  value={adjustDescription}
                  onChange={(e) => setAdjustDescription(e.target.value)}
                  rows={3}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAdjustModalOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleManualAdjustment} disabled={submitting} className="bg-primary text-primary-foreground">
                {submitting ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : null}
                Confirm Adjustment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
