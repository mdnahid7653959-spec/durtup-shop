import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, TrendingUp, Clock, CheckCircle, Download, Send, RefreshCw, Wallet } from "lucide-react";
import { supabase } from "@/lib/firebaseAdapter";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Earning {
  id: string;
  order_id: string;
  gross_amount: number;
  commission_rate: number;
  commission_amount: number;
  net_amount: number;
  status: string;
  created_at: string;
}

interface Payout {
  id: string;
  amount: number;
  net_amount: number;
  commission_deducted: number;
  payment_method: string;
  status: string;
  period_start: string;
  period_end: string;
  created_at: string;
  processed_at: string | null;
  transaction_reference: string | null;
}

export default function SellerEarnings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState("bkash");
  const [payoutAccount, setPayoutAccount] = useState("");
  const [submittingPayout, setSubmittingPayout] = useState(false);

  const [stats, setStats] = useState({
    totalEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    availableForPayout: 0,
    totalCommission: 0,
  });

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchSellerData();
  }, [user, navigate]);

  const fetchSellerData = async () => {
    if (!user) return;

    const { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select("id, status")
      .eq("user_id", user.id)
      .single();

    if (sellerError || !seller) {
      navigate("/seller/register");
      return;
    }

    if (seller.status !== "approved") {
      navigate("/seller/pending");
      return;
    }

    setSellerId(seller.id);
    await Promise.all([fetchEarnings(seller.id), fetchPayouts(seller.id)]);
    setLoading(false);
  };

  const fetchEarnings = async (sellerIdParam: string) => {
    const { data, error } = await supabase
      .from("seller_earnings")
      .select("*")
      .eq("seller_id", sellerIdParam)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setEarnings(data);
      
      const totalEarnings = data.reduce((sum, e) => sum + Number(e.net_amount), 0);
      const pendingEarnings = data
        .filter((e) => e.status === "pending" || e.status === "confirmed")
        .reduce((sum, e) => sum + Number(e.net_amount), 0);
      const paidEarnings = data
        .filter((e) => e.status === "paid")
        .reduce((sum, e) => sum + Number(e.net_amount), 0);
      const availableForPayout = data
        .filter((e) => e.status === "confirmed")
        .reduce((sum, e) => sum + Number(e.net_amount), 0);
      const totalCommission = data.reduce((sum, e) => sum + Number(e.commission_amount), 0);

      setStats({
        totalEarnings,
        pendingEarnings,
        paidEarnings,
        availableForPayout,
        totalCommission,
      });
    }
  };

  const fetchPayouts = async (sellerIdParam: string) => {
    const { data, error } = await supabase
      .from("seller_payouts")
      .select("*")
      .eq("seller_id", sellerIdParam)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPayouts(data);
    }
  };

  const handleRequestPayout = async () => {
    if (!sellerId || stats.availableForPayout <= 0) {
      toast({ variant: "destructive", title: "No available balance for payout" });
      return;
    }

    if (!payoutAccount.trim()) {
      toast({ variant: "destructive", title: "Please enter account number" });
      return;
    }

    setSubmittingPayout(true);

    const { error } = await supabase.from("seller_payouts").insert({
      seller_id: sellerId,
      amount: stats.availableForPayout,
      commission_deducted: 0,
      net_amount: stats.availableForPayout,
      payment_method: payoutMethod,
      payment_details: { account: payoutAccount },
      status: "pending",
      period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      period_end: new Date().toISOString().split("T")[0],
    });

    if (error) {
      toast({ variant: "destructive", title: "Failed to request payout" });
    } else {
      toast({ title: "Payout request submitted successfully!" });
      setPayoutDialogOpen(false);
      setPayoutAccount("");
      if (sellerId) {
        fetchPayouts(sellerId);
      }
    }

    setSubmittingPayout(false);
  };

  const handleRefresh = async () => {
    if (sellerId) {
      setLoading(true);
      await Promise.all([fetchEarnings(sellerId), fetchPayouts(sellerId)]);
      setLoading(false);
      toast({ title: "Earnings refreshed" });
    }
  };

  const exportEarnings = () => {
    const csvData = [
      ["Date", "Order ID", "Gross Amount", "Commission %", "Commission Amount", "Net Amount", "Status"],
      ...earnings.map((e) => [
        new Date(e.created_at).toLocaleDateString(),
        e.order_id,
        e.gross_amount,
        e.commission_rate,
        e.commission_amount,
        e.net_amount,
        e.status,
      ]),
    ];

    const csvContent = csvData.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `earnings-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Earnings exported successfully" });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      confirmed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      paid: "bg-green-500/10 text-green-600 border-green-500/20",
      processing: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      completed: "bg-green-500/10 text-green-600 border-green-500/20",
      rejected: "bg-red-500/10 text-red-600 border-red-500/20",
    };

    return (
      <Badge className={styles[status] || "bg-gray-500/10 text-gray-600"}>
        {status}
      </Badge>
    );
  };

  return (
    <SellerLayout title="Earnings & Payouts">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">৳{stats.totalEarnings.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Lifetime earnings</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                ৳{stats.pendingEarnings.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
            </CardContent>
          </Card>

          <Card className="border-green-500/20 bg-green-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <Wallet className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ৳{stats.availableForPayout.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Ready for payout</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
              <CheckCircle className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">৳{stats.paidEarnings.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total withdrawn</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setPayoutDialogOpen(true)} disabled={stats.availableForPayout <= 0}>
            <Send className="h-4 w-4 mr-2" />
            Request Payout
          </Button>
          <Button variant="outline" onClick={exportEarnings}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Commission Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Commission Summary</CardTitle>
            <CardDescription>Your platform commission rate is category-based</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">৳{stats.totalCommission.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total commission paid</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Payouts */}
        <Card>
          <CardHeader>
            <CardTitle>Payout History</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Period</TableHead>
                  <TableHead className="whitespace-nowrap">Method</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Amount</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No payout history yet
                    </TableCell>
                  </TableRow>
                ) : (
                  payouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(payout.created_at).toLocaleDateString("bn-BD")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(payout.period_start).toLocaleDateString()} -{" "}
                        {new Date(payout.period_end).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="capitalize whitespace-nowrap">{payout.payment_method}</TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        ৳{Number(payout.net_amount).toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(payout.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>


        {/* Recent Earnings */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Earnings</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Gross</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Commission</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Net</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No earnings yet. Start selling to earn!
                    </TableCell>
                  </TableRow>
                ) : (
                  earnings.slice(0, 10).map((earning) => (
                    <TableRow key={earning.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(earning.created_at).toLocaleDateString("bn-BD")}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        ৳{Number(earning.gross_amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                        -৳{Number(earning.commission_amount).toLocaleString()} ({earning.commission_rate}%)
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        ৳{Number(earning.net_amount).toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(earning.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>

        </Card>

        {/* Payout Request Dialog */}
        <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Payout</DialogTitle>
              <DialogDescription>
                Request withdrawal of your available balance
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-muted-foreground">Available for Payout</p>
                <p className="text-2xl font-bold text-green-600">
                  ৳{stats.availableForPayout.toLocaleString()}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="nagad">Nagad</SelectItem>
                    <SelectItem value="rocket">Rocket</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  {payoutMethod === "bank" ? "Bank Account Number" : "Mobile Number"}
                </Label>
                <Input
                  placeholder={payoutMethod === "bank" ? "Enter account number" : "01XXXXXXXXX"}
                  value={payoutAccount}
                  onChange={(e) => setPayoutAccount(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPayoutDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRequestPayout} disabled={submittingPayout}>
                {submittingPayout ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SellerLayout>
  );
}
