import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Search, RefreshCw, Package, Truck, CheckCircle, XCircle, Clock, Filter } from "lucide-react";
import { supabase } from "@/lib/firebaseAdapter";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  subtotal: number;
  shipping_cost: number;
  created_at: string;
  shipping_address: any;
  tracking_number: string | null;
  courier_name: string | null;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
  variant_name: string | null;
}

export default function SellerOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchSellerAndOrders();
  }, [user, navigate]);

  const fetchSellerAndOrders = async () => {
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
    await fetchOrders(seller.id);
  };

  const fetchOrders = async (sellerIdParam: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("seller_id", sellerIdParam)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const fetchOrderDetails = async (order: Order) => {
    setSelectedOrder(order);
    setDetailsLoading(true);

    const { data, error } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);

    if (!error) {
      setOrderItems(data || []);
    }
    setDetailsLoading(false);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("seller_id", sellerId);

    if (error) {
      toast({ variant: "destructive", title: "Failed to update status" });
    } else {
      toast({ title: `Order status updated to ${newStatus}` });
      if (sellerId) fetchOrders(sellerId);
      setSelectedOrder(null);
    }
  };

  const handleRefresh = async () => {
    if (sellerId) {
      await fetchOrders(sellerId);
      toast({ title: "Orders refreshed" });
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      processing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      shipped: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      delivered: "bg-green-500/10 text-green-600 border-green-500/20",
      cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
      returned: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    };

    const icons: Record<string, any> = {
      pending: Clock,
      processing: Package,
      shipped: Truck,
      delivered: CheckCircle,
      cancelled: XCircle,
      returned: XCircle,
    };

    const Icon = icons[status] || Clock;

    return (
      <Badge className={styles[status] || "bg-gray-500/10 text-gray-600"}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = o.order_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const orderStats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    processing: orders.filter((o) => o.status === "processing").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
  };

  return (
    <SellerLayout title="Orders">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold">{orderStats.total}</p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-yellow-600">{orderStats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-blue-600">{orderStats.processing}</p>
              <p className="text-xs text-muted-foreground">Processing</p>
            </CardContent>
          </Card>
          <Card className="border-purple-500/20 bg-purple-500/5">
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-purple-600">{orderStats.shipped}</p>
              <p className="text-xs text-muted-foreground">Shipped</p>
            </CardContent>
          </Card>
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-green-600">{orderStats.delivered}</p>
              <p className="text-xs text-muted-foreground">Delivered</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1 sm:w-[150px] sm:flex-none">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleRefresh} disabled={loading} className="shrink-0">
              <RefreshCw className={`h-4 w-4 sm:mr-2 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>


        {/* Orders Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium whitespace-nowrap">{order.order_number}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString("bn-BD")}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      <Badge variant={order.payment_status === "paid" ? "default" : "secondary"}>
                        {order.payment_status || "pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap">
                      ৳{Number(order.total).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => fetchOrderDetails(order)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </Card>


        {/* Order Details Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Order #{selectedOrder?.order_number}</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order Date</p>
                    <p className="font-medium">
                      {new Date(selectedOrder.created_at).toLocaleString("bn-BD")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment</p>
                    <Badge variant={selectedOrder.payment_status === "paid" ? "default" : "secondary"}>
                      {selectedOrder.payment_status || "pending"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="font-bold text-lg">৳{Number(selectedOrder.total).toLocaleString()}</p>
                  </div>
                </div>

                {/* Shipping Address */}
                {selectedOrder.shipping_address && (
                  <div className="border rounded-lg p-4">
                    <p className="text-sm font-medium mb-2">Shipping Address</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedOrder.shipping_address.firstName} {selectedOrder.shipping_address.lastName}<br />
                      {selectedOrder.shipping_address.address}<br />
                      {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.zipCode}<br />
                      Phone: {selectedOrder.shipping_address.phone}
                    </p>
                  </div>
                )}

                {/* Order Items */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailsLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4">
                            Loading items...
                          </TableCell>
                        </TableRow>
                      ) : orderItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                            No items found
                          </TableCell>
                        </TableRow>
                      ) : (
                        orderItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.product_name}</p>
                                {(() => {
                                  const vText = item.variant_name || 
                                    item.variant || 
                                    (item.selected_variants ? Object.entries(item.selected_variants).map(([k, v]) => `${k}: ${v}`).join(", ") : null) ||
                                    (item.size ? `Size: ${item.size}${item.color ? ` | Color: ${item.color}` : ""}` : (item.color ? `Color: ${item.color}` : null));
                                  if (!vText) return null;
                                  return (
                                    <div className="mt-1">
                                      <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 border border-orange-500/20">
                                        {vText}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">৳{Number(item.price).toLocaleString()}</TableCell>
                            <TableCell className="text-right font-medium">৳{Number(item.total).toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Update Status Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <p className="text-sm font-medium w-full mb-2">Update Status:</p>
                  {selectedOrder.status === "pending" && (
                    <Button size="sm" onClick={() => handleUpdateStatus(selectedOrder.id, "processing")}>
                      <Package className="h-4 w-4 mr-2" />
                      Mark Processing
                    </Button>
                  )}
                  {selectedOrder.status === "processing" && (
                    <Button size="sm" onClick={() => handleUpdateStatus(selectedOrder.id, "shipped")}>
                      <Truck className="h-4 w-4 mr-2" />
                      Mark Shipped
                    </Button>
                  )}
                  {selectedOrder.status === "shipped" && (
                    <Button size="sm" onClick={() => handleUpdateStatus(selectedOrder.id, "delivered")}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Delivered
                    </Button>
                  )}
                  {(selectedOrder.status === "pending" || selectedOrder.status === "processing") && (
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleUpdateStatus(selectedOrder.id, "cancelled")}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Order
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SellerLayout>
  );
}
