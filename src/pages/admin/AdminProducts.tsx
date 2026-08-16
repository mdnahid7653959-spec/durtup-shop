import { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Edit, Trash2, Eye, MoreHorizontal, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, Ban, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/firebaseAdapter";
import { adminDb } from "@/lib/adminDb";
import { db } from "@/integrations/firebase/client";
import { collection, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { AdminLayout } from "@/components/admin/AdminLayout";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useAdminCacheInvalidation } from "@/hooks/useRealtimeSync";
import { AdminProductPreviewDialog } from "@/components/admin/AdminProductPreviewDialog";
import { getCachedMohasagorProducts } from "@/utils/mohasagorCache";


interface Product {
  id: string;
  name: string;
  slug: string;
  regular_price: number;
  discount_price: number | null;
  stock_quantity: number;
  status: string;
  approval_status: string | null;
  seller_id: string | null;
  is_featured: boolean;
  created_at: string;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const lastFetchRef = useRef<number>(0);

  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; productId: string; action: "reject" | "ban" }>({ open: false, productId: "", action: "reject" });
  const [rejectReason, setRejectReason] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();
  const { admin } = useAdminAuth();
  const { invalidateProducts } = useAdminCacheInvalidation();

  const fetchProducts = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 1200) {
      return;
    }
    lastFetchRef.current = now;

    let localAdminProds: Product[] = [];

    // 1. Instant Local Check (0ms latency display)
    try {
      const rawLocal = localStorage.getItem("enterprise_admin_products") || localStorage.getItem("local_products");
      if (rawLocal) {
        const localList = JSON.parse(rawLocal);
        if (Array.isArray(localList) && localList.length > 0) {
          localAdminProds = localList.map((data: any) => ({
            id: String(data.id),
            name: data.title || data.name || "Untitled Product",
            slug: data.slug || "",
            regular_price: Number(data.price || data.regular_price || 0),
            discount_price: data.discountPrice || data.discount_price || null,
            stock_quantity: Number(data.stock || data.stock_quantity || 0),
            status: data.status || "APPROVED",
            approval_status: data.approvalStatus || data.approval_status || "APPROVED",
            seller_id: data.seller_id || "Admin",
            is_featured: Boolean(data.isFeatured || data.is_featured),
            created_at: data.createdAt || data.created_at || new Date().toISOString()
          }));
        }
      }
    } catch {}

    // If local items exist, render instantly
    if (localAdminProds.length > 0 && products.length === 0) {
      setProducts(localAdminProds);
      setLoading(false);
    }

    // 2. Fetch Database & Supplier products in parallel
    const [dbResult, supplierResult] = await Promise.allSettled([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      getCachedMohasagorProducts()
    ]);

    let dbProdsList: Product[] = [];
    if (dbResult.status === "fulfilled" && !dbResult.value.error && dbResult.value.data) {
      dbProdsList = dbResult.value.data as Product[];
    }

    let supplierProdsList: Product[] = [];
    if (supplierResult.status === "fulfilled" && supplierResult.value && supplierResult.value.length > 0) {
      supplierProdsList = supplierResult.value.map((sp: any) => ({
        id: String(sp.id),
        name: sp.name,
        slug: sp.slug || `product-${sp.id}`,
        regular_price: Number(sp.originalPrice || sp.price || 0),
        discount_price: sp.originalPrice ? Number(sp.price) : null,
        stock_quantity: Number(sp.stock_quantity ?? sp.stock ?? (sp.stock_status === "available" ? 50 : 0)),
        status: "active",
        approval_status: "APPROVED",
        seller_id: "Mohasagor Supplier",
        is_featured: false,
        created_at: new Date().toISOString()
      }));
    }

    // 3. Merge Local + DB + Supplier products seamlessly
    const mergedMap = new Map<string, Product>();
    localAdminProds.forEach(p => mergedMap.set(p.id, p));
    dbProdsList.forEach(p => { if (!mergedMap.has(p.id)) mergedMap.set(p.id, p); });
    supplierProdsList.forEach(p => { if (!mergedMap.has(p.id)) mergedMap.set(p.id, p); });

    const finalCatalog = Array.from(mergedMap.values());
    setProducts(finalCatalog);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts(true);

    const handleSupplierUpdate = () => {
      fetchProducts(false);
    };
    window.addEventListener("mohasagor_products_updated", handleSupplierUpdate);

    const channel = supabase
      .channel("admin-products-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        fetchProducts(false);
      })
      .subscribe();

    return () => {
      window.removeEventListener("mohasagor_products_updated", handleSupplierUpdate);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProducts(true);
    invalidateProducts();
    toast({ title: "Products refreshed", description: "All caches updated" });
    setRefreshing(false);
  };

  const updateLocalAndStateProduct = (id: string, updates: Partial<Product> | null) => {
    if (updates === null) {
      setProducts((prev) => prev.filter((p) => String(p.id) !== String(id) && p.slug !== id));
    } else {
      setProducts((prev) =>
        prev.map((p) => (String(p.id) === String(id) || p.slug === id ? { ...p, ...updates } : p))
      );
    }

    try {
      ["enterprise_admin_products", "local_products"].forEach((key) => {
        const raw = localStorage.getItem(key);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            let nextList: any[];
            if (updates === null) {
              nextList = list.filter((p: any) => String(p.id) !== String(id) && p.slug !== id);
            } else {
              nextList = list.map((p: any) =>
                String(p.id) === String(id) || p.slug === id ? { ...p, ...updates } : p
              );
            }
            localStorage.setItem(key, JSON.stringify(nextList));
          }
        }
      });
    } catch (e) {
      console.warn("LocalStorage product update error:", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    // 1. Instant UI update & LocalStorage cleanup
    updateLocalAndStateProduct(id, null);
    toast({ title: "Product deleted successfully" });

    // 2. Delete from Firestore
    try {
      await deleteDoc(doc(db, "products", id));
    } catch (e) {
      console.warn("Firestore delete exception:", e);
    }

    // 3. Delete from Supabase and adminDb
    try {
      await supabase.from("products").delete().eq("id", id);
      await adminDb.remove("products", { id });
      await adminDb.remove("product_images", { filters: [{ col: "product_id", value: id }] });
    } catch (e) {
      console.warn("Supabase delete exception:", e);
    }

    // 4. Trigger cloud function if available
    if (admin?.id) {
      try {
        await supabase.functions.invoke("admin-products", {
          body: { action: "delete", adminId: admin.id, productId: id }
        });
      } catch (err) {}
    }

    invalidateProducts();
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    updateLocalAndStateProduct(id, { status: newStatus });
    toast({ title: `Product ${newStatus}` });

    try {
      await updateDoc(doc(db, "products", id), { status: newStatus });
    } catch (e) {}

    try {
      await supabase.from("products").update({ status: newStatus }).eq("id", id);
      await adminDb.update("products", { status: newStatus }, { id });
    } catch (e) {}

    if (admin?.id) {
      try {
        await supabase.functions.invoke("admin-products", {
          body: { action: "toggle-status", adminId: admin.id, productId: id, productData: { status: newStatus } }
        });
      } catch (err) {}
    }

    invalidateProducts();
  };

  const handleApprove = async (productId: string) => {
    setActionLoading(true);
    updateLocalAndStateProduct(productId, { status: "active", approval_status: "approved" });
    toast({ title: "Product approved!", description: "Product is now live." });

    try {
      await updateDoc(doc(db, "products", productId), { status: "active", approval_status: "approved" });
    } catch (e) {}

    try {
      await supabase.from("products").update({ status: "active", approval_status: "approved" }).eq("id", productId);
      await adminDb.update("products", { status: "active", approval_status: "approved" }, { id: productId });
    } catch (e) {}

    if (admin?.id) {
      try {
        await supabase.functions.invoke("admin-products", {
          body: { action: "approve-product", adminId: admin.id, productId }
        });
      } catch (err) {}
    }

    invalidateProducts();
    setActionLoading(false);
  };

  const handleRejectOrBan = async () => {
    if (!rejectDialog.productId) return;
    setActionLoading(true);
    const targetStatus = rejectDialog.action === "ban" ? "banned" : "rejected";
    updateLocalAndStateProduct(rejectDialog.productId, { approval_status: targetStatus, status: targetStatus });
    toast({ title: rejectDialog.action === "ban" ? "Product banned" : "Product rejected" });

    try {
      await updateDoc(doc(db, "products", rejectDialog.productId), { approval_status: targetStatus, status: targetStatus });
    } catch (e) {}

    try {
      await supabase.from("products").update({ approval_status: targetStatus, status: targetStatus }).eq("id", rejectDialog.productId);
      await adminDb.update("products", { status: targetStatus, rejection_reason: rejectReason }, { id: rejectDialog.productId });
    } catch (e) {}

    if (admin?.id) {
      const action = rejectDialog.action === "ban" ? "ban-product" : "reject-product";
      try {
        await supabase.functions.invoke("admin-products", {
          body: { action, adminId: admin.id, productId: rejectDialog.productId, productData: { reason: rejectReason } }
        });
      } catch (err) {}
    }

    invalidateProducts();
    setActionLoading(false);
    setRejectDialog({ open: false, productId: "", action: "reject" });
    setRejectReason("");
  };

  const getApprovalBadge = (status: string | null) => {
    const statusLower = (status || "approved").toLowerCase();
    switch (statusLower) {
      case "approved":
      case "active":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case "banned":
        return <Badge className="bg-red-900/20 text-red-700 border-red-700/30"><Ban className="h-3 w-3 mr-1" />Banned</Badge>;
      default:
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
    }
  };

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
      const appStatus = (p.approval_status || p.status || "approved").toLowerCase();
      if (activeTab === "all") return matchesSearch;
      if (activeTab === "pending") return matchesSearch && appStatus === "pending";
      if (activeTab === "approved") return matchesSearch && (appStatus === "approved" || appStatus === "active");
      if (activeTab === "rejected") return matchesSearch && (appStatus === "rejected" || appStatus === "banned");
      if (activeTab === "seller") return matchesSearch && p.seller_id !== null;
      return matchesSearch;
    });
  }, [products, searchQuery, activeTab]);

  const [displayCount, setDisplayCount] = useState(40);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const pendingCount = useMemo(() => {
    return products.filter(p => p.approval_status === "pending").length;
  }, [products]);

  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, displayCount);
  }, [filteredProducts, displayCount]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCount((prev) => (prev < filteredProducts.length ? prev + 40 : prev));
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [filteredProducts.length]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setDisplayCount(40);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setDisplayCount(40);
  };

  return (
    <AdminLayout title="Products">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Products</h1>
            <p className="text-muted-foreground">Manage your product catalog &amp; approvals</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Sync
            </Button>
            <Link to="/admin/products/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </Link>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="all">All ({products.length})</TabsTrigger>
            <TabsTrigger value="pending" className="relative">
              Pending
              {pendingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected/Banned</TabsTrigger>
            <TabsTrigger value="seller">Seller Products</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Loading products...</TableCell>
                </TableRow>
              ) : visibleProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No products found</TableCell>
                </TableRow>
              ) : (
                visibleProducts.map((product) => (
                  <TableRow key={product.id} className={product.approval_status === "pending" ? "bg-yellow-500/5" : ""}>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="font-medium text-foreground truncate">{product.name}</p>
                        <p className="text-sm text-muted-foreground">/{product.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">৳{(product.discount_price || product.regular_price).toLocaleString()}</p>
                        {product.discount_price && (
                          <p className="text-sm text-muted-foreground line-through">৳{product.regular_price.toLocaleString()}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.stock_quantity > 10 ? "outline" : "destructive"}>
                        {product.stock_quantity} in stock
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={product.status === "active" ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => toggleStatus(product.id, product.status)}
                      >
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{getApprovalBadge(product.approval_status)}</TableCell>
                    <TableCell>
                      {product.seller_id ? (
                        <Badge variant="outline" className="text-xs">Seller</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Admin</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => setPreviewId(product.id)}>
                            <Eye className="h-4 w-4 mr-2" />View
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/admin/products/${product.id}`}>
                              <Edit className="h-4 w-4 mr-2" />Edit
                            </Link>
                          </DropdownMenuItem>

                          {product.approval_status === "pending" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleApprove(product.id)}
                                className="text-green-600 focus:text-green-600"
                                disabled={actionLoading}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setRejectDialog({ open: true, productId: product.id, action: "reject" })}
                                className="text-orange-600 focus:text-orange-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          {product.approval_status !== "banned" && product.seller_id && (
                            <DropdownMenuItem
                              onClick={() => setRejectDialog({ open: true, productId: product.id, action: "ban" })}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Ban className="h-4 w-4 mr-2" />Ban
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(product.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Infinite Scroll Sentinel & Counter */}
          {!loading && filteredProducts.length > 0 && (
            <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground bg-muted/10">
              <span>
                Showing <strong className="text-foreground">1</strong> to <strong className="text-foreground">{Math.min(visibleProducts.length, filteredProducts.length)}</strong> of <strong className="text-foreground">{filteredProducts.length}</strong> products
              </span>
              {visibleProducts.length < filteredProducts.length ? (
                <div ref={sentinelRef} className="text-xs text-primary font-medium flex items-center gap-1.5 py-1">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Scroll down to load more products...
                </div>
              ) : (
                <span className="text-xs text-muted-foreground font-medium">All {filteredProducts.length} products loaded</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reject/Ban Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => { if (!open) { setRejectDialog({ open: false, productId: "", action: "reject" }); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{rejectDialog.action === "ban" ? "Ban Product" : "Reject Product"}</DialogTitle>
            <DialogDescription>
              {rejectDialog.action === "ban"
                ? "This will ban the product and prevent the seller from relisting it."
                : "Provide a reason so the seller knows what to fix."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialog({ open: false, productId: "", action: "reject" }); setRejectReason(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectOrBan}
              disabled={actionLoading}
            >
              {actionLoading ? "Processing..." : rejectDialog.action === "ban" ? "Ban Product" : "Reject Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* In-panel Product Preview */}
      <AdminProductPreviewDialog
        productId={previewId}
        open={!!previewId}
        onOpenChange={(o) => !o && setPreviewId(null)}
        actionLoading={actionLoading}
        onApprove={async (id) => { await handleApprove(id); setPreviewId(null); }}
        onReject={(id) => { setPreviewId(null); setRejectDialog({ open: true, productId: id, action: "reject" }); }}
        onBan={(id) => { setPreviewId(null); setRejectDialog({ open: true, productId: id, action: "ban" }); }}
      />
    </AdminLayout>
  );
}
