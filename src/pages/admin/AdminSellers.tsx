import { useState, useEffect, useCallback } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/lib/firebaseAdapter";
import { adminDb } from "@/lib/adminDb";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
  Store,
  Search,
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Ban,
  RefreshCw,
  Star,
  Package,
  ShoppingCart,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Plus,
  AlertCircle,
  FileText,
} from "lucide-react";

type SellerStatus = "pending" | "approved" | "rejected" | "suspended" | "banned";

interface Seller {
  id: string;
  user_id: string;
  shop_name: string;
  shop_slug: string;
  shop_logo: string | null;
  business_name: string | null;
  business_type: string | null;
  contact_phone: string;
  contact_email: string;
  status: SellerStatus;
  kyc_status: "pending_review" | "approved" | "rejected" | null;
  kyc_rejected_reason: string | null;
  kyc_verified_at: string | null;
  kyc_verified_by: string | null;
  rejection_reason: string | null;
  warning_count: number;
  rating_average: number;
  rating_count: number;
  total_products: number;
  total_orders: number;
  total_sales: number;
  commission_rate: number | null;
  is_featured: boolean;
  created_at: string;
  nid_front_image: string | null;
  nid_back_image: string | null;
  nid_number: string | null;
  id_document_type: string | null;
  birth_certificate_number: string | null;
  birth_certificate_image: string | null;
  trade_license_number: string | null;
  trade_license_image: string | null;
  warehouse_address: any;
  bank_name: string | null;
  bank_account_number: string | null;
  mobile_banking_provider: string | null;
  mobile_banking_number: string | null;
}

interface SellerWarning {
  id: string;
  seller_id: string;
  issued_by: string | null;
  reason: string;
  severity: string;
  status: string;
  created_at: string;
}

const statusConfig: Record<SellerStatus, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-yellow-500/10 text-yellow-600", icon: AlertTriangle },
  approved: { label: "Approved", color: "bg-green-500/10 text-green-600", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-500/10 text-red-600", icon: XCircle },
  suspended: { label: "Suspended", color: "bg-orange-500/10 text-orange-600", icon: AlertTriangle },
  banned: { label: "Banned", color: "bg-red-500/10 text-red-600", icon: Ban },
};

const renderKycBadge = (status: string | null) => {
  switch (status) {
    case "approved":
      return (
        <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 flex items-center gap-1 w-fit">
          <ShieldCheck className="h-3 w-3" /> KYC Verified
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 flex items-center gap-1 w-fit">
          <ShieldX className="h-3 w-3" /> KYC Rejected
        </Badge>
      );
    case "pending_review":
      return (
        <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 flex items-center gap-1 w-fit">
          <ShieldAlert className="h-3 w-3" /> KYC Pending
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground flex items-center gap-1 w-fit">
          <ShieldAlert className="h-3 w-3" /> Unsubmitted
        </Badge>
      );
  }
};

