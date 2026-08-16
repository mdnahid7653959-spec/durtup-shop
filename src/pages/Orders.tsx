import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Package, ChevronRight, Search, Filter, Clock, CheckCircle, Truck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/lib/firebaseAdapter";
import { db } from "@/integrations/firebase/client";
import { collection, getDocs } from "firebase/firestore";

interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  payment_status: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-800", icon: Package },
  shipped: { label: "Shipped", color: "bg-purple-100 text-purple-800", icon: Truck },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800", icon: XCircle },
};

export default function Orders() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    let orderList: Order[] = [];

    // 1. Query Supabase DB
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        orderList = data as Order[];
      }
    } catch (error) {
      console.warn("Error fetching Supabase orders:", error);
    }

    // 2. Query Firestore DB for user orders
    try {
      const snap = await getDocs(collection(db, "orders"));
      if (!snap.empty) {
        snap.forEach((d) => {
          const data = d.data();
          const uid = data.user_id || data.userId;
          if (uid === user.id || (user.email && uid === user.email)) {
            const pid = d.id;
            const orderNum = data.order_number || data.orderNumber || pid.slice(0, 10);
            if (!orderList.some(o => o.id === pid || o.order_number === orderNum)) {
              orderList.push({
                id: pid,
                order_number: orderNum,
                status: (data.status || "pending").toLowerCase(),
                total: Number(data.totalAmount || data.price || data.total || 0),
                created_at: data.createdAt || data.created_at || new Date().toISOString(),
                payment_status: (data.payment_status || data.paymentStatus || "pending").toLowerCase()
              });
            }
          }
        });
      }
    } catch (fsErr) {
      console.warn("Error fetching Firestore orders:", fsErr);
    }

    setOrders(orderList);
    setLoadingOrders(false);
  };

  const filteredOrders = orders.filter(order =>
    order.order_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusInfo = (status: string) => {
    return statusConfig[status] || statusConfig.pending;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8">
        <div className="container max-w-4xl px-3 sm:px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold">My Orders</h1>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Tabs defaultValue="all" className="space-y-4 sm:space-y-6">
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
              <TabsList className="w-max min-w-full sm:w-auto">
                <TabsTrigger value="all" className="text-xs sm:text-sm">All Orders</TabsTrigger>
                <TabsTrigger value="pending" className="text-xs sm:text-sm">Pending</TabsTrigger>
                <TabsTrigger value="processing" className="text-xs sm:text-sm">Processing</TabsTrigger>
                <TabsTrigger value="shipped" className="text-xs sm:text-sm">Shipped</TabsTrigger>
                <TabsTrigger value="delivered" className="text-xs sm:text-sm">Delivered</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="space-y-4">
              {loadingOrders ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading orders...
                </div>
              ) : filteredOrders.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
                    <p className="text-muted-foreground mb-4">
                      When you place orders, they will appear here.
                    </p>
                    <Button asChild>
                      <Link to="/products">Start Shopping</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                filteredOrders.map((order) => {
                  const statusInfo = getStatusInfo(order.status || "pending");
                  const StatusIcon = statusInfo.icon;
                  return (
                    <Card key={order.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">#{order.order_number}</span>
                            <Badge className={statusInfo.color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Placed on {new Date(order.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <p className="font-bold text-lg">৳{order.total.toFixed(2)}</p>
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/orders/${order.id}`}>
                                View Details <ChevronRight className="w-4 h-4 ml-1" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            {["pending", "processing", "shipped", "delivered"].map((status) => (
              <TabsContent key={status} value={status} className="space-y-4">
                {filteredOrders.filter(o => o.status === status).length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">No {status} orders</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredOrders
                    .filter(o => o.status === status)
                    .map((order) => {
                      const statusInfo = getStatusInfo(order.status || "pending");
                      const StatusIcon = statusInfo.icon;
                      return (
                        <Card key={order.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <span className="font-semibold">#{order.order_number}</span>
                                <Badge className={statusInfo.color}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {statusInfo.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Placed on {new Date(order.created_at).toLocaleDateString()}
                              </p>
                              <div className="flex items-center justify-between pt-2 border-t">
                                <p className="font-bold text-lg">৳{order.total.toFixed(2)}</p>
                                <Button variant="ghost" size="sm" asChild>
                                  <Link to={`/orders/${order.id}`}>
                                    View Details <ChevronRight className="w-4 h-4 ml-1" />
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
