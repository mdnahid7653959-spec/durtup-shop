import { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Ban,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Package,
  Layers,
  Sparkles,
  Database,
  Store,
  Filter
} from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { getCachedMohasagorProducts, fetchAllPagesMohasagorProducts } from "@/utils/mohasagorCache";

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
  image?: string;
  sku?: string;
  category?: string;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>("");
  const lastFetchRef = useRef<number>(0);

  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; productId: string; action: "reject" | "ban" }>({
    open: false,
    productId: "",
    action: "reject"
  });
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
            slug: data.slug || `product-${data.id}`,
            regular_price: Number(data.price || data.regular_price || 0),
            discount_price: data.discountPrice || data.discount_price || null,
            stock_quantity: Number(data.stock || data.stock_quantity || 0),
            status: data.status || "active",
            approval_status: data.approvalStatus || data.approval_status || "approved",
            seller_id: data.seller_id || "Admin",
            is_featured: Boolean(data.isFeatured || data.is_featured),
            created_at: data.createdAt || data.created_at || new Date().toISOString(),
            image: data.image || data.image_url || (Array.isArray(data.images) ? data.images[0] : null) || "",
            sku: data.sku || `LOCAL-${data.id}`,
            category: data.category || data.category_name || "General"
          }));
        }
      }
    } catch {}

    // If local items exist and we have no products yet, render immediately
    if (localAdminProds.length > 0 && products.length === 0) {
      setProducts(localAdminProds);
      setLoading(false);
    }

    // 2. Fetch Database, Firestore, and Supplier API products in parallel
    const [dbResult, firestoreSnapResult, supplierResult] = await Promise.allSettled([
      supabase.from("products").select("*, product_images(image_url)").order("created_at", { ascending: false }),
      getDocs(collection(db, "products")),
      getCachedMohasagorProducts()
    ]);

    let dbProdsList: Product[] = [];
    if (dbResult.status === "fulfilled" && !dbResult.value.error && dbResult.value.data) {
      dbProdsList = (dbResult.value.data as any[]).map((p: any) => ({
        id: String(p.id),
        name: p.name || "Product",
        slug: p.slug || `product-${p.id}`,
        regular_price: Number(p.regular_price || p.price || 0),
        discount_price: p.discount_price ? Number(p.discount_price) : null,
        stock_quantity: Number(p.stock_quantity ?? 0),
        status: p.status || "active",
        approval_status: p.approval_status || "approved",
        seller_id: p.seller_id || "Admin",
        is_featured: Boolean(p.is_featured),
        created_at: p.created_at || new Date().toISOString(),
        image: p.image_url || p.image || (Array.isArray(p.product_images) && p.product_images[0]?.image_url) || "",
        sku: p.sku || `SKU-${p.id}`,
        category: p.category_id || p.category || "General"
      }));
    }

    let firestoreProdsList: Product[] = [];
    if (firestoreSnapResult.status === "fulfilled" && firestoreSnapResult.value && !firestoreSnapResult.value.empty) {
      firestoreSnapResult.value.forEach((d) => {
        const p = d.data();
        firestoreProdsList.push({
          id: String(d.id),
          name: p.name || p.title || "Product",
          slug: p.slug || `product-${d.id}`,
          regular_price: Number(p.regular_price || p.price || 0),
          discount_price: p.discount_price ? Number(p.discount_price) : null,
          stock_quantity: Number(p.stock_quantity ?? p.stock ?? 0),
          status: p.status || "active",
          approval_status: p.approval_status || p.approvalStatus || "approved",
          seller_id: p.seller_id || "Admin",
          is_featured: Boolean(p.is_featured || p.isFeatured),
          created_at: p.created_at || p.createdAt || new Date().toISOString(),
          image: p.image_url || p.image || (Array.isArray(p.images) ? p.images[0] : null) || "",
          sku: p.sku || `FS-${d.id}`,
          category: p.category || p.category_name || "General"
        });
      });
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
        created_at: new Date().toISOString(),
        image: sp.image || (Array.isArray(sp.images) ? sp.images[0] : null) || (Array.isArray(sp.product_images) ? sp.product_images[0]?.image_url : "") || "",
        sku: sp.sku || (sp.product_code ? String(sp.product_code) : `API-${sp.id}`),
        category: sp.category || "Supplier API"
      }));
    }

    // 3. Merge Local + Firestore + DB + Supplier products cleanly
    const mergedMap = new Map<string, Product>();
    localAdminProds.forEach((p) => mergedMap.set(p.id, p));
    firestoreProdsList.forEach((p) => { if (!mergedMap.has(p.id)) mergedMap.set(p.id, p); });
    dbProdsList.forEach((p) => { if (!mergedMap.has(p.id)) mergedMap.set(p.id, p); });
    supplierProdsList.forEach((p) => { if (!mergedMap.has(p.id)) mergedMap.set(p.id, p); });

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
    toast({
      title: "Synchronizing Products",
      description: "Fetching full catalog across all supplier API pages..."
    });

    try {
      const synced = await fetchAllPagesMohasagorProducts(true);
      await fetchProducts(true);
      invalidateProducts();
      toast({
        title: "Synchronization Complete!",
        description: `Successfully verified and synced ${synced.length.toLocaleString()} products from API.`
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Sync Warning",
        description: "Products updated with cached master catalog."
      });
      await fetchProducts(true);
    } finally {
      setRefreshing(false);
    }
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
    toast({ title: "Product approved!", description: "Product is now live on marketplace." });

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
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium"><CheckCircle className="h-3 w-3 mr-1 text-emerald-500" />Approved</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-medium"><Clock className="h-3 w-3 mr-1 text-amber-500" />Pending</Badge>;
      case "rejected":
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 font-medium"><XCircle className="h-3 w-3 mr-1 text-rose-500" />Rejected</Badge>;
      case "banned":
        return <Badge className="bg-red-950/20 text-red-700 border-red-700/30 font-medium"><Ban className="h-3 w-3 mr-1 text-red-600" />Banned</Badge>;
      default:
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium"><CheckCircle className="h-3 w-3 mr-1 text-emerald-500" />Approved</Badge>;
    }
  };

  const getSellerBadge = (sellerId: string | null) => {
    if (!sellerId || sellerId.toLowerCase() === "admin") {
      return <Badge variant="secondary" className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Admin</Badge>;
    }
    if (sellerId.toLowerCase().includes("mohasagor") || sellerId.toLowerCase().includes("supplier")) {
      return (
        <Badge className="text-[11px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20">
          <Database className="h-2.5 w-2.5 mr-1" />
          API Supplier
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5">
        <Store className="h-2.5 w-2.5 mr-1" />
        {sellerId.length > 14 ? `${sellerId.slice(0, 14)}...` : sellerId}
      </Badge>
    );
  };

  // Filter products by tab, search, and stock status
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        p.id.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Stock status filter
      if (stockFilter === "in_stock" && p.stock_quantity <= 10) return false;
      if (stockFilter === "low_stock" && (p.stock_quantity <= 0 || p.stock_quantity > 10)) return false;
      if (stockFilter === "out_of_stock" && p.stock_quantity > 0) return false;

      const appStatus = (p.approval_status || p.status || "approved").toLowerCase();
      const isSupplier = p.seller_id && (p.seller_id.toLowerCase().includes("mohasagor") || p.seller_id.toLowerCase().includes("supplier"));
      const isAdmin = !p.seller_id || p.seller_id.toLowerCase() === "admin";
      const isSeller = p.seller_id && !isAdmin && !isSupplier;

      if (activeTab === "all") return true;
      if (activeTab === "supplier") return isSupplier;
      if (activeTab === "admin") return isAdmin;
      if (activeTab === "seller") return isSeller;
      if (activeTab === "pending") return appStatus === "pending";
      if (activeTab === "approved") return appStatus === "approved" || appStatus === "active";
      if (activeTab === "rejected") return appStatus === "rejected" || appStatus === "banned";

      return true;
    });
  }, [products, searchQuery, activeTab, stockFilter]);

  // Tab counters
  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let supplier = 0;
    let adminCount = 0;
    let seller = 0;

    products.forEach((p) => {
      const appStatus = (p.approval_status || p.status || "approved").toLowerCase();
      const isSupplier = p.seller_id && (p.seller_id.toLowerCase().includes("mohasagor") || p.seller_id.toLowerCase().includes("supplier"));
      const isAdmin = !p.seller_id || p.seller_id.toLowerCase() === "admin";

      if (appStatus === "pending") pending++;
      if (appStatus === "approved" || appStatus === "active") approved++;
      if (appStatus === "rejected" || appStatus === "banned") rejected++;

      if (isSupplier) supplier++;
      else if (isAdmin) adminCount++;
      else seller++;
    });

    return {
      all: products.length,
      pending,
      approved,
      rejected,
      supplier,
      admin: adminCount,
      seller
    };
  }, [products]);

  // Pagination calculation
  const totalPages = useMemo(() => {
    if (pageSize <= 0) return 1;
    return Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  }, [filteredProducts.length, pageSize]);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const visibleProducts = useMemo(() => {
    if (pageSize <= 0) return filteredProducts;
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handlePageJump = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      setCurrentPage(p);
      setPageInput("");
    }
  };

  return (
    <AdminLayout title="Products">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Package className="h-7 w-7 text-primary" />
              Products Catalog
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage complete inventory, live API products ({products.length.toLocaleString()} items), and vendor approvals.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2 border-primary/30 hover:border-primary text-foreground"
            >
              <RefreshCw className={`h-4 w-4 text-primary ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Syncing API..." : "Sync API Products"}
            </Button>
            <Link to="/admin/products/new">
              <Button className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            </Link>
          </div>
        </div>

        {/* Tabs & Categorization */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="h-auto flex-wrap gap-1.5 p-1.5 bg-muted/40 border">
            <TabsTrigger value="all" className="gap-1.5 px-3 py-1.5">
              All Products
              <span className="ml-1 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                {counts.all.toLocaleString()}
              </span>
            </TabsTrigger>
            <TabsTrigger value="supplier" className="gap-1.5 px-3 py-1.5">
              <Database className="h-3.5 w-3.5 text-blue-500" />
              Supplier API
              <span className="ml-1 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                {counts.supplier.toLocaleString()}
              </span>
            </TabsTrigger>
            <TabsTrigger value="admin" className="gap-1.5 px-3 py-1.5">
              Admin Products
              <span className="ml-1 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400">
                {counts.admin.toLocaleString()}
              </span>
            </TabsTrigger>
            <TabsTrigger value="seller" className="gap-1.5 px-3 py-1.5">
              <Store className="h-3.5 w-3.5 text-purple-500" />
              Seller Products
              <span className="ml-1 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                {counts.seller.toLocaleString()}
              </span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="relative gap-1.5 px-3 py-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              Pending Approvals
              {counts.pending > 0 && (
                <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                  {counts.pending}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-1.5 px-3 py-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              Approved
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-1.5 px-3 py-1.5">
              <XCircle className="h-3.5 w-3.5 text-rose-500" />
              Rejected / Banned
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search, Filters, and Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, SKU, slug, category..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 bg-card"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>

            <Select value={stockFilter} onValueChange={(v) => { setStockFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[140px] bg-card">
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="in_stock">In Stock (&gt;10)</SelectItem>
                <SelectItem value="low_stock">Low Stock (1-10)</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock (0)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-muted-foreground">
            <span>Show:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[85px] h-8 text-xs bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
                <SelectItem value="500">500</SelectItem>
              </SelectContent>
            </Select>
            <span>per page</span>
          </div>
        </div>

        {/* Products Table Card */}
        <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[70px]">Image</TableHead>
                  <TableHead className="min-w-[240px]">Product Information</TableHead>
                  <TableHead className="min-w-[120px]">Price (BDT)</TableHead>
                  <TableHead className="min-w-[110px]">Stock</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[120px]">Approval</TableHead>
                  <TableHead className="min-w-[120px]">Source / Seller</TableHead>
                  <TableHead className="w-[60px] text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="h-6 w-6 text-primary animate-spin" />
                        <p className="text-sm font-medium text-muted-foreground">Loading products catalog...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : visibleProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Package className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-base font-semibold text-foreground">No products found</p>
                        <p className="text-xs text-muted-foreground">
                          {searchQuery ? `No matches for "${searchQuery}". Try a different keyword.` : "No products available in this category."}
                        </p>
                        {searchQuery && (
                          <Button variant="outline" size="sm" onClick={() => handleSearchChange("")} className="mt-2">
                            Reset Search
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleProducts.map((product) => {
                    const fallbackImg = "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=100&h=100&fit=crop";
                    const isApiProduct = product.seller_id?.toLowerCase().includes("mohasagor") || product.seller_id?.toLowerCase().includes("supplier");

                    return (
                      <TableRow
                        key={product.id}
                        className={`hover:bg-muted/40 transition-colors ${
                          product.approval_status === "pending" ? "bg-amber-500/5" : ""
                        }`}
                      >
                        {/* Thumbnail Image */}
                        <TableCell className="py-2.5">
                          <div
                            onClick={() => setPreviewId(product.id)}
                            className="relative h-12 w-12 rounded-lg border bg-muted/20 overflow-hidden flex items-center justify-center cursor-pointer group shrink-0"
                          >
                            <img
                              src={product.image || fallbackImg}
                              alt={product.name}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = fallbackImg;
                              }}
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Eye className="h-3.5 w-3.5 text-white" />
                            </div>
                          </div>
                        </TableCell>

                        {/* Name & Details */}
                        <TableCell className="py-2.5">
                          <div className="space-y-1 max-w-sm">
                            <p
                              onClick={() => setPreviewId(product.id)}
                              className="font-semibold text-foreground text-sm leading-snug line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                              title={product.name}
                            >
                              {product.name}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                              {product.sku && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                                  {product.sku}
                                </Badge>
                              )}
                              {product.category && (
                                <span className="text-[11px] text-muted-foreground/80">
                                  • {product.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Price */}
                        <TableCell className="py-2.5 whitespace-nowrap">
                          <div>
                            <p className="font-bold text-foreground text-sm">
                              ৳{(product.discount_price || product.regular_price).toLocaleString()}
                            </p>
                            {product.discount_price && product.discount_price < product.regular_price && (
                              <p className="text-xs text-muted-foreground line-through">
                                ৳{product.regular_price.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* Stock */}
                        <TableCell className="py-2.5 whitespace-nowrap">
                          {product.stock_quantity > 10 ? (
                            <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/5">
                              {product.stock_quantity} in stock
                            </Badge>
                          ) : product.stock_quantity > 0 ? (
                            <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/5">
                              {product.stock_quantity} low stock
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              Out of stock
                            </Badge>
                          )}
                        </TableCell>

                        {/* Active / Inactive Status */}
                        <TableCell className="py-2.5 whitespace-nowrap">
                          <Badge
                            variant={product.status === "active" ? "default" : "secondary"}
                            className="cursor-pointer hover:opacity-85 text-xs select-none transition-opacity"
                            onClick={() => toggleStatus(product.id, product.status)}
                            title="Click to toggle active status"
                          >
                            {product.status === "active" ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>

                        {/* Approval Status */}
                        <TableCell className="py-2.5 whitespace-nowrap">
                          {getApprovalBadge(product.approval_status)}
                        </TableCell>

                        {/* Source / Seller */}
                        <TableCell className="py-2.5 whitespace-nowrap">
                          {getSellerBadge(product.seller_id)}
                        </TableCell>

                        {/* Actions Menu */}
                        <TableCell className="py-2.5 text-right whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-popover">
                              <DropdownMenuItem onClick={() => setPreviewId(product.id)}>
                                <Eye className="h-4 w-4 mr-2 text-primary" />
                                Preview Product
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/admin/products/${product.id}`}>
                                  <Edit className="h-4 w-4 mr-2 text-blue-500" />
                                  Edit Product
                                </Link>
                              </DropdownMenuItem>

                              {product.approval_status === "pending" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleApprove(product.id)}
                                    className="text-emerald-600 focus:text-emerald-600"
                                    disabled={actionLoading}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve Product
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setRejectDialog({ open: true, productId: product.id, action: "reject" })}
                                    className="text-amber-600 focus:text-amber-600"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject Product
                                  </DropdownMenuItem>
                                </>
                              )}

                              {product.approval_status !== "banned" && !isApiProduct && product.seller_id && product.seller_id !== "Admin" && (
                                <DropdownMenuItem
                                  onClick={() => setRejectDialog({ open: true, productId: product.id, action: "ban" })}
                                  className="text-rose-600 focus:text-rose-600"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Ban Product
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(product.id)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
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

          {/* Pagination & Status Footer */}
          {!loading && filteredProducts.length > 0 && (
            <div className="p-4 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-muted-foreground bg-muted/10">
              <div>
                Showing{" "}
                <strong className="text-foreground">
                  {((currentPage - 1) * pageSize + 1).toLocaleString()}
                </strong>{" "}
                to{" "}
                <strong className="text-foreground">
                  {Math.min(currentPage * pageSize, filteredProducts.length).toLocaleString()}
                </strong>{" "}
                of <strong className="text-foreground">{filteredProducts.length.toLocaleString()}</strong> products
                {filteredProducts.length !== products.length && (
                  <span className="text-muted-foreground/70 ml-1">
                    (filtered from {products.length.toLocaleString()} total)
                  </span>
                )}
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage <= 1}
                  title="First Page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  title="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Page Number Summary */}
                <div className="px-2.5 py-1 rounded-md bg-card border text-xs font-semibold text-foreground">
                  Page {currentPage} of {totalPages}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  title="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  title="Last Page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>

                {/* Jump to Page Form */}
                {totalPages > 5 && (
                  <form onSubmit={handlePageJump} className="flex items-center gap-1 ml-2">
                    <Input
                      type="number"
                      min={1}
                      max={totalPages}
                      placeholder="Jump"
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      className="w-16 h-8 text-xs px-2"
                    />
                    <Button type="submit" variant="secondary" size="sm" className="h-8 px-2.5 text-xs">
                      Go
                    </Button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject/Ban Dialog */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setRejectDialog({ open: false, productId: "", action: "reject" });
            setRejectReason("");
          }
        }}
      >
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
              placeholder="Enter reason for rejection or ban..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialog({ open: false, productId: "", action: "reject" });
                setRejectReason("");
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectOrBan} disabled={actionLoading}>
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
        onApprove={async (id) => {
          await handleApprove(id);
          setPreviewId(null);
        }}
        onReject={(id) => {
          setPreviewId(null);
          setRejectDialog({ open: true, productId: id, action: "reject" });
        }}
        onBan={(id) => {
          setPreviewId(null);
          setRejectDialog({ open: true, productId: id, action: "ban" });
        }}
      />
    </AdminLayout>
  );
}