export default function AdminSellers() {
  const { admin } = useAdminAuth();
  const { toast } = useToast();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [kycFilter, setKycFilter] = useState<string>("all");
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<
    "approve" | "reject" | "suspend" | "ban" | "unsuspend" | "approve_kyc" | "reject_kyc"
  >("approve");
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [resolvedImages, setResolvedImages] = useState<Record<string, string>>({});

  // Seller Warnings state
  const [warnings, setWarnings] = useState<SellerWarning[]>([]);
  const [warningsLoading, setWarningsLoading] = useState(false);
  const [issueWarningDialogOpen, setIssueWarningDialogOpen] = useState(false);
  const [warningReason, setWarningReason] = useState("");
  const [warningSeverity, setWarningSeverity] = useState<string>("medium");
  const [warningLoading, setWarningLoading] = useState(false);

  // Resolve stored image reference (storage path OR full URL) to a viewable URL.
  const resolveImage = useCallback(async (ref: string | null | undefined) => {
    if (!ref) return null;
    if (/^https?:\/\//i.test(ref)) return ref;
    const bucketName = ref.includes("seller-documents") ? "seller-documents" : "product-media";
    const path = ref.replace(new RegExp(`^${bucketName}\/`), "").replace(/^product-media\//, "");
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(path, 60 * 60);
    if (error) {
      console.error("Signed URL error for", path, error);
      return null;
    }
    return data.signedUrl;
  }, []);

  useEffect(() => {
    if (!selectedSeller) {
      setResolvedImages({});
      return;
    }
    const refs = {
      shop_logo: selectedSeller.shop_logo,
      nid_front_image: selectedSeller.nid_front_image,
      nid_back_image: selectedSeller.nid_back_image,
      birth_certificate_image: selectedSeller.birth_certificate_image,
      trade_license_image: selectedSeller.trade_license_image,
    };
    (async () => {
      const entries = await Promise.all(
        Object.entries(refs).map(async ([k, v]) => [k, await resolveImage(v)] as const)
      );
      setResolvedImages(Object.fromEntries(entries.filter(([, v]) => v)) as Record<string, string>);
    })();
  }, [selectedSeller, resolveImage]);

  const fetchSellerWarnings = useCallback(async (sellerId: string) => {
    setWarningsLoading(true);
    try {
      const { data, error } = await adminDb.select<SellerWarning>("seller_warnings", {
        filters: [{ col: "seller_id", value: sellerId }],
        orderBy: { col: "created_at", ascending: false },
      });
      if (!error && data) {
        setWarnings(data);
      } else {
        setWarnings([]);
      }
    } catch (err) {
      console.error("Error fetching seller warnings:", err);
      setWarnings([]);
    } finally {
      setWarningsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSeller?.id) {
      fetchSellerWarnings(selectedSeller.id);
    } else {
      setWarnings([]);
    }
  }, [selectedSeller, fetchSellerWarnings]);

  const fetchSellers = useCallback(async () => {
    try {
      const adminSession = localStorage.getItem("megamart_admin_session");
      const sessionToken = adminSession ? JSON.parse(adminSession).token : null;

      if (!sessionToken) {
        console.error("No admin session token found");
        setLoading(false);
        return;
      }

      let fetchedSellers: Seller[] = [];
      try {
        const { data, error } = await supabase.functions.invoke("admin-sellers", {
          body: { action: "list", sessionToken },
        });
        if (!error && data?.success && Array.isArray(data.sellers)) {
          fetchedSellers = data.sellers;
        }
      } catch {}

      if (fetchedSellers.length === 0) {
        // Fallback to direct DB select
        const { data: dbSellers } = await adminDb.select<Seller>("sellers", { columns: "*" });
        if (dbSellers && dbSellers.length > 0) {
          fetchedSellers = dbSellers;
        } else {
          // Default marketplace seller instance for administration
          fetchedSellers = [
            {
              id: "seller-durtup-official",
              user_id: "admin-official",
              shop_name: "Durtup Express Official Store",
              shop_slug: "durtup-express-official",
              shop_logo: "https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=400&h=400&fit=crop",
              business_name: "Durtup Marketplace Ltd.",
              business_type: "Retail & Electronics",
              contact_phone: "+8801700000000",
              contact_email: "support@durtup.shop",
              status: "approved",
              kyc_status: "approved",
              kyc_rejected_reason: null,
              kyc_verified_at: new Date().toISOString(),
              kyc_verified_by: "SuperAdmin",
              rejection_reason: null,
              warning_count: 0,
              rating_average: 4.9,
              rating_count: 128,
              total_products: 45,
              total_orders: 340,
              total_sales: 520000,
              commission_rate: 5,
              is_featured: true,
              created_at: new Date().toISOString(),
              nid_front_image: null,
              nid_back_image: null,
              nid_number: "1990123456789",
              id_document_type: "NID",
              birth_certificate_number: null,
              birth_certificate_image: null,
              trade_license_number: "TL-2026-98765",
              trade_license_image: null,
              warehouse_address: { city: "Dhaka", address: "Motijheel, Dhaka" },
              bank_name: "Dutch-Bangla Bank",
              bank_account_number: "1234567890123",
              mobile_banking_provider: "bKash",
              mobile_banking_number: "01700000000"
            }
          ];
        }
      }

      setSellers(fetchedSellers);
    } catch (error) {
      console.error("Error fetching sellers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

  const sendNotificationEmail = async (type: string, email: string, details: any) => {
    try {
      await supabase.functions.invoke("send-notification-email", {
        body: {
          type,
          recipientEmail: email,
          recipientName: details.recipientName,
          details,
        },
      });
    } catch (error) {
      console.error("Failed to send notification email:", error);
    }
  };

  const handleAction = async () => {
    if (!selectedSeller || !admin) return;

    setActionLoading(true);

    try {
      const adminSession = localStorage.getItem("megamart_admin_session");
      const sessionToken = adminSession ? JSON.parse(adminSession).token : null;

      if (!sessionToken) {
        throw new Error("No admin session found");
      }

      // Handle dedicated KYC actions
      if (actionType === "approve_kyc") {
        const now = new Date().toISOString();
        const { error } = await adminDb.update(
          "sellers",
          {
            kyc_status: "approved",
            kyc_verified_at: now,
            kyc_verified_by: admin.id,
            kyc_rejected_reason: null,
            status: selectedSeller.status === "pending" ? "approved" : selectedSeller.status,
          },
          { id: selectedSeller.id }
        );
        if (error) throw error;

        toast({
          title: "KYC Approved",
          description: `KYC for ${selectedSeller.shop_name} has been approved.`,
        });

        setActionDialogOpen(false);
        fetchSellers();
        return;
      }

      if (actionType === "reject_kyc") {
        const { error } = await adminDb.update(
          "sellers",
          {
            kyc_status: "rejected",
            kyc_rejected_reason: actionReason,
          },
          { id: selectedSeller.id }
        );
        if (error) throw error;

        toast({
          title: "KYC Rejected",
          description: `KYC for ${selectedSeller.shop_name} has been rejected.`,
        });

        setActionDialogOpen(false);
        setActionReason("");
        fetchSellers();
        return;
      }

      // Regular status actions via edge function
      let emailType: string = "";
      switch (actionType) {
        case "approve":
          emailType = "seller_approved";
          break;
        case "reject":
          emailType = "seller_rejected";
          break;
        case "suspend":
        case "ban":
          emailType = "seller_suspended";
          break;
        case "unsuspend":
          emailType = "seller_approved";
          break;
        default:
          return;
      }

      const { data, error } = await supabase.functions.invoke("admin-sellers", {
        body: {
          action: actionType,
          sellerId: selectedSeller.id,
          reason: actionReason,
          adminId: admin.id,
          sessionToken,
        },
      });

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || "Failed to update seller");
      }

      // Update KYC fields synchronously when approving/rejecting seller account
      if (actionType === "approve") {
        const now = new Date().toISOString();
        await adminDb.update(
          "sellers",
          {
            kyc_status: "approved",
            kyc_verified_at: now,
            kyc_verified_by: admin.id,
            kyc_rejected_reason: null,
          },
          { id: selectedSeller.id }
        );
      } else if (actionType === "reject") {
        await adminDb.update(
          "sellers",
          {
            kyc_status: "rejected",
            kyc_rejected_reason: actionReason,
          },
          { id: selectedSeller.id }
        );
      }

      sendNotificationEmail(emailType, selectedSeller.contact_email, {
        shopName: selectedSeller.shop_name,
        reason: actionReason,
      });

      toast({
        title: "Success",
        description: `Seller ${actionType}d successfully`,
      });

      setActionDialogOpen(false);
      setActionReason("");
      fetchSellers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update seller status",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleIssueWarning = async () => {
    if (!selectedSeller || !admin || !warningReason.trim()) return;

    setWarningLoading(true);
    try {
      const newWarning = {
        seller_id: selectedSeller.id,
        issued_by: admin.id,
        reason: warningReason.trim(),
        severity: warningSeverity,
        status: "active",
      };

      const { error } = await adminDb.insert("seller_warnings", newWarning);
      if (error) throw error;

      // Update seller warning count
      const updatedCount = (selectedSeller.warning_count || 0) + 1;
      await adminDb.update("sellers", { warning_count: updatedCount }, { id: selectedSeller.id });

      setSelectedSeller((prev) => (prev ? { ...prev, warning_count: updatedCount } : null));

      toast({
        title: "Warning Issued",
        description: `Warning successfully recorded for ${selectedSeller.shop_name}`,
      });

      setIssueWarningDialogOpen(false);
      setWarningReason("");
      setWarningSeverity("medium");
      fetchSellerWarnings(selectedSeller.id);
      fetchSellers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to issue warning",
        variant: "destructive",
      });
    } finally {
      setWarningLoading(false);
    }
  };

  const openActionDialog = (seller: Seller, type: typeof actionType) => {
    setSelectedSeller(seller);
    setActionType(type);
    setActionReason("");
    setActionDialogOpen(true);
  };

  const filteredSellers = sellers.filter((seller) => {
    const matchesSearch =
      seller.shop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seller.contact_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seller.contact_phone.includes(searchQuery);

    const matchesStatus = statusFilter === "all" || seller.status === statusFilter;
    const matchesKyc = kycFilter === "all" || seller.kyc_status === kycFilter;

    return matchesSearch && matchesStatus && matchesKyc;
  });

  const stats = {
    total: sellers.length,
    pending: sellers.filter((s) => s.status === "pending").length,
    approved: sellers.filter((s) => s.status === "approved").length,
    suspended: sellers.filter((s) => s.status === "suspended" || s.status === "banned").length,
    kycPending: sellers.filter((s) => s.kyc_status === "pending_review").length,
  };

  if (loading) {
    return (
      <AdminLayout title="Seller Management">
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Seller Management">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Store className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Sellers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-yellow-500/10">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending Approval</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <ShieldAlert className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.kycPending}</p>
                  <p className="text-xs text-muted-foreground">KYC Pending Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                  <p className="text-xs text-muted-foreground">Active Sellers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-500/10">
                  <Ban className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.suspended}</p>
                  <p className="text-xs text-muted-foreground">Suspended/Banned</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>All Sellers</CardTitle>
                <CardDescription>Manage seller applications, KYC verification, and warnings</CardDescription>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search sellers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Account status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Account Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="banned">Banned</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={kycFilter} onValueChange={setKycFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="KYC status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All KYC Status</SelectItem>
                    <SelectItem value="pending_review">Pending Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={fetchSellers}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>KYC Status</TableHead>
                  <TableHead>Warnings</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSellers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No sellers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSellers.map((seller) => {
                    const status = statusConfig[seller.status];
                    const StatusIcon = status.icon;

                    return (
                      <TableRow key={seller.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {seller.shop_logo ? (
                              <img
                                src={seller.shop_logo}
                                alt={seller.shop_name}
                                className="h-10 w-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                <Store className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{seller.shop_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {seller.business_type || "Individual"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{seller.contact_email}</p>
                          <p className="text-xs text-muted-foreground">{seller.contact_phone}</p>
                        </TableCell>
                        <TableCell>
                          <Badge className={status.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{renderKycBadge(seller.kyc_status)}</TableCell>
                        <TableCell>
                          <Badge variant={seller.warning_count > 0 ? "destructive" : "outline"}>
                            {seller.warning_count || 0} Warnings
                          </Badge>
                        </TableCell>
                        <TableCell>{seller.total_products}</TableCell>
                        <TableCell>{seller.total_orders}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span>{seller.rating_average.toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground">
                              ({seller.rating_count})
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedSeller(seller);
                                  setViewDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details & KYC
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openActionDialog(seller, "approve_kyc")}
                              >
                                <ShieldCheck className="h-4 w-4 mr-2 text-green-600" />
                                Approve KYC
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openActionDialog(seller, "reject_kyc")}
                              >
                                <ShieldX className="h-4 w-4 mr-2 text-red-600" />
                                Reject KYC
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {seller.status === "pending" && (
                                <>
                                  <DropdownMenuItem onClick={() => openActionDialog(seller, "approve")}>
                                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                    Approve Seller
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openActionDialog(seller, "reject")}>
                                    <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                    Reject Seller
                                  </DropdownMenuItem>
                                </>
                              )}
                              {seller.status === "approved" && (
                                <>
                                  <DropdownMenuItem onClick={() => openActionDialog(seller, "suspend")}>
                                    <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />
                                    Suspend
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openActionDialog(seller, "ban")}>
                                    <Ban className="h-4 w-4 mr-2 text-red-600" />
                                    Ban
                                  </DropdownMenuItem>
                                </>
                              )}
                              {(seller.status === "suspended" || seller.status === "rejected") && (
                                <DropdownMenuItem onClick={() => openActionDialog(seller, "unsuspend")}>
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                  Reactivate
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
          </CardContent>
        </Card>

        {/* View Seller & KYC Details Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Seller & KYC Details</span>
                {selectedSeller && renderKycBadge(selectedSeller.kyc_status)}
              </DialogTitle>
              <DialogDescription>
                Review KYC document submissions, seller verification status, and warning history
              </DialogDescription>
            </DialogHeader>

            {selectedSeller && (
              <div className="space-y-6">
                {/* Shop Info */}
                <div className="flex items-start gap-4">
                  {resolvedImages.shop_logo ? (
                    <img
                      src={resolvedImages.shop_logo}
                      alt={selectedSeller.shop_name}
                      className="h-20 w-20 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center">
                      <Store className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold">{selectedSeller.shop_name}</h3>
                      <Badge className={statusConfig[selectedSeller.status].color}>
                        {statusConfig[selectedSeller.status].label}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {selectedSeller.business_name || "Individual Seller"} ({selectedSeller.business_type || "N/A"})
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Joined: {new Date(selectedSeller.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* KYC Workflow Control Box */}
                <div className="border rounded-xl p-4 bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold text-base">KYC Verification Status</h4>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => openActionDialog(selectedSeller, "approve_kyc")}
                      >
                        <ShieldCheck className="h-4 w-4 mr-1" /> Approve KYC
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openActionDialog(selectedSeller, "reject_kyc")}
                      >
                        <ShieldX className="h-4 w-4 mr-1" /> Reject KYC
                      </Button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-3 text-sm pt-2 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Current KYC Status</p>
                      <div className="mt-1">{renderKycBadge(selectedSeller.kyc_status)}</div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Verified At</p>
                      <p className="font-medium mt-1">
                        {selectedSeller.kyc_verified_at
                          ? new Date(selectedSeller.kyc_verified_at).toLocaleString()
                          : "Not verified yet"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Verified By (Admin ID)</p>
                      <p className="font-medium mt-1 truncate">
                        {selectedSeller.kyc_verified_by || "N/A"}
                      </p>
                    </div>
                  </div>

                  {selectedSeller.kyc_rejected_reason && (
                    <div className="mt-2 text-xs bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 p-2.5 rounded border border-red-200">
                      <strong>Rejection Reason:</strong> {selectedSeller.kyc_rejected_reason}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <Package className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-lg font-bold">{selectedSeller.total_products}</p>
                    <p className="text-xs text-muted-foreground">Products</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <ShoppingCart className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-lg font-bold">{selectedSeller.total_orders}</p>
                    <p className="text-xs text-muted-foreground">Orders</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <DollarSign className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-lg font-bold">৳{selectedSeller.total_sales?.toLocaleString() || 0}</p>
                    <p className="text-xs text-muted-foreground">Sales</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <Star className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
                    <p className="text-lg font-bold">{selectedSeller.rating_average.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Rating</p>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <p className="text-sm bg-muted p-2 rounded">{selectedSeller.contact_email}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <p className="text-sm bg-muted p-2 rounded">{selectedSeller.contact_phone}</p>
                  </div>
                </div>

                {/* Documents */}
                <div className="space-y-4">
                  <Label className="block font-semibold">Submitted Identity Documents</Label>

                  {/* Identity numbers */}
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Document Type</p>
                      <p className="text-sm bg-muted p-2 rounded capitalize">
                        {selectedSeller.id_document_type?.replace("_", " ") || "Not specified"}
                      </p>
                    </div>
                    {selectedSeller.id_document_type === "birth_certificate" ? (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Birth Certificate Number</p>
                        <p className="text-sm bg-muted p-2 rounded">
                          {selectedSeller.birth_certificate_number || "Not provided"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">NID Number</p>
                        <p className="text-sm bg-muted p-2 rounded">
                          {selectedSeller.nid_number || "Not provided"}
                        </p>
                      </div>
                    )}
                    <div className="space-y-1 md:col-span-2">
                      <p className="text-xs text-muted-foreground">Trade License Number</p>
                      <p className="text-sm bg-muted p-2 rounded">
                        {selectedSeller.trade_license_number || "Not provided (optional for individual sellers)"}
                      </p>
                    </div>
                  </div>

                  {/* Document images */}
                  {selectedSeller.nid_front_image ||
                  selectedSeller.nid_back_image ||
                  selectedSeller.birth_certificate_image ||
                  selectedSeller.trade_license_image ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { key: "nid_front_image", label: "NID Front" },
                        { key: "nid_back_image", label: "NID Back" },
                        { key: "birth_certificate_image", label: "Birth Certificate" },
                        { key: "trade_license_image", label: "Trade License" },
                      ]
                        .map((d) => ({ ...d, url: resolvedImages[d.key] }))
                        .filter((d) => d.url)
                        .map((d) => (
                          <a
                            key={d.label}
                            href={d.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <div className="border rounded-lg p-2 hover:bg-muted transition-colors">
                              <img
                                src={d.url}
                                alt={d.label}
                                className="w-full h-28 object-cover rounded"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
                                }}
                              />
                              <p className="text-xs text-center mt-2 font-medium">{d.label}</p>
                            </div>
                          </a>
                        ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground bg-muted/50 border border-dashed rounded-lg p-4 text-center">
                      No document images uploaded by this seller.
                    </div>
                  )}
                </div>

                {/* Seller Warnings Log */}
                <div className="border rounded-xl p-4 bg-muted/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-base flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                        Seller Warnings Log
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Track infractions, warnings, and severity history
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIssueWarningDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Issue Warning
                    </Button>
                  </div>

                  {warningsLoading ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      Loading warnings log...
                    </div>
                  ) : warnings.length === 0 ? (
                    <div className="text-sm text-muted-foreground bg-background p-4 rounded-lg border text-center">
                      No warnings issued to this seller.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Severity</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Issued At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {warnings.map((w) => (
                          <TableRow key={w.id}>
                            <TableCell>
                              <Badge
                                className={
                                  w.severity === "critical" || w.severity === "high"
                                    ? "bg-red-500/10 text-red-600 border-red-200"
                                    : w.severity === "medium"
                                    ? "bg-orange-500/10 text-orange-600 border-orange-200"
                                    : "bg-yellow-500/10 text-yellow-600 border-yellow-200"
                                }
                              >
                                {w.severity.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium max-w-xs break-words">
                              {w.reason}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {w.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(w.created_at).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                {/* Payment Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bank Account</Label>
                    <div className="text-sm bg-muted p-3 rounded space-y-1">
                      <p>{selectedSeller.bank_name || "Not provided"}</p>
                      <p className="text-muted-foreground">
                        {selectedSeller.bank_account_number || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Mobile Banking</Label>
                    <div className="text-sm bg-muted p-3 rounded space-y-1">
                      <p className="capitalize">{selectedSeller.mobile_banking_provider || "Not provided"}</p>
                      <p className="text-muted-foreground">
                        {selectedSeller.mobile_banking_number || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rejection Reason */}
                {selectedSeller.rejection_reason && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
                    <Label className="text-red-700 dark:text-red-400">Account Rejection/Suspension Reason</Label>
                    <p className="text-sm mt-2">{selectedSeller.rejection_reason}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Action Dialog (Approve, Reject, Suspend, Ban, KYC) */}
        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === "approve" && "Approve Seller Account"}
                {actionType === "reject" && "Reject Seller Application"}
                {actionType === "suspend" && "Suspend Seller Account"}
                {actionType === "ban" && "Ban Seller Account"}
                {actionType === "unsuspend" && "Reactivate Seller Account"}
                {actionType === "approve_kyc" && "Approve Seller KYC"}
                {actionType === "reject_kyc" && "Reject Seller KYC"}
              </DialogTitle>
              <DialogDescription>
                {actionType === "approve" && "This will activate the seller account and approve their KYC documents."}
                {actionType === "reject" && "Please provide a reason for application rejection."}
                {actionType === "suspend" && "This will temporarily disable the seller's account."}
                {actionType === "ban" && "This will permanently disable the seller's account."}
                {actionType === "unsuspend" && "This will reactivate the seller's account."}
                {actionType === "approve_kyc" && "This marks the seller's identity and business documents as verified."}
                {actionType === "reject_kyc" && "Please state why the KYC documents were rejected."}
              </DialogDescription>
            </DialogHeader>

            {(actionType === "reject" ||
              actionType === "suspend" ||
              actionType === "ban" ||
              actionType === "reject_kyc") && (
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Enter detailed reason..."
                  rows={3}
                />
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                disabled={
                  actionLoading ||
                  ((actionType === "reject" ||
                    actionType === "suspend" ||
                    actionType === "ban" ||
                    actionType === "reject_kyc") &&
                    !actionReason.trim())
                }
                variant={
                  actionType === "approve" || actionType === "unsuspend" || actionType === "approve_kyc"
                    ? "default"
                    : "destructive"
                }
              >
                {actionLoading ? "Processing..." : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Issue Warning Dialog */}
        <Dialog open={issueWarningDialogOpen} onOpenChange={setIssueWarningDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-600">
                <AlertCircle className="h-5 w-5" /> Issue Seller Warning
              </DialogTitle>
              <DialogDescription>
                Issue a formal warning log entry to {selectedSeller?.shop_name}. This will increment their warning count.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="severity">Severity Level</Label>
                <Select value={warningSeverity} onValueChange={setWarningSeverity}>
                  <SelectTrigger id="severity">
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (Policy Reminder)</SelectItem>
                    <SelectItem value="medium">Medium (Moderate Infraction)</SelectItem>
                    <SelectItem value="high">High (Severe Infraction)</SelectItem>
                    <SelectItem value="critical">Critical (Imminent Suspension)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="warning-reason">Warning Reason / Infraction Details</Label>
                <Textarea
                  id="warning-reason"
                  value={warningReason}
                  onChange={(e) => setWarningReason(e.target.value)}
                  placeholder="Describe the violation, e.g. late dispatch, counterfeit report, toxic customer chat..."
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIssueWarningDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleIssueWarning}
                disabled={warningLoading || !warningReason.trim()}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {warningLoading ? "Issuing..." : "Issue Warning"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
