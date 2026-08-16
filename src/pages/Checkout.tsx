import { useState, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CreditCard, Truck, Shield, ArrowLeft, Loader2, ChevronDown, ChevronUp, CheckCircle, Globe, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useCart } from "@/contexts/CartContext";
import { useCJCart } from "@/hooks/useCJCart";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/firebaseAdapter";
import { db } from "@/integrations/firebase/client";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";


interface AppliedCoupon {
  code: string;
  discount_type: string;
  discount_value: number;
  max_discount_amount: number | null;
}

export default function Checkout() {
  const { items: regularItems, subtotal: regularSubtotal, clearCart } = useCart();
  const { items: cjItems, subtotal: cjSubtotal, clearCart: clearCJCart } = useCJCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [showOrderSummary, setShowOrderSummary] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const [shippingInfo, setShippingInfo] = useState({
    firstName: "",
    lastName: "",
    email: user?.email || "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "Bangladesh"
  });
  const [savedAddressId, setSavedAddressId] = useState<string | null>(null);

  // Prefill shipping info from profile + default address so user doesn't retype
  useEffect(() => {
    const loadSaved = async () => {
      if (!user) return;

      const [{ data: profile }, { data: addressesData }] = await Promise.all([
        supabase.from("profiles").select("full_name, phone, email").eq("user_id", user.id).maybeSingle(),
        supabase.from("addresses").select("*").eq("user_id", user.id),
      ]);

      const addresses = Array.isArray(addressesData) ? addressesData : [];
      const address = addresses.find((a: any) => a.is_default) || addresses[0] || null;

      setShippingInfo((prev) => {
        const [first = "", ...rest] = (profile?.full_name || address?.full_name || "").split(" ");
        return {
          firstName: prev.firstName || first,
          lastName: prev.lastName || rest.join(" "),
          email: prev.email || profile?.email || user.email || "",
          phone: prev.phone || profile?.phone || address?.phone || "",
          address: prev.address || address?.address_line1 || "",
          city: prev.city || address?.city || "",
          state: prev.state || address?.state || "",
          zipCode: prev.zipCode || address?.postal_code || "",
          country: prev.country || address?.country || "Bangladesh",
        };
      });

      if (address?.id) setSavedAddressId(address.id);
    };
    loadSaved();
  }, [user]);

  // Combined items and totals
  const totalItems = regularItems.length + cjItems.length;
  const subtotal = regularSubtotal + cjSubtotal;
  const totalQuantity = regularItems.reduce((acc, item) => acc + item.quantity, 0) + 
                        cjItems.reduce((acc, item) => acc + item.quantity, 0);
  const shipping = totalQuantity * 120;
  const tax = 0; // Tax is removed

  // Calculate coupon discount (handles both "percentage" and "flat" types)
  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0;
    
    let discount = 0;
    if (appliedCoupon.discount_type === "percentage") {
      discount = Math.round(subtotal * (appliedCoupon.discount_value / 100));
      if (appliedCoupon.max_discount_amount && discount > appliedCoupon.max_discount_amount) {
        discount = appliedCoupon.max_discount_amount;
      }
    } else {
      // "flat" or any other type = fixed amount discount
      discount = appliedCoupon.discount_value;
    }
    return Math.min(discount, subtotal); // Can't discount more than subtotal
  }, [appliedCoupon, subtotal]);

  const total = subtotal + shipping + tax - couponDiscount;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShippingInfo(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a coupon code" });
      return;
    }

    setApplyingCoupon(true);
    try {
      const { data: coupon, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase())
        .eq("is_active", true)
        .single();

      if (error || !coupon) {
        toast({ variant: "destructive", title: "Invalid coupon", description: "This coupon code is not valid" });
        return;
      }

      // Check if coupon is expired
      if (coupon.end_date && new Date(coupon.end_date) < new Date()) {
        toast({ variant: "destructive", title: "Expired", description: "This coupon has expired" });
        return;
      }

      // Check minimum order amount
      if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
        toast({ 
          variant: "destructive", 
          title: "Minimum not met", 
          description: `Minimum order amount is ৳${coupon.min_order_amount.toLocaleString()}` 
        });
        return;
      }

      // Check usage limit
      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
        toast({ variant: "destructive", title: "Limit reached", description: "This coupon has reached its usage limit" });
        return;
      }

      setAppliedCoupon({
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        max_discount_amount: coupon.max_discount_amount
      });

      toast({ 
        title: "Coupon applied!", 
        description: `You saved ৳${coupon.discount_type === "percentage" 
          ? Math.min(Math.round(subtotal * (coupon.discount_value / 100)), coupon.max_discount_amount || Infinity)
          : coupon.discount_value
        }` 
      });
      setCouponCode("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    toast({ title: "Coupon removed" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({ variant: "destructive", title: "Please login", description: "You need to login to place an order" });
      navigate("/login?redirect=/checkout");
      return;
    }

    if (totalItems === 0) {
      toast({ variant: "destructive", title: "Cart is empty", description: "Please add items to your cart" });
      return;
    }

    setLoading(true);

    try {
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          subtotal,
          shipping_cost: shipping,
          tax_amount: tax,
          discount_amount: couponDiscount,
          total,
          status: "pending",
          payment_status: paymentMethod === "cod" ? "pending" : "pending",
          payment_method: paymentMethod,
          shipping_address: {
            firstName: shippingInfo.firstName,
            lastName: shippingInfo.lastName,
            address: shippingInfo.address,
            city: shippingInfo.city,
            state: shippingInfo.state,
            zipCode: shippingInfo.zipCode,
            country: shippingInfo.country,
            phone: shippingInfo.phone
          },
          notes: appliedCoupon ? `Coupon: ${appliedCoupon.code}` : null
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Sync order to Firestore and Local Storage so Admin Panel instantly sees the order
      try {
        const firestoreOrderDoc = {
          id: order.id,
          order_number: orderNumber,
          orderNumber,
          user_id: user.id,
          subtotal,
          shipping_cost: shipping,
          tax_amount: tax,
          discount_amount: couponDiscount,
          total,
          status: "pending",
          payment_status: paymentMethod === "cod" ? "pending" : "pending",
          payment_method: paymentMethod,
          shipping_address: {
            firstName: shippingInfo.firstName,
            lastName: shippingInfo.lastName,
            address: shippingInfo.address,
            city: shippingInfo.city,
            state: shippingInfo.state,
            zipCode: shippingInfo.zipCode,
            country: shippingInfo.country,
            phone: shippingInfo.phone
          },
          notes: appliedCoupon ? `Coupon: ${appliedCoupon.code}` : null,
          created_at: new Date().toISOString()
        };
        setDoc(doc(db, "orders", order.id), firestoreOrderDoc, { merge: true }).catch(() => {});
        try {
          const rawLocal = localStorage.getItem("enterprise_admin_orders") || localStorage.getItem("local_orders") || "[]";
          const localList = JSON.parse(rawLocal);
          localList.unshift(firestoreOrderDoc);
          localStorage.setItem("enterprise_admin_orders", JSON.stringify(localList));
          localStorage.setItem("local_orders", JSON.stringify(localList));
        } catch {}
      } catch (fsErr) {
        console.warn("Firestore order sync warning:", fsErr);
      }


      // Persist phone + full name to profile so admin sees latest details
      const fullNameCombined = `${shippingInfo.firstName} ${shippingInfo.lastName}`.trim();
      try {
        await supabase.from("profiles").upsert({
          id: user.id,
          user_id: user.id,
          full_name: fullNameCombined || undefined,
          phone: shippingInfo.phone || undefined,
          updated_at: new Date().toISOString(),
        });
      } catch (e) { console.warn("profile update skipped", e); }

      // Save / update default address so it prefills next time
      try {
        const addressPayload = {
          id: user.id,
          user_id: user.id,
          full_name: fullNameCombined || "Customer",
          phone: shippingInfo.phone,
          address_line1: shippingInfo.address,
          city: shippingInfo.city,
          state: shippingInfo.state,
          postal_code: shippingInfo.zipCode,
          country: shippingInfo.country || "Bangladesh",
          is_default: true,
          updated_at: new Date().toISOString(),
        };
        await supabase.from("addresses").upsert(addressPayload);
      } catch (e) { console.warn("address save skipped", e); }


      // Update coupon usage count if a coupon was applied
      if (appliedCoupon) {
        const { data: currentCoupon } = await supabase
          .from("coupons")
          .select("used_count")
          .eq("code", appliedCoupon.code)
          .single();
        
        if (currentCoupon) {
          await supabase
            .from("coupons")
            .update({ used_count: (currentCoupon.used_count || 0) + 1 })
            .eq("code", appliedCoupon.code);
        }
      }

      // Add regular order items
      const regularOrderItems = regularItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product.name,
        quantity: item.quantity,
        price: item.product.discount_price || item.product.regular_price,
        total: (item.product.discount_price || item.product.regular_price) * item.quantity,
        variant_id: item.variant_id || null,
        product_image: item.image || null
      }));

      // Add CJ order items
      const cjOrderItems = cjItems.map(item => ({
        order_id: order.id,
        product_id: item.id || null, // Store CJ product ID from API
        product_name: `[CJ] ${item.name}${item.variant ? ` - ${item.variant}` : ''}`,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
        product_image: item.image || null
      }));

      const allOrderItems = [...regularOrderItems, ...cjOrderItems];

      if (allOrderItems.length > 0) {
        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(allOrderItems);

        if (itemsError) throw itemsError;
      }

      // Forward order to dropship suppliers automatically if any item is mapped
      try {
        const productIds = regularItems.map(i => i.product_id).filter(Boolean);
        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from("products")
            .select("id, seller_id, sku")
            .in("id", productIds);
          
          if (products && products.length > 0) {
            const hasMohasagorItems = products.some(p => 
              p.seller_id === "mohasagor.com.bd" || 
              p.seller_id === "Mohasagor" || 
              p.sku?.startsWith("MOH-")
            );
            if (hasMohasagorItems) {
              await supabase.functions.invoke("supplier-api", {
                body: {
                  action: "forward-order",
                  supplierId: "da929859-f7fa-4590-a3ad-f7012eac5b8c", // Use the valid UUID supplierId we seeded
                  payload: {
                    orderId: order.id,
                    shipping_address: {
                      name: `${shippingInfo.firstName} ${shippingInfo.lastName}`.trim(),
                      phone: shippingInfo.phone,
                      address: shippingInfo.address,
                      city: shippingInfo.city,
                      state: shippingInfo.state,
                      zip: shippingInfo.zipCode,
                      country: shippingInfo.country
                    }
                  }
                }
              }).catch(err => {
                console.error("Automatic order forwarding failed for Mohasagor:", err);
              });
            }
          }
        }
      } catch (forwardErr) {
        console.error("Failed to check or forward dropship orders:", forwardErr);
      }

      // Clear both carts
      await clearCart();
      clearCJCart();

      toast({ 
        title: "Order placed successfully!", 
        description: `Your order #${orderNumber} has been confirmed.`
      });

      navigate(`/orders?success=${orderNumber}`);
    } catch (error: any) {
      console.error("Order error:", error);
      toast({ 
        variant: "destructive", 
        title: "Failed to place order", 
        description: error.message 
      });
    } finally {
      setLoading(false);
    }
  };

  if (totalItems === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-12 sm:py-16 text-center pb-24 md:pb-8">
          <h1 className="text-xl sm:text-2xl font-bold mb-4">Your cart is empty</h1>
          <p className="text-muted-foreground mb-6 text-sm sm:text-base">Add some products before checking out.</p>
          <Link to="/products">
            <Button size="lg" className="h-12 px-8">Continue Shopping</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pb-32 md:pb-8">
        <div className="container py-4 sm:py-8">
          <Link to="/cart" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-4 sm:mb-6 text-sm">
            <ArrowLeft className="h-4 w-4" />
            Back to Cart
          </Link>

          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 sm:mb-8">Checkout</h1>

          {/* Mobile Order Summary Toggle */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setShowOrderSummary(!showOrderSummary)}
              className="w-full flex items-center justify-between p-4 bg-card border rounded-xl"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Order Summary ({totalItems} items)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary">৳{total.toLocaleString()}</span>
                {showOrderSummary ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </button>
            
            {showOrderSummary && (
              <div className="mt-2 p-4 bg-card border rounded-xl space-y-3">
                {/* Regular items */}
                {regularItems.map(item => (
                  <div key={item.id} className="flex gap-3">
                    <img
                      src={item.image}
                      alt={item.product.name}
                      className="w-14 h-14 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      <p className="text-sm font-medium text-primary">
                        ৳{((item.product.discount_price || item.product.regular_price) * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                {/* CJ items */}
                {cjItems.map(item => (
                  <div key={`${item.id}-${item.variantId}`} className="flex gap-3 relative">
                    <Badge className="absolute -top-1 -right-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] px-1.5 py-0.5">
                      <Globe className="h-2.5 w-2.5" />
                    </Badge>
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-14 h-14 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                      {item.variant && <p className="text-[10px] text-muted-foreground">{item.variant}</p>}
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      <p className="text-sm font-medium text-primary">
                        ৳{(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>৳{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>{shipping === 0 ? <span className="text-success">FREE</span> : `৳${shipping}`}</span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Coupon Discount</span>
                      <span>-৳{couponDiscount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
              {/* Shipping & Payment */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {/* Shipping Information */}
                <Card>
                  <CardHeader className="pb-3 sm:pb-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Truck className="h-4 w-4 text-primary" />
                      </div>
                      Shipping Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="firstName" className="text-sm">First Name *</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={shippingInfo.firstName}
                          onChange={handleInputChange}
                          required
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="lastName" className="text-sm">Last Name *</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={shippingInfo.lastName}
                          onChange={handleInputChange}
                          required
                          className="h-11"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-sm">Email *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={shippingInfo.email}
                          onChange={handleInputChange}
                          required
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-sm">Phone *</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={shippingInfo.phone}
                          onChange={handleInputChange}
                          required
                          className="h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="address" className="text-sm">Street Address *</Label>
                      <Input
                        id="address"
                        name="address"
                        value={shippingInfo.address}
                        onChange={handleInputChange}
                        required
                        className="h-11"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="city" className="text-sm">City *</Label>
                        <Input
                          id="city"
                          name="city"
                          value={shippingInfo.city}
                          onChange={handleInputChange}
                          required
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="state" className="text-sm">State</Label>
                        <Input
                          id="state"
                          name="state"
                          value={shippingInfo.state}
                          onChange={handleInputChange}
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-1.5 col-span-2 sm:col-span-1">
                        <Label htmlFor="zipCode" className="text-sm">Zip Code *</Label>
                        <Input
                          id="zipCode"
                          name="zipCode"
                          value={shippingInfo.zipCode}
                          onChange={handleInputChange}
                          required
                          className="h-11"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Coupon Code */}
                <Card>
                  <CardHeader className="pb-3 sm:pb-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Tag className="h-4 w-4 text-primary" />
                      </div>
                      Coupon Code
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between p-3 bg-success/10 border border-success/20 rounded-xl">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-success" />
                          <div>
                            <p className="font-medium text-success">{appliedCoupon.code}</p>
                            <p className="text-sm text-muted-foreground">
                              {appliedCoupon.discount_type === "percentage" 
                                ? `${appliedCoupon.discount_value}% off` 
                                : `৳${appliedCoupon.discount_value} off`}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={removeCoupon}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter coupon code"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="h-11 flex-1"
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={applyCoupon}
                          disabled={applyingCoupon}
                          className="h-11 px-6"
                        >
                          {applyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Payment Method */}
                <Card>
                  <CardHeader className="pb-3 sm:pb-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <CreditCard className="h-4 w-4 text-primary" />
                      </div>
                      Payment Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                      <div className={`flex items-center space-x-3 p-4 border-2 rounded-xl transition-all touch-manipulation ${paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                        <RadioGroupItem value="cod" id="cod" />
                        <Label htmlFor="cod" className="flex-1 cursor-pointer">
                          <div className="font-medium">Cash on Delivery (COD)</div>
                          <p className="text-sm text-muted-foreground">Pay when you receive</p>
                        </Label>
                        {paymentMethod === 'cod' && <CheckCircle className="h-5 w-5 text-primary" />}
                      </div>
                      <div className={`flex items-center space-x-3 p-4 border-2 rounded-xl transition-all touch-manipulation ${paymentMethod === 'bkash' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                        <RadioGroupItem value="bkash" id="bkash" />
                        <Label htmlFor="bkash" className="flex-1 cursor-pointer">
                          <div className="font-medium">bKash</div>
                          <p className="text-sm text-muted-foreground">Mobile banking</p>
                        </Label>
                        {paymentMethod === 'bkash' && <CheckCircle className="h-5 w-5 text-primary" />}
                      </div>
                      <div className={`flex items-center space-x-3 p-4 border-2 rounded-xl transition-all touch-manipulation ${paymentMethod === 'card' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                        <RadioGroupItem value="card" id="card" />
                        <Label htmlFor="card" className="flex-1 cursor-pointer">
                          <div className="font-medium">Credit/Debit Card</div>
                          <p className="text-sm text-muted-foreground">Visa, Mastercard, Amex</p>
                        </Label>
                        {paymentMethod === 'card' && <CheckCircle className="h-5 w-5 text-primary" />}
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>
              </div>

              {/* Order Summary - Desktop */}
              <div className="hidden lg:block lg:col-span-1">
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {/* Regular items */}
                      {regularItems.map(item => (
                        <div key={item.id} className="flex gap-3">
                          <img
                            src={item.image}
                            alt={item.product.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.product.name}</p>
                            <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                            <p className="text-sm font-medium text-primary">
                              ৳{((item.product.discount_price || item.product.regular_price) * item.quantity).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      {/* CJ items */}
                      {cjItems.map(item => (
                        <div key={`${item.id}-${item.variantId}`} className="flex gap-3 relative">
                          <Badge className="absolute -top-1 -right-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] px-1.5 py-0.5">
                            <Globe className="h-2.5 w-2.5" />
                          </Badge>
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            {item.variant && <p className="text-[10px] text-muted-foreground">{item.variant}</p>}
                            <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                            <p className="text-sm font-medium text-primary">
                              ৳{(item.price * item.quantity).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>৳{subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span>{shipping === 0 ? <span className="text-success">FREE</span> : `৳${shipping}`}</span>
                      </div>
                      {couponDiscount > 0 && (
                        <div className="flex justify-between text-success font-medium">
                          <span>Discount ({appliedCoupon?.code})</span>
                          <span>-৳{couponDiscount.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-4 flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">৳{total.toLocaleString()}</span>
                    </div>

                    <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Place Order"
                      )}
                    </Button>

                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Shield className="h-4 w-4" />
                      Secure checkout
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Mobile Place Order Bar */}
            <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40 bg-card border-t p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-xl font-bold text-primary">৳{total.toLocaleString()}</p>
                  {couponDiscount > 0 && (
                    <p className="text-xs text-success">Saved ৳{couponDiscount.toLocaleString()}</p>
                  )}
                </div>
                <Button type="submit" size="lg" className="h-12 px-8 text-base font-semibold" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Place Order"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
