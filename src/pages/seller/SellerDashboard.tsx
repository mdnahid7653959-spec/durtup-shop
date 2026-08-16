import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/firebaseAdapter";
import { useToast } from "@/hooks/use-toast";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Plus,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
} from "lucide-react";

interface SellerStats {
  totalProducts: number;
  activeProducts: number;
  pendingProducts: number;
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
  pendingEarnings: number;
  paidEarnings: number;
  thisMonthRevenue: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
}

interface Seller {
  id: string;
  shop_name: string;
  status: string;
  rating_average: number;
  total_products: number;
  total_orders: number;
  total_sales: number;
}

export default function SellerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    fetchSellerData();
  }, [user, navigate]);

  const fetchSellerData = async () => {
    if (!user) return;

    try {
      // Fetch seller profile
      const { data: sellerData, error: sellerError } = await supabase
        .from("sellers")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (sellerError || !sellerData) {
        navigate("/seller/register");
        return;
      }

      if (sellerData.status === "pending") {
        navigate("/seller/pending");
        return;
      }

      if (sellerData.status !== "approved") {
        toast({
          title: "Account Issue",
          description: "Your seller account is not active. Please contact support.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setSeller(sellerData);

      // Fetch products stats
      const { data: products } = await supabase
        .from("products")
        .select("id, status, approval_status")
        .eq("seller_id", sellerData.id);

      const productStats = {
        total: products?.length || 0,
        active: products?.filter((p) => p.status === "active" && p.approval_status === "approved").length || 0,
        pending: products?.filter((p) => p.approval_status === "pending").length || 0,
      };

      // Fetch orders stats
      const { data: orders } = await supabase
        .from("orders")
        .select("id, status, total, created_at, order_number")
        .eq("seller_id", sellerData.id)
        .order("created_at", { ascending: false });

      const orderStats = {
        total: orders?.length || 0,
        pending: orders?.filter((o) => o.status === "pending").length || 0,
        processing: orders?.filter((o) => o.status === "processing").length || 0,
        shipped: orders?.filter((o) => o.status === "shipped").length || 0,
        delivered: orders?.filter((o) => o.status === "delivered").length || 0,
      };

      const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const thisMonthRevenue =
        orders
          ?.filter((o) => new Date(o.created_at) >= thisMonth)
          .reduce((sum, o) => sum + Number(o.total), 0) || 0;

      // Fetch earnings stats
      const { data: earnings } = await supabase
        .from("seller_earnings")
        .select("net_amount, status")
        .eq("seller_id", sellerData.id);

      const pendingEarnings =
        earnings
          ?.filter((e) => e.status === "pending" || e.status === "confirmed")
          .reduce((sum, e) => sum + Number(e.net_amount), 0) || 0;

      const paidEarnings =
        earnings?.filter((e) => e.status === "paid").reduce((sum, e) => sum + Number(e.net_amount), 0) || 0;

      setStats({
        totalProducts: productStats.total,
        activeProducts: productStats.active,
        pendingProducts: productStats.pending,
        totalOrders: orderStats.total,
        pendingOrders: orderStats.pending,
        processingOrders: orderStats.processing,
        shippedOrders: orderStats.shipped,
        deliveredOrders: orderStats.delivered,
        totalRevenue,
        pendingEarnings,
        paidEarnings,
        thisMonthRevenue,
      });

      setRecentOrders(orders?.slice(0, 5) || []);
    } catch (error) {
      console.error("Error fetching seller data:", error);
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-600",
    processing: "bg-blue-500/10 text-blue-600",
    shipped: "bg-purple-500/10 text-purple-600",
    delivered: "bg-green-500/10 text-green-600",
    cancelled: "bg-red-500/10 text-red-600",
  };

  if (loading) {
    return (
      <SellerLayout title="Dashboard">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome Banner */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Welcome back, {seller?.shop_name}!</h2>
                <p className="text-muted-foreground mt-1">
                  Here's what's happening with your store today.
                </p>
              </div>
              <Button onClick={() => navigate("/seller/products/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Product
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.activeProducts || 0} active, {stats?.pendingProducts || 0} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.pendingOrders || 0} pending, {stats?.processingOrders || 0} processing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">৳{stats?.totalRevenue?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">
                ৳{stats?.thisMonthRevenue?.toLocaleString() || 0} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Earnings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">৳{stats?.pendingEarnings?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">
                ৳{stats?.paidEarnings?.toLocaleString() || 0} paid out
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Order Status Overview */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <Card className="bg-yellow-500/5 border-yellow-500/20">
            <CardContent className="py-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.pendingOrders || 0}</p>
                <p className="text-xs text-muted-foreground">Pending Orders</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="py-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/10">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.processingOrders || 0}</p>
                <p className="text-xs text-muted-foreground">Processing</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-500/5 border-purple-500/20">
            <CardContent className="py-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-500/10">
                <Truck className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.shippedOrders || 0}</p>
                <p className="text-xs text-muted-foreground">Shipped</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="py-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.deliveredOrders || 0}</p>
                <p className="text-xs text-muted-foreground">Delivered</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders & Quick Actions */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Orders</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/seller/orders")}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No orders yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors min-w-0"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="p-1.5 sm:p-2 rounded-full bg-primary/10 shrink-0">
                          <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{order.order_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={`${statusColors[order.status]} text-xs`}>
                          {order.status}
                        </Badge>
                        <span className="font-medium text-sm">৳{Number(order.total).toLocaleString()}</span>
                        <Button variant="ghost" size="icon" className="hidden sm:inline-flex h-8 w-8" onClick={() => navigate(`/seller/orders/${order.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/seller/products/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Product
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/seller/orders")}>
                <Package className="h-4 w-4 mr-2" />
                Manage Orders
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/seller/products")}>
                <Eye className="h-4 w-4 mr-2" />
                View Products
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/seller/earnings")}>
                <DollarSign className="h-4 w-4 mr-2" />
                View Earnings
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/seller/settings")}>
                <AlertCircle className="h-4 w-4 mr-2" />
                Shop Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </SellerLayout>
  );
}
