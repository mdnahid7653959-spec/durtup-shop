import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Edit, Eye, MoreHorizontal, RefreshCw, AlertCircle, CheckCircle, XCircle, Clock, Trash2 } from "lucide-react";
import { supabase } from "@/lib/firebaseAdapter";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Product {
  id: string;
  name: string;
  slug: string;
  regular_price: number;
  discount_price: number | null;
  stock_quantity: number;
  status: string;
  approval_status: string;
  created_at: string;
}

export default function SellerProducts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchSellerAndProducts();
  }, [user, navigate]);

  const fetchSellerAndProducts = async () => {
    if (!user) return;

    // First get seller info
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

    // Get profile ID since products.seller_id references profiles.id
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      console.error("Profile not found");
      setLoading(false);
      return;
    }

    // Fetch products using profile.id (which matches products.seller_id)
    const { data, error } = await supabase
      .from("products")
      .select("id, name, slug, regular_price, discount_price, stock_quantity, status, approval_status, created_at")
      .eq("seller_id", profile.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching products:", error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const handleDeleteProduct = async () => {
    if (!deleteProductId || !sellerId) return;

    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("seller-products", {
        body: {
          action: "delete",
          productId: deleteProductId,
        }
      });

      if (error || data?.error) {
        toast({ variant: "destructive", title: "Failed to delete product" });
      } else {
        toast({ title: "Product deleted successfully" });
        setProducts(products.filter(p => p.id !== deleteProductId));
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error deleting product" });
    }
    setDeleting(false);
    setDeleteProductId(null);
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchSellerAndProducts();
    toast({ title: "Products refreshed" });
  };

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case "banned":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            Banned
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        );
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SellerLayout title="My Products">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Products</h1>
            <p className="text-muted-foreground">Manage your product listings</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link to="/seller/products/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="border rounded-lg bg-card p-8 text-center text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <AlertCircle className="h-8 w-8 opacity-50" />
                <p>No products found</p>
                <Link to="/seller/products/new">
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add your first product
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div key={product.id} className="border rounded-lg bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground text-sm truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground truncate">/{product.slug}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-1 -mt-1 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      {product.approval_status === "approved" && product.status === "active" && (
                        <DropdownMenuItem asChild>
                          <Link to={`/product/${product.slug}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Live
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link to={`/seller/products/${product.id}`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteProductId(product.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      ৳{(product.discount_price || product.regular_price).toLocaleString()}
                    </p>
                    {product.discount_price && (
                      <p className="text-[11px] text-muted-foreground line-through">
                        ৳{product.regular_price.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Badge variant={product.stock_quantity > 10 ? "outline" : "destructive"} className="text-[10px]">
                    {product.stock_quantity} in stock
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant={product.status === "active" ? "default" : "secondary"} className="text-[10px]">
                    {product.status}
                  </Badge>
                  {getApprovalBadge(product.approval_status || "pending")}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop / tablet table */}
        <div className="hidden md:block border rounded-lg bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-8 w-8 opacity-50" />
                      <p>No products found</p>
                      <Link to="/seller/products/new">
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add your first product
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="font-medium text-foreground truncate">{product.name}</p>
                        <p className="text-sm text-muted-foreground">/{product.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          ৳{(product.discount_price || product.regular_price).toLocaleString()}
                        </p>
                        {product.discount_price && (
                          <p className="text-sm text-muted-foreground line-through">
                            ৳{product.regular_price.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.stock_quantity > 10 ? "outline" : "destructive"}>
                        {product.stock_quantity} in stock
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.status === "active" ? "default" : "secondary"}>
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getApprovalBadge(product.approval_status || "pending")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          {product.approval_status === "approved" && product.status === "active" && (
                            <DropdownMenuItem asChild>
                              <Link to={`/product/${product.slug}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Live
                              </Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem asChild>
                            <Link to={`/seller/products/${product.id}`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDeleteProductId(product.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Product?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the product and all associated images.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteProduct}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SellerLayout>
  );
}
