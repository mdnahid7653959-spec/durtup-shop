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
  MessageSquare,
  RotateCcw,
  Loader2,
  Copy,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Headphones,
  Star,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/lib/firebaseAdapter";
import { db } from "@/integrations/firebase/client";
import { doc, getDoc, onSnapshot, setDoc, getDocs, collection } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { useToast } from "@/hooks/use-toast";

import { getCachedMohasagorProducts } from "@/utils/mohasagorCache";

interface OrderItem {
  id: string;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_image?: string | null;
  total?: number;
  price?: number;
  product_id?: string | null;
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
  return_requested?: boolean;
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

const normalizeString = (str: string) => {
  return (str || "")
    .toLowerCase()
    .replace(/[’'"“”()\-–\[\]:,.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const resolveOrderItemImage = async (it: any): Promise<string | null> => {
  // 1. Direct image field
  let img = it.product_image || it.image || it.product?.image || it.product?.image_url || null;
  if (Array.isArray(it.product?.images) && it.product.images.length > 0) {
    img = it.product.images[0];
  }
  if (img && typeof img === "string" && img.length > 5 && !img.includes("undefined") && !img.includes("null")) {
    return img;
  }

  const prodId = String(it.product_id || it.product?.id || it.id || "");
  const prodName = it.product_name || it.product?.name || it.name || "";
  const normTarget = normalizeString(prodName);
  const targetTokens = normTarget.split(" ").filter((t) => t.length > 2);

  // 2. Query Mohasagor & Supplier catalog
  try {
    const mohasagorProducts = await getCachedMohasagorProducts().catch(() => []);
    if (Array.isArray(mohasagorProducts) && mohasagorProducts.length > 0) {
      // Exact ID match
      const idMatch = mohasagorProducts.find(p => String(p.id) === prodId || String(p.slug) === prodId);
      if (idMatch?.image) return idMatch.image;

      // Exact normalized title match
      const exactTitleMatch = mohasagorProducts.find(p => normalizeString(p.name || p.title) === normTarget);
      if (exactTitleMatch?.image) return exactTitleMatch.image;

      // Token overlap match
      let bestMohasagor: any = null;
      let maxScore = 0;
      for (const p of mohasagorProducts) {
        const pNorm = normalizeString(p.name || p.title);
        let score = 0;
        for (const token of targetTokens) {
          if (pNorm.includes(token)) score++;
        }
        if (score > maxScore && score >= 2) {
          maxScore = score;
          bestMohasagor = p;
        }
      }
      if (bestMohasagor?.image) return bestMohasagor.image;
    }
  } catch {}

  // 3. Query Supabase products table
  if (prodId) {
    try {
      const { data: prodData } = await supabase
        .from("products")
        .select("image_url, images")
        .or(`id.eq.${prodId},slug.eq.${prodId}`)
        .maybeSingle();

      if (prodData) {
        if (prodData.image_url) return prodData.image_url;
        if (Array.isArray(prodData.images) && prodData.images.length > 0) return prodData.images[0];
      }
    } catch {}

    try {
      const { data: prodImgs } = await supabase
        .from("product_images")
        .select("image_url, is_primary")
        .eq("product_id", prodId);

      if (prodImgs && prodImgs.length > 0) {
        const primary = prodImgs.find((p: any) => p.is_primary) || prodImgs[0];
        if (primary?.image_url) return primary.image_url;
      }
    } catch {}
  }

  // 4. Query Supabase by product title/name keyword
  if (prodName) {
    try {
      const cleanTitle = prodName.replace(/\[CJ\]/gi, "").trim();
      const firstWord = cleanTitle.split(" ")[0];
      if (firstWord && firstWord.length > 2) {
        const { data: nameMatch } = await supabase
          .from("products")
          .select("image_url, images")
          .ilike("title", `%${firstWord}%`)
          .limit(1)
          .maybeSingle();

        if (nameMatch) {
          if (nameMatch.image_url) return nameMatch.image_url;
          if (Array.isArray(nameMatch.images) && nameMatch.images.length > 0) return nameMatch.images[0];
        }
      }
    } catch {}
  }

  // 5. Query Firestore products collection
  try {
    const snap = await getDocs(collection(db, "products"));
    if (!snap.empty) {
      let bestFirestore: any = null;
      let maxScore = 0;

      for (const d of snap.docs) {
        const dData = d.data();
        if (prodId && (d.id === prodId || String(dData.id) === prodId || dData.slug === prodId)) {
          const imgUrl = dData.image_url || dData.image || (Array.isArray(dData.images) && dData.images[0]);
          if (imgUrl) return imgUrl;
        }

        const dNorm = normalizeString(dData.name || dData.title || "");
        if (normTarget && dNorm === normTarget) {
          const imgUrl = dData.image_url || dData.image || (Array.isArray(dData.images) && dData.images[0]);
          if (imgUrl) return imgUrl;
        }

        let score = 0;
        for (const token of targetTokens) {
          if (dNorm.includes(token)) score++;
        }
        if (score > maxScore && score >= 2) {
          maxScore = score;
          bestFirestore = dData;
        }
      }

      if (bestFirestore) {
        const imgUrl = bestFirestore.image_url || bestFirestore.image || (Array.isArray(bestFirestore.images) && bestFirestore.images[0]);
        if (imgUrl) return imgUrl;
      }
    }
  } catch {}

  // 6. Query LocalStorage / Cache
  try {
    const localProdsRaw = localStorage.getItem("enterprise_admin_products") || localStorage.getItem("local_products");
    if (localProdsRaw) {
      const prods = JSON.parse(localProdsRaw);
      if (Array.isArray(prods)) {
        const matched = prods.find((p: any) => 
          (prodId && (String(p.id) === prodId || p.slug === prodId)) ||
          (normTarget && normalizeString(p.name || p.title) === normTarget)
        );
        if (matched) {
          const imgUrl = matched.image_url || matched.image || (Array.isArray(matched.images) && matched.images[0]);
          if (imgUrl) return imgUrl;
        }
      }
    }
  } catch {}

  return null;
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Return Request Modal State
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnPhone, setReturnPhone] = useState("");
  const [returnNote, setReturnNote] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState(false);

  // Review Modal State (for multiple items)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

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
            const product_image = await resolveOrderItemImage(it);

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

          let latestStatus = (orderData.status || "pending").toLowerCase();
          let latestPaymentStatus = (orderData.payment_status || "pending").toLowerCase();

          try {
            const docRef = doc(db, "orders", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const raw = docSnap.data();
              if (raw.status) latestStatus = raw.status.toLowerCase();
              if (raw.payment_status) latestPaymentStatus = raw.payment_status.toLowerCase();
            }
          } catch {}

          try {
            const adminOrdersRaw = localStorage.getItem("enterprise_admin_orders") || localStorage.getItem("local_orders");
            if (adminOrdersRaw) {
              const adminOrders = JSON.parse(adminOrdersRaw);
              const found = adminOrders.find((o: any) => o.id === id || o.order_number === id);
              if (found) {
                if (found.status) latestStatus = found.status.toLowerCase();
                if (found.payment_status) latestPaymentStatus = found.payment_status.toLowerCase();
              }
            }
          } catch {}

          setOrder({
            ...orderData,
            status: latestStatus,
            payment_status: latestPaymentStatus,
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
          let latestStatus = (raw.status || "pending").toLowerCase();
          let latestPaymentStatus = (raw.payment_status || raw.paymentStatus || "pending").toLowerCase();

          try {
            const adminOrdersRaw = localStorage.getItem("enterprise_admin_orders") || localStorage.getItem("local_orders");
            if (adminOrdersRaw) {
              const adminOrders = JSON.parse(adminOrdersRaw);
              const found = adminOrders.find((o: any) => o.id === id || o.order_number === id);
              if (found) {
                if (found.status) latestStatus = found.status.toLowerCase();
                if (found.payment_status) latestPaymentStatus = found.payment_status.toLowerCase();
              }
            }
          } catch {}

          const rawItemList = Array.isArray(raw.items) ? raw.items : [];
          const formattedItems = await Promise.all(rawItemList.map(async (it: any, idx: number) => {
            const product_image = await resolveOrderItemImage(it);
            return {
              id: it.id || `item-${idx}`,
              product_name: it.product?.name || it.name || "Product",
              variant_name: it.variant_name || null,
              quantity: Number(it.quantity || 1),
              unit_price: Number(it.price || it.unit_price || 0),
              total_price: Number((it.price || it.unit_price || 0) * (it.quantity || 1)),
              product_image: product_image,
              product_id: it.product_id || it.product?.id || null
            };
          }));

          const formatted: Order = {
            id: docSnap.id,
            order_number: raw.order_number || raw.orderNumber || docSnap.id.slice(0, 10),
            status: latestStatus,
            payment_status: latestPaymentStatus,
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
            order_items: formattedItems
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

    // Realtime Firestore updates
    const unsub = onSnapshot(doc(db, "orders", id), (docSnap) => {
      if (docSnap.exists()) {
        const raw = docSnap.data();
        setOrder((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: (raw.status || prev.status).toLowerCase(),
            payment_status: (raw.payment_status || prev.payment_status).toLowerCase()
          };
        });
      }
    }, () => {});

    return () => unsub();
  }, [id, user]);

  const handleCopyTracking = () => {
    if (order?.tracking_number) {
      navigator.clipboard.writeText(order.tracking_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenReturnModal = () => {
    setReturnSuccess(false);
    setReturnReason("");
    setReturnNote("");
    setReturnPhone(order?.shipping_address?.phone || "");
    setReturnModalOpen(true);
  };

  const handleReturnSubmit = async () => {
    if (!order) return;
    if (!returnReason) {
      toast({ variant: "destructive", title: "কারণ নির্বাচন করুন", description: "দয়া করে রিটার্নের কারণ নির্বাচন করুন।" });
      return;
    }
    setReturnSubmitting(true);
    const nowIso = new Date().toISOString();
    const returnId = `RET-${order.id || Date.now()}`;
    const customerName = `${order.shipping_address?.firstName || order.shipping_address?.name || "Customer"} ${order.shipping_address?.lastName || ""}`.trim();
    const customerEmail = user?.email || order.shipping_address?.email || "";
    
    const returnPayload = {
      id: returnId,
      order_id: order.id,
      order_number: order.order_number || order.id.slice(0, 10),
      user_id: user?.id || `user-${Date.now()}`,
      customer_name: customerName,
      customer_email: customerEmail,
      phone: returnPhone || (order.shipping_address?.phone || ""),
      seller_id: null,
      reason: returnReason,
      details: returnNote || returnReason,
      status: "pending",
      refund_amount: Number(order.total || 0),
      images: [],
      created_at: nowIso,
      items: order.order_items || []
    };

    try {
      // 1. Save to Firestore
      try {
        await setDoc(doc(db, "return_requests", returnId), returnPayload, { merge: true });
        await setDoc(doc(db, "returns", returnId), returnPayload, { merge: true });
        await setDoc(doc(db, "orders", order.id), {
          return_requested: true,
          return_reason: returnReason,
          return_note: returnNote,
          return_status: "pending",
          updated_at: nowIso
        }, { merge: true });
      } catch (fsErr) {
        console.warn("Firestore return save error:", fsErr);
      }

      // 2. Save to Supabase
      try {
        await supabase.from("return_requests" as any).insert(returnPayload);
        await supabase.from("returns" as any).insert(returnPayload);
        await supabase.from("orders").update({
          return_requested: true,
          updated_at: nowIso
        } as any).eq("id", order.id);
      } catch {}

      // 3. Save to localStorage
      try {
        const existing = JSON.parse(localStorage.getItem("durtup_return_requests") || "[]");
        const filtered = existing.filter((r: any) => r.id !== returnId && r.order_id !== order.id);
        const updated = [returnPayload, ...filtered];
        localStorage.setItem("durtup_return_requests", JSON.stringify(updated));
        localStorage.setItem("enterprise_admin_returns", JSON.stringify(updated));
      } catch {}

      setReturnSuccess(true);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to submit return request" });
    } finally {
      setReturnSubmitting(false);
    }
  };

  const handleReviewClick = () => {
    if (!order || !order.order_items || order.order_items.length === 0) {
      navigate("/products");
      return;
    }
    if (order.order_items.length === 1) {
      const it = order.order_items[0];
      const targetId = it.product_id || it.id;
      navigate(`/product/${targetId}?review=true#reviews`);
    } else {
      setReviewModalOpen(true);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p>Please log in to view order details.</p>
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
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
            <p className="text-muted-foreground mb-4">The order you're looking for doesn't exist.</p>
            <Button asChild>
              <Link to="/orders">Back to Orders</Link>
            </Button>
          </div>
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
        <div className="container max-w-4xl py-4 px-3 sm:px-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/orders")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold">Order Details</h1>
              <p className="text-sm text-muted-foreground">#{order.order_number}</p>
            </div>
            <Badge className={getStatusColor(order.status)}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>

          {/* Order Timeline */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
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
                <Package className="h-5 w-5 text-primary" />
                Items ({order.order_items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex gap-3 p-3 bg-muted/50 rounded-xl items-center border">
                  <div className="w-16 h-16 bg-muted/60 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center border relative shadow-sm">
                    {item.product_image ? (
                      <img 
                        src={item.product_image} 
                        alt={item.product_name}
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full bg-primary/10 text-primary">
                        <Package className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm line-clamp-2 text-foreground">{item.product_name}</p>
                    {item.variant_name && (
                      <p className="text-xs text-muted-foreground">{item.variant_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">Qty: {item.quantity}</p>
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
                <MapPin className="h-5 w-5 text-primary" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <p className="font-bold text-foreground">
                  {shippingAddress.firstName || shippingAddress.name} {shippingAddress.lastName || ""}
                </p>
                <p className="text-muted-foreground">{shippingAddress.address || shippingAddress.street}</p>
                <p className="text-muted-foreground">
                  {shippingAddress.city}
                  {shippingAddress.state && `, ${shippingAddress.state}`}
                  {shippingAddress.zipCode && ` - ${shippingAddress.zipCode}`}
                </p>
                <p className="text-muted-foreground">{shippingAddress.country || "Bangladesh"}</p>
                <div className="flex items-center gap-2 pt-2 text-muted-foreground">
                  <Phone className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">{shippingAddress.phone || "No phone provided"}</span>
                </div>
                {shippingAddress.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 text-primary" />
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
                <CreditCard className="h-5 w-5 text-primary" />
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
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Discount</span>
                    <span>-৳{order.discount_amount.toLocaleString()}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-primary text-lg">৳{order.total.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant="outline" className="text-xs uppercase font-bold">
                    {order.payment_method === "cod" ? "Cash on Delivery" : order.payment_method}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={order.payment_status === "paid" ? "text-green-600 bg-green-500/10 border-green-500/30" : "text-yellow-600 bg-yellow-500/10 border-yellow-500/30"}
                  >
                    {order.payment_status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions: Clean Return & Review Buttons (Invoice Removed) */}
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={handleOpenReturnModal}
              className="flex-1 gap-2 font-semibold h-11 border-border hover:border-primary/50 hover:bg-primary/5"
            >
              <RotateCcw className="h-4 w-4 text-primary" />
              Return
            </Button>
            <Button 
              variant="outline" 
              onClick={handleReviewClick}
              className="flex-1 gap-2 font-semibold h-11 border-border hover:border-primary/50 hover:bg-primary/5"
            >
              <MessageSquare className="h-4 w-4 text-primary" />
              Review
            </Button>
          </div>
        </div>
      </main>

      {/* Return Request Application Modal */}
      <Dialog open={returnModalOpen} onOpenChange={setReturnModalOpen}>
        <DialogContent className="max-w-lg">
          {!returnSuccess ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <RotateCcw className="h-4 w-4" />
                  </div>
                  রিটার্ন বা এক্সচেঞ্জ আবেদন
                </DialogTitle>
                <DialogDescription>
                  অর্ডার #{order.order_number} এর জন্য আপনার রিটার্ন কারণ ও বিবরণ দিন।
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="return-reason" className="text-sm font-semibold">রিটার্নের কারণ নির্বাচন করুন *</Label>
                  <Select value={returnReason} onValueChange={setReturnReason}>
                    <SelectTrigger id="return-reason">
                      <SelectValue placeholder="কারণ সিলেক্ট করুন..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="নষ্ট বা ক্ষতিগ্রস্ত পণ্য পেয়েছি">নষ্ট বা ক্ষতিগ্রস্ত পণ্য পেয়েছি (Damaged/Defective)</SelectItem>
                      <SelectItem value="ভুল পণ্য ডেলিভারি হয়েছে">ভুল পণ্য ডেলিভারি হয়েছে (Wrong Item)</SelectItem>
                      <SelectItem value="ছবির সাথে পণ্যের মিল নেই">ছবির সাথে পণ্যের মিল নেই (Not As Described)</SelectItem>
                      <SelectItem value="সাইজ বা ফিটিং সমস্যা">সাইজ বা ফিটিং সমস্যা (Size/Fitting Issue)</SelectItem>
                      <SelectItem value="অন্যান্য কারণ">অন্যান্য কারণ (Other)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="return-phone" className="text-sm font-semibold">যোগাযোগের মোবাইল নাম্বার *</Label>
                  <Input 
                    id="return-phone"
                    placeholder="e.g. 01885985097" 
                    value={returnPhone}
                    onChange={(e) => setReturnPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="return-note" className="text-sm font-semibold">বিস্তারিত বিবরণ (ঐচ্ছিক)</Label>
                  <Textarea
                    id="return-note"
                    placeholder="পণ্যটির কি সমস্যা বিস্তারিত এখানে লিখুন..."
                    value={returnNote}
                    onChange={(e) => setReturnNote(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setReturnModalOpen(false)}>
                  বাতিল করুন
                </Button>
                <Button 
                  onClick={handleReturnSubmit} 
                  disabled={returnSubmitting || !returnReason}
                  className="bg-primary text-primary-foreground font-bold"
                >
                  {returnSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  আবেদন জমা দিন
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="py-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 border-2 border-emerald-500/20 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-foreground">🎉 আপনার রিটার্ন আবেদনটি সফলভাবে গৃহীত হয়েছে!</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  শীঘ্রই আপনার রিটার্ন প্রসেস সম্পন্ন করার জন্য আমাদের একজন প্রতিনিধি আপনার সাথে সরাসরি যোগাযোগ করবেন।
                </p>
              </div>

              <div className="p-3.5 bg-muted/50 rounded-xl border text-xs text-left space-y-1 text-muted-foreground">
                <p><strong className="text-foreground">অর্ডার নাম্বার:</strong> #{order.order_number}</p>
                <p><strong className="text-foreground">কারণ:</strong> {returnReason}</p>
                {returnPhone && <p><strong className="text-foreground">মোবাইল:</strong> {returnPhone}</p>}
              </div>

              <div className="pt-2">
                <Button 
                  onClick={() => setReturnModalOpen(false)}
                  className="w-full bg-primary text-primary-foreground font-bold"
                >
                  ঠিক আছে (Close)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Product Selector Modal (for multiple items) */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Star className="h-5 w-5 text-warning fill-warning" />
              যে পণ্যটির রিভিউ দিতে চান সিলেক্ট করুন
            </DialogTitle>
            <DialogDescription>
              নিচের তালিকা থেকে প্রোডাক্ট সিলেক্ট করে আপনার মূল্যবান রিভিউ দিন।
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {order.order_items.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/40 transition-colors gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-muted flex-shrink-0 overflow-hidden border flex items-center justify-center">
                    {item.product_image ? (
                      <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{item.product_name}</p>
                    <p className="text-[11px] text-muted-foreground">৳{(item.price || item.unit_price || 0).toLocaleString()}</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => {
                    setReviewModalOpen(false);
                    const targetId = item.product_id || item.id;
                    navigate(`/product/${targetId}?review=true#reviews`);
                  }}
                  className="shrink-0 text-xs font-semibold gap-1"
                >
                  রিভিউ দিন <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <MobileBottomNav />
    </div>
  );
}
