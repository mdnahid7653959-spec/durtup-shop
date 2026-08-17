import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Package, ChevronRight, Search, Clock, CheckCircle, Truck, XCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/lib/firebaseAdapter";
import { db } from "@/integrations/firebase/client";
import { collection, getDocs, onSnapshot, doc, deleteDoc } from "firebase/firestore";

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

      // Realtime listener for Firestore orders
      const unsub = onSnapshot(collection(db, "orders"), () => {
        fetchOrders();
      }, () => {});

      // Storage event listener for cross-tab updates
      const onStorage = () => fetchOrders();
      window.addEventListener("storage", onStorage);

      return () => {
        unsub();
        window.removeEventListener("storage", onStorage);
      };
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    let orderMap = new Map<string, Order>();

    // 1. Query Supabase DB
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        data.forEach((o: any) => {
          const key = o.order_number || o.id;
          orderMap.set(key, {
            id: o.id,
            order_number: o.order_number || o.id.slice(0, 10),
            status: (o.status || "pending").toLowerCase(),
            total: Number(o.total || o.totalAmount || 0),
            created_at: o.created_at || new Date().toISOString(),
            payment_status: (o.payment_status || "pending").toLowerCase()
          });
        });
      }
    } catch (error) {
      console.warn("Error fetching Supabase orders:", error);
    }

    // 2. Query Firestore DB for user orders & merge newest statuses
    try {
      const snap = await getDocs(collection(db, "orders"));
      if (!snap.empty) {
        snap.forEach((d) => {
          const data = d.data();
          const uid = data.user_id || data.userId;
          const isUserMatch = uid === user.id || (user.email && uid === user.email);
          const pid = d.id;
          const orderNum = data.order_number || data.orderNumber || (pid.startsWith("ORD-") ? pid : pid.slice(0, 10));
          const status = (data.status || "pending").toLowerCase();
          const total = Number(data.totalAmount || data.price || data.total || 0);
          const createdAt = data.createdAt || data.created_at || new Date().toISOString();
          const paymentStatus = (data.payment_status || data.paymentStatus || "pending").toLowerCase();

          // Check if matches existing order in map
          let existingKey: string | null = null;
          for (const [k, v] of orderMap.entries()) {
            if (v.id === pid || v.order_number === orderNum || k === pid || k === orderNum) {
              existingKey = k;
              break;
            }
          }

          if (existingKey) {
            const existing = orderMap.get(existingKey)!;
            if (data.status) existing.status = status;
            if (data.payment_status) existing.payment_status = paymentStatus;
            if (total > 0) existing.total = total;
          } else if (isUserMatch && total > 0) {
            // Only add new entry if user strictly matches and total > 0 (prevents 0-taka ghost duplicates)
            orderMap.set(orderNum || pid, {
              id: pid,
              order_number: orderNum,
              status: status,
              total: total,
              created_at: createdAt,
              payment_status: paymentStatus
            });
          }
        });
      }
    } catch (fsErr) {
      console.warn("Error fetching Firestore orders:", fsErr);
    }

    // 3. Merge latest statuses from LocalStorage (enterprise_admin_orders & local_orders)
    try {
      const adminOrdersRaw = localStorage.getItem("enterprise_admin_orders") || localStorage.getItem("local_orders");
      if (adminOrdersRaw) {
        const adminOrders = JSON.parse(adminOrdersRaw);
        if (Array.isArray(adminOrders)) {
          adminOrders.forEach((ao: any) => {
            for (const [k, v] of orderMap.entries()) {
              if (v.id === ao.id || v.order_number === ao.order_number || v.order_number === ao.id || k === ao.id || k === ao.order_number) {
                if (ao.status) v.status = ao.status.toLowerCase();
                if (ao.payment_status) v.payment_status = ao.payment_status.toLowerCase();
                if (Number(ao.total || ao.totalAmount || 0) > 0 && v.total === 0) {
                  v.total = Number(ao.total || ao.totalAmount || 0);
                }
              }
            }
          });
        }
      }
    } catch {}

    // 4. Filter out any zero-taka ghost duplicates and sort by date
    const list = Array.from(orderMap.values())
      .filter((o) => o.total > 0 || o.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setOrders(list);
    setLoadingOrders(false);
  };

  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    try {
      // 1. Optimistically remove from state
      setOrders(prev => prev.filter(o => o.id !== orderId && o.order_number !== orderNumber));

      // 2. Delete from Firestore
      try {
        await deleteDoc(doc(db, "orders", orderId));
        if (orderNumber && orderNumber !== orderId) {
          await deleteDoc(doc(db, "orders", orderNumber));
        }
      } catch (e) {
        console.warn("Firestore delete order error:", e);
      }

      // 3. Delete from Supabase
      try {
        await supabase.from("orders").delete().eq("id", orderId);
        if (orderNumber) {
          await supabase.from("orders").delete().eq("order_number", orderNumber);
        }
      } catch (e) {
        console.warn("Supabase delete order error:", e);
      }

      // 4. Delete from localStorage
      try {
        const removeMatching = (storageKey: string) => {
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const filtered = list.filter((o: any) => o.id !== orderId && o.order_number !== orderNumber && o.order_number !== orderId);
              localStorage.setItem(storageKey, JSON.stringify(filtered));
            }
          }
        };
        removeMatching("enterprise_admin_orders");
        removeMatching("local_orders");
      } catch {}
    } catch (err) {
      console.error("Delete order failed:", err);
    }
  };

  const filteredOrders = orders.filter(order =>
    order.order_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusInfo = (status: string) => {
    return statusConfig[status] || statusConfig.pending;
  };

  const renderOrderCard = (order: Order) => {
    const statusInfo = getStatusInfo(order.status || "pending");
    const StatusIcon = statusInfo.icon;
    return (
      <Card key={order.id} className="hover:shadow-md transition-shadow border">
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-bold text-sm sm:text-base text-foreground">#{order.order_number}</span>
                <Badge className={statusInfo.color}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusInfo.label}
                </Badge>
              </div>

              {/* Delete Button with Modal Confirmation */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs font-semibold flex items-center gap-1.5 ml-auto rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Order #{order.order_number}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this order? It will be permanently removed from your account.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleDeleteOrder(order.id, order.order_number)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Order
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground">
              Placed on {new Date(order.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>

            <div className="flex items-center justify-between pt-3 border-t">
              <p className="font-black text-base sm:text-lg text-foreground">৳{order.total.toFixed(2)}</p>
              <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary font-semibold text-xs sm:text-sm">
                <Link to={`/orders/${order.id}`}>
                  View Details <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
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
                <TabsTrigger value="cancelled" className="text-xs sm:text-sm text-destructive font-semibold">Cancelled</TabsTrigger>
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
                filteredOrders.map(renderOrderCard)
              )}
            </TabsContent>

            {["pending", "processing", "shipped", "delivered", "cancelled"].map((status) => (
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
                    .map(renderOrderCard)
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
