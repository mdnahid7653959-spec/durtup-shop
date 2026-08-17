import { useState, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CreditCard, Truck, Shield, ArrowLeft, Loader2, ChevronDown, ChevronUp, CheckCircle, Globe, Tag, X, MapPin, Phone, User as UserIcon, Plus, Edit3, CheckCircle2, Home, Banknote, Smartphone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const [hasSavedAddress, setHasSavedAddress] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);

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
      // 1. Check local storage first for instant response
      let localAddr = null;
      try {
        const raw = localStorage.getItem("durtup_saved_address");
        if (raw) localAddr = JSON.parse(raw);
      } catch {}

      if (!user) {
        if (localAddr?.address && localAddr?.city && localAddr?.phone) {
          const [first = "", ...rest] = (localAddr.fullName || "").split(" ");
          setShippingInfo({
            firstName: first,
            lastName: rest.join(" "),
            email: localAddr.email || "",
            phone: localAddr.phone || "",
            address: localAddr.address || "",
            city: localAddr.city || "",
            state: localAddr.state || "",
            zipCode: localAddr.zipCode || "",
            country: localAddr.country || "Bangladesh"
          });
          setHasSavedAddress(true);
          setIsEditingAddress(false);
        } else {
          setHasSavedAddress(false);
          setIsEditingAddress(true);
        }
        return;
      }

      try {
        const [{ data: profile }, { data: addressesData }] = await Promise.all([
          supabase.from("profiles").select("full_name, phone, email").eq("user_id", user.id).maybeSingle(),
          supabase.from("addresses").select("*").eq("user_id", user.id),
        ]);

        const addresses = Array.isArray(addressesData) ? addressesData : [];
        const address = addresses.find((a: any) => a.is_default) || addresses[0] || null;

        const effectiveFullName = profile?.full_name || address?.full_name || localAddr?.fullName || "";
        const [first = "", ...rest] = effectiveFullName.split(" ");
        const effectivePhone = profile?.phone || address?.phone || localAddr?.phone || "";
        const effectiveStreet = address?.address_line1 || localAddr?.address || "";
        const effectiveCity = address?.city || localAddr?.city || "";
        const effectiveState = address?.state || localAddr?.state || "";
        const effectiveZip = address?.postal_code || localAddr?.zipCode || "";
        const effectiveCountry = address?.country || localAddr?.country || "Bangladesh";
        const effectiveEmail = profile?.email || user.email || localAddr?.email || "";

        setShippingInfo({
          firstName: first,
          lastName: rest.join(" "),
          email: effectiveEmail,
          phone: effectivePhone,
          address: effectiveStreet,
          city: effectiveCity,
          state: effectiveState,
          zipCode: effectiveZip,
          country: effectiveCountry,
        });

        if (address?.id) setSavedAddressId(address.id);

        if (effectiveStreet.trim() && effectiveCity.trim() && effectivePhone.trim()) {
          setHasSavedAddress(true);
          setIsEditingAddress(false);
        } else {
          setHasSavedAddress(false);
          setIsEditingAddress(true);
        }
      } catch (err) {
        console.warn("Failed loading saved checkout address:", err);
        setHasSavedAddress(false);
        setIsEditingAddress(true);
      }
    };

    loadSaved();
  }, [user]);

  // Combined items and totals
  const totalItems = regularItems.length + cjItems.length;
  const subtotal = regularSubtotal + cjSubtotal;
  const totalQuantity = regularItems.reduce((acc, item) => acc + item.quantity, 0) + 
                        cjItems.reduce((acc, item) => acc + item.quantity, 0);
  const shipping = totalItems > 0 ? 120 : 0;
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

  const handleInitiatePlaceOrder = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!user) {
      toast({ variant: "destructive", title: "Please login", description: "You need to login to place an order" });
      navigate("/login?redirect=/checkout");
      return;
    }

    if (totalItems === 0) {
      toast({ variant: "destructive", title: "Cart is empty", description: "Please add items to your cart" });
      return;
    }

    if (!shippingInfo.firstName.trim() || !shippingInfo.phone.trim() || !shippingInfo.address.trim() || !shippingInfo.city.trim()) {
      setIsEditingAddress(true);
      toast({
        variant: "destructive",
        title: "Shipping Address Required",
        description: "Please enter your name, phone number, and street address to proceed.",
      });
      return;
    }

    // Open Payment Method Modal
    setShowPaymentModal(true);
  };

  const executeOrderPlacement = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Please login", description: "You need to login to place an order" });
      navigate("/login?redirect=/checkout");
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
        localStorage.setItem("durtup_saved_address", JSON.stringify({
          fullName: fullNameCombined,
          phone: shippingInfo.phone,
          address: shippingInfo.address,
          city: shippingInfo.city,
          state: shippingInfo.state,
          zipCode: shippingInfo.zipCode,
          country: shippingInfo.country,
          email: shippingInfo.email
        }));
        setHasSavedAddress(true);
      } catch (e) { console.warn("address save skipped", e); }

      // Increment coupon used_count if a coupon was used
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
      setShowPaymentModal(false);

      toast({ 
        title: "Order placed successfully! 🎉", 
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

          <form onSubmit={handleInitiatePlaceOrder}>
            <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
              {/* Shipping & Coupon */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {/* Shipping Information */}
                <Card className="border shadow-sm overflow-hidden">
                  <CardHeader className="pb-3 sm:pb-4 border-b bg-muted/20">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <MapPin className="h-4 w-4" />
                        </div>
                        Delivery Address
                      </CardTitle>

                      {hasSavedAddress && !isEditingAddress && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingAddress(true)}
                          className="text-xs h-8 px-3 rounded-lg border-primary/30 text-primary hover:bg-primary/10 flex items-center gap-1.5"
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Change / Add New Address
                        </Button>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-6 space-y-4">
                    {hasSavedAddress && !isEditingAddress ? (
                      /* Saved Address Card View */
                      <div className="p-4 rounded-xl border-2 border-primary/40 bg-gradient-to-br from-primary/5 via-muted/20 to-background space-y-3 relative">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base text-foreground">
                              {shippingInfo.firstName} {shippingInfo.lastName}
                            </span>
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] px-2 py-0.5 font-semibold gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Default Address
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-sm text-foreground/90">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span className="leading-relaxed">
                              {shippingInfo.address}, {shippingInfo.city}{shippingInfo.state ? `, ${shippingInfo.state}` : ''} - {shippingInfo.zipCode}, {shippingInfo.country}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <Phone className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-semibold text-foreground">{shippingInfo.phone}</span>
                            {shippingInfo.email && (
                              <span className="text-muted-foreground text-xs ml-2">({shippingInfo.email})</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Address Input Form */
                      <div className="space-y-4">
                        {hasSavedAddress && (
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsEditingAddress(false)}
                              className="text-xs text-muted-foreground hover:text-foreground h-7"
                            >
                              Cancel & Use Saved Address
                            </Button>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="firstName" className="text-xs sm:text-sm font-semibold">First Name *</Label>
                            <Input
                              id="firstName"
                              name="firstName"
                              value={shippingInfo.firstName}
                              onChange={handleInputChange}
                              placeholder="e.g. Nahid"
                              required
                              className="h-11 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="lastName" className="text-xs sm:text-sm font-semibold">Last Name *</Label>
                            <Input
                              id="lastName"
                              name="lastName"
                              value={shippingInfo.lastName}
                              onChange={handleInputChange}
                              placeholder="e.g. Islam"
                              required
                              className="h-11 text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-xs sm:text-sm font-semibold">Email Address *</Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              value={shippingInfo.email}
                              onChange={handleInputChange}
                              placeholder="name@example.com"
                              required
                              className="h-11 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="phone" className="text-xs sm:text-sm font-semibold">Phone Number (Mobile) *</Label>
                            <Input
                              id="phone"
                              name="phone"
                              type="tel"
                              value={shippingInfo.phone}
                              onChange={handleInputChange}
                              placeholder="01XXXXXXXXX"
                              required
                              className="h-11 text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="address" className="text-xs sm:text-sm font-semibold">Street Address / House / Road *</Label>
                          <Input
                            id="address"
                            name="address"
                            value={shippingInfo.address}
                            onChange={handleInputChange}
                            placeholder="House #, Road #, Area / Landmark"
                            required
                            className="h-11 text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="city" className="text-xs sm:text-sm font-semibold">City / District *</Label>
                            <Input
                              id="city"
                              name="city"
                              value={shippingInfo.city}
                              onChange={handleInputChange}
                              placeholder="e.g. Dhaka"
                              required
                              className="h-11 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="state" className="text-xs sm:text-sm font-semibold">State / Division</Label>
                            <Input
                              id="state"
                              name="state"
                              value={shippingInfo.state}
                              onChange={handleInputChange}
                              placeholder="e.g. Dhaka"
                              className="h-11 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5 col-span-2 sm:col-span-1">
                            <Label htmlFor="zipCode" className="text-xs sm:text-sm font-semibold">Postal Code / Zip *</Label>
                            <Input
                              id="zipCode"
                              name="zipCode"
                              value={shippingInfo.zipCode}
                              onChange={handleInputChange}
                              placeholder="e.g. 1200"
                              required
                              className="h-11 text-sm"
                            />
                          </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1">
                          <CheckCircle className="h-3.5 w-3.5 text-primary" />
                          This address and phone number will be automatically saved to your Account Settings for future orders.
                        </p>
                      </div>
                    )}
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

          {/* Interactive Payment Method Modal */}
          <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border bg-card shadow-2xl">
              <DialogHeader className="p-5 pb-3 border-b bg-muted/20">
                <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-foreground">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  Select Payment Method
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Choose your preferred payment method to complete your order.
                </DialogDescription>
              </DialogHeader>

              <div className="p-5 space-y-4">
                {/* Total Payable Banner */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-muted border border-primary/20 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Payable Amount</p>
                    <p className="text-2xl font-black text-primary">৳{total.toLocaleString()}</p>
                  </div>
                  <div className="text-right text-xs">
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[11px]">
                      <CheckCircle2 className="h-3 w-3" /> Ready to Confirm
                    </span>
                    <p className="text-muted-foreground text-[11px] mt-0.5 truncate max-w-[150px]">
                      {shippingInfo.firstName} {shippingInfo.lastName}
                    </p>
                  </div>
                </div>

                {/* Payment Options Selection */}
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-2.5">
                  {/* Cash on Delivery (COD) */}
                  <div 
                    onClick={() => setPaymentMethod("cod")}
                    className={`flex items-center gap-3.5 p-3.5 border-2 rounded-xl cursor-pointer transition-all ${
                      paymentMethod === "cod" 
                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20" 
                        : "border-border hover:border-primary/40 bg-card"
                    }`}
                  >
                    <RadioGroupItem value="cod" id="modal-cod" />
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <Banknote className="h-5 w-5" />
                    </div>
                    <Label htmlFor="modal-cod" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">Cash on Delivery (COD)</span>
                        <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 text-[10px] px-1.5 py-0 font-medium">Recommended</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Pay in cash when product arrives at your doorstep</p>
                    </Label>
                    {paymentMethod === "cod" && <CheckCircle className="h-5 w-5 text-primary shrink-0" />}
                  </div>

                  {/* bKash */}
                  <div 
                    onClick={() => setPaymentMethod("bkash")}
                    className={`flex items-center gap-3.5 p-3.5 border-2 rounded-xl cursor-pointer transition-all ${
                      paymentMethod === "bkash" 
                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20" 
                        : "border-border hover:border-primary/40 bg-card"
                    }`}
                  >
                    <RadioGroupItem value="bkash" id="modal-bkash" />
                    <div className="w-9 h-9 rounded-lg bg-pink-500/10 text-pink-600 flex items-center justify-center shrink-0">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <Label htmlFor="modal-bkash" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">bKash</span>
                        <Badge variant="secondary" className="bg-pink-500/10 text-pink-700 text-[10px] px-1.5 py-0 font-medium">Mobile Banking</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Instant online payment via bKash Account</p>
                    </Label>
                    {paymentMethod === "bkash" && <CheckCircle className="h-5 w-5 text-primary shrink-0" />}
                  </div>

                  {/* Credit/Debit Card & Online Banking */}
                  <div 
                    onClick={() => setPaymentMethod("card")}
                    className={`flex items-center gap-3.5 p-3.5 border-2 rounded-xl cursor-pointer transition-all ${
                      paymentMethod === "card" 
                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20" 
                        : "border-border hover:border-primary/40 bg-card"
                    }`}
                  >
                    <RadioGroupItem value="card" id="modal-card" />
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <Label htmlFor="modal-card" className="flex-1 cursor-pointer">
                      <span className="font-bold text-sm text-foreground block">Credit / Debit Card</span>
                      <p className="text-xs text-muted-foreground mt-0.5">Visa, Mastercard, Nagad, Rocket, NexusPay</p>
                    </Label>
                    {paymentMethod === "card" && <CheckCircle className="h-5 w-5 text-primary shrink-0" />}
                  </div>
                </RadioGroup>

                {/* Confirm Action Button */}
                <div className="pt-2 space-y-2">
                  <Button
                    type="button"
                    onClick={executeOrderPlacement}
                    disabled={loading}
                    className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Confirming Order...
                      </>
                    ) : (
                      <>
                        Confirm Order • ৳{total.toLocaleString()}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPaymentModal(false)}
                    className="w-full text-xs text-muted-foreground hover:text-foreground h-8"
                  >
                    Back to Shipping Details
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
      <Footer />
    </div>
  );
}
