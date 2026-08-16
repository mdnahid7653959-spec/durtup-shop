import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  MapPin, 
  CreditCard, 
  Phone, 
  Mail,
  Download,
  MessageSquare,
  RotateCcw,
  Loader2,
  Copy,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/lib/firebaseAdapter";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { useToast } from "@/hooks/use-toast";

interface OrderItem {
  id: string;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_image?: string;
  total?: number;
  price?: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  shipping_address: any;
  tracking_number?: string;
  courier_name?: string;
  created_at: string;
  shipped_at?: string;
  delivered_at?: string;
  order_items: OrderItem[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    case "confirmed":
    case "processing":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "shipped":
      return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    case "delivered":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "cancelled":
      return "bg-red-500/10 text-red-600 border-red-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id || !user) return;
      setIsLoading(true);

      try {
        const { data: orderData } = await supabase
          .from("orders")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (orderData) {
          const { data: itemsData } = await supabase
            .from("order_items")
            .select("*")
            .eq("order_id", id);
            
          const formattedItems = await Promise.all((itemsData || []).map(async (it: any) => {
            let product_image = it.product_image || it.image || null;
            
            // Try fetching image from product_images if it's missing (for older orders)
            if (!product_image && it.product_id) {
              try {
                const { data: images } = await supabase
                  .from("product_images")
                  .select("image_url, is_primary")
                  .eq("product_id", it.product_id);

                if (images && images.length > 0) {
                  const primaryImage = images.find((img: any) => img.is_primary);
                  product_image = primaryImage?.image_url || images[0]?.image_url || null;
                }
              } catch {}
            }

            return {
              id: it.id,
              product_name: it.product_name || "Product",
              variant_name: it.variant_name || null,
              quantity: Number(it.quantity || 1),
              unit_price: Number(it.price || it.unit_price || 0),
              total_price: Number(it.total || (it.price || it.unit_price || 0) * (it.quantity || 1)),
              product_image: product_image,
              product_id: it.product_id || null
            };
          }));

          setOrder({
            ...orderData,
            order_items: formattedItems
          });
          setIsLoading(false);
          return;
        }

        // Firestore Fallback
        const docRef = doc(db, "orders", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const raw = docSnap.data();
          const formatted: Order = {
            id: docSnap.id,
            order_number: raw.order_number || raw.orderNumber || docSnap.id.slice(0, 10),
            status: (raw.status || "pending").toLowerCase(),
            payment_status: (raw.payment_status || raw.paymentStatus || "pending").toLowerCase(),
            payment_method: raw.payment_method || raw.paymentMethod || "cod",
            subtotal: Number(raw.subtotal || raw.totalAmount || 0),
            shipping_cost: Number(raw.shipping_cost || raw.shippingCost || 0),
            tax_amount: Number(raw.tax_amount || raw.tax || 0),
            discount_amount: Number(raw.discount_amount || raw.discount || 0),
            total: Number(raw.totalAmount || raw.price || raw.total || 0),
            shipping_address: raw.shipping_address || raw.shippingAddress || {},
            tracking_number: raw.tracking_number || raw.trackingNumber,
            courier_name: raw.courier_name || raw.courierName,
            created_at: raw.createdAt || raw.created_at || new Date().toISOString(),
            order_items: Array.isArray(raw.items) ? raw.items.map((it: any, idx: number) => ({
              id: it.id || `item-${idx}`,
              product_name: it.product?.name || it.name || "Product",
              variant_name: it.variant_name || null,
              quantity: Number(it.quantity || 1),
              unit_price: Number(it.price || it.unit_price || 0),
              total_price: Number((it.price || it.unit_price || 0) * (it.quantity || 1)),
              product_image: it.image || it.product?.image
            })) : []
          };
          setOrder(formatted);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.warn("Error fetching order details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [id, user]);

  const handleCopyTracking = () => {
    if (order?.tracking_number) {
      navigator.clipboard.writeText(order.tracking_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p>Please login to view order details</p>
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center gap-4">
          <Package className="h-16 w-16 text-muted-foreground" />
          <p className="text-lg font-medium">Order not found</p>
          <Button onClick={() => navigate("/orders")}>View All Orders</Button>
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  const shippingAddress = order.shipping_address || {};

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 pb-24 md:pb-8">
        <div className="container max-w-4xl py-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/orders")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold">Order Details</h1>
              <p className="text-sm text-muted-foreground">{order.order_number}</p>
            </div>
            <Badge className={getStatusColor(order.status)}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>

          {/* Order Timeline */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Order Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline
                currentStatus={order.status as any}
                orderDate={order.created_at}
                shippedDate={order.shipped_at}
                deliveredDate={order.delivered_at}
              />

              {/* Tracking Info */}
              {order.tracking_number && (
                <div className="mt-6 p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Tracking Number</p>
                      <p className="font-mono font-medium">{order.tracking_number}</p>
                      {order.courier_name && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          via {order.courier_name}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyTracking}
                      className="gap-2"
                    >
                      {copied ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-5 w-5" />
                Items ({order.order_items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {item.product_image ? (
                      <img 
                        src={item.product_image} 
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-2">{item.product_name}</p>
                    {item.variant_name && (
                      <p className="text-xs text-muted-foreground">{item.variant_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">৳{(item.total || item.total_price || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">৳{(item.price || item.unit_price || 0).toLocaleString()} each</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <p className="font-medium">
                  {shippingAddress.firstName} {shippingAddress.lastName}
                </p>
                <p className="text-muted-foreground">{shippingAddress.address}</p>
                <p className="text-muted-foreground">
                  {shippingAddress.city}
                  {shippingAddress.state && `, ${shippingAddress.state}`}
                  {shippingAddress.zipCode && ` - ${shippingAddress.zipCode}`}
                </p>
                <p className="text-muted-foreground">{shippingAddress.country}</p>
                <div className="flex items-center gap-2 pt-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{shippingAddress.phone}</span>
                </div>
                {shippingAddress.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{shippingAddress.email}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>৳{order.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{order.shipping_cost === 0 ? "Free" : `৳${order.shipping_cost.toLocaleString()}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>৳{(order.tax_amount || 0).toLocaleString()}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-৳{order.discount_amount.toLocaleString()}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-primary">৳{order.total.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant="outline" className="text-xs">
                    {order.payment_method === "cod" ? "Cash on Delivery" : order.payment_method}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={order.payment_status === "paid" ? "text-green-600" : "text-yellow-600"}
                  >
                    {order.payment_status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            {order.status === "pending" && (
              <Button variant="destructive" className="flex-1">
                Cancel Order
              </Button>
            )}
            {order.status === "delivered" && (
              <>
                <Button variant="outline" className="flex-1 gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Return
                </Button>
                <Button variant="outline" className="flex-1 gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Review
                </Button>
              </>
            )}
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Invoice
            </Button>
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
