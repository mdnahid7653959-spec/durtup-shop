import { useState, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CreditCard, Truck, Shield, ArrowLeft, Loader2, ChevronDown, ChevronUp, CheckCircle, Globe, Tag, X, MapPin, Phone, User as UserIcon, Plus, Edit3, CheckCircle2, Home, Banknote, Smartphone, ArrowRight, Copy } from "lucide-react";
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
import { doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { sendTelegramOrderNotification } from "@/utils/telegramNotifier";


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
  const [checkoutStep, setCheckoutStep] = useState<"shipping" | "payment">("shipping");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [showOrderSummary, setShowOrderSummary] = useState(false);

  // bKash payment inputs
  const [bkashNumber, setBkashNumber] = useState("");
  const [bkashTrxId, setBkashTrxId] = useState("");

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
    const rawCode = couponCode.trim().toUpperCase();
    if (!rawCode) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a coupon code" });
      return;
    }

    setApplyingCoupon(true);
    try {
      let coupon: any = null;

      // 1. Special Promo Code: DURTUP2026 gives 20% discount!
      if (rawCode === "DURTUP2026") {
        coupon = {
          code: "DURTUP2026",
          discount_type: "percentage",
          discount_value: 20,
          max_discount_amount: null,
          min_order_amount: 0,
          is_active: true,
        };
      } else {
        const { data, error } = await supabase
          .from("coupons")
          .select("*")
          .eq("code", rawCode)
          .eq("is_active", true)
          .maybeSingle();

        if (!error && data) {
          coupon = data;
        } else {
          // Check Firestore coupons collection
          try {
            const snap = await getDoc(doc(db, "coupons", rawCode));
            if (snap.exists()) {
              const fData = snap.data();
              if (fData.is_active !== false) coupon = fData;
            } else {
              const allSnap = await getDocs(collection(db, "coupons"));
              allSnap.forEach(d => {
                const cData = d.data();
                if ((cData.code === rawCode || d.id === rawCode) && cData.is_active !== false) {
                  coupon = cData;
                }
              });
            }
          } catch (e) {
            console.warn("Firestore coupon lookup error:", e);
          }
        }
      }

      if (!coupon) {
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

      const calculatedDiscount = coupon.discount_type === "percentage" 
        ? Math.min(Math.round(subtotal * (coupon.discount_value / 100)), coupon.max_discount_amount || Infinity)
        : coupon.discount_value;

      toast({ 
        title: "Coupon applied! 🎉", 
        description: `Coupon "${coupon.code}" applied! You got 20% discount (Saved ৳${calculatedDiscount.toLocaleString()})` 
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

    // Step 1: Validate Shipping Address & Transition to Payment Method
    if (checkoutStep === "shipping") {
      if (!shippingInfo.firstName.trim() || !shippingInfo.phone.trim() || !shippingInfo.address.trim() || !shippingInfo.city.trim()) {
        setIsEditingAddress(true);
        toast({
          variant: "destructive",
          title: "Shipping Address Required",
          description: "Please enter your name, phone number, and street address to proceed.",
        });
        return;
      }

      // Move to Payment Step
      setCheckoutStep("payment");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Step 2: Finalize Payment & Place Order
    if (paymentMethod === "bkash") {
      if (!bkashNumber.trim()) {
        toast({
          variant: "destructive",
          title: "bKash Number Required",
          description: "Please enter the bKash mobile number you sent the payment from.",
        });
        return;
      }
      if (!bkashTrxId.trim()) {
        toast({
          variant: "destructive",
          title: "Transaction ID Required",
          description: "Please enter your bKash Transaction ID (TrxID).",
        });
        return;
      }
    }

    setLoading(true);

    try {
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const notesCombined = [
        appliedCoupon ? `Coupon: ${appliedCoupon.code}` : null,
        paymentMethod === "bkash" ? `bKash Sender: ${bkashNumber} | TrxID: ${bkashTrxId}` : null
      ].filter(Boolean).join(" | ") || null;

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
          notes: notesCombined
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Sync order to Firestore and Local Storage so Admin Panel instantly sees the order
      try {
        const allCartItems = [...regularItems, ...cjItems];
        const firstCartItem = allCartItems[0];
        const primaryProductImage = (firstCartItem as any)?.image || (firstCartItem as any)?.product_image || (firstCartItem as any)?.productImage || (firstCartItem as any)?.product?.image_url || (firstCartItem as any)?.product?.images?.[0] || "/durtup-logo.png";
        const primaryProductName = (firstCartItem as any)?.product?.name || (firstCartItem as any)?.product_name || (firstCartItem as any)?.title || "Product";
        const totalItemsCount = allCartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

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
          product_image: primaryProductImage,
          product_name: primaryProductName,
          total_items: totalItemsCount,
          items: allCartItems.map(item => ({
            id: item.id,
            title: (item as any)?.product?.name || (item as any)?.product_name || (item as any)?.title || "Item",
            name: (item as any)?.product?.name || (item as any)?.product_name || (item as any)?.title || "Item",
            price: (item as any)?.product?.discount_price || (item as any)?.product?.regular_price || (item as any)?.price || 0,
            quantity: item.quantity || 1,
            image: (item as any)?.image || (item as any)?.product_image || (item as any)?.product?.image_url || "/durtup-logo.png",
          })),
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
          notes: notesCombined,
          bkash_details: paymentMethod === "bkash" ? { sender_number: bkashNumber, trx_id: bkashTrxId } : null,
          created_at: new Date().toISOString()
        };
        setDoc(doc(db, "orders", order.id), firestoreOrderDoc, { merge: true }).catch(() => {});

        // Emit real-time Admin Notification with Product Photo for instant push alerts & sound
        const adminNotificationDoc = {
          type: "new_order",
          title: `🛍️ New Order #${orderNumber}!`,
          message: `${shippingInfo.firstName} ordered "${primaryProductName}"${totalItemsCount > 1 ? ` (+${totalItemsCount - 1} more items)` : ""} (৳${total.toLocaleString()})`,
          product_name: primaryProductName,
          product_image: primaryProductImage,
          image_url: primaryProductImage,
          total_items: totalItemsCount,
          order_id: order.id,
          order_number: orderNumber,
          customer_name: `${shippingInfo.firstName} ${shippingInfo.lastName}`.trim(),
          customer_phone: shippingInfo.phone,
          customer_email: shippingInfo.email || "",
          total_amount: total,
          payment_method: paymentMethod,
          read: false,
          created_at: new Date().toISOString()
        };
        setDoc(doc(db, "admin_notifications", order.id), adminNotificationDoc, { merge: true }).catch((e) => {
          console.warn("admin_notification sync warning:", e);
        });

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

      // Send Instant Telegram Notification directly to Admin's phone
      try {
        const itemSummary = [
          ...regularItems.map(i => ({
            name: i.product.name,
            quantity: i.quantity,
            price: i.product.discount_price || i.product.regular_price
          })),
          ...cjItems.map(i => ({
            name: `[CJ] ${i.name}${i.variant ? ` (${i.variant})` : ''}`,
            quantity: i.quantity,
            price: i.price
          }))
        ];

        sendTelegramOrderNotification({
          orderNumber: orderNumber,
          customerName: `${shippingInfo.firstName} ${shippingInfo.lastName}`.trim(),
          phone: shippingInfo.phone,
          email: shippingInfo.email,
          address: shippingInfo.address,
          city: shippingInfo.city,
          paymentMethod: paymentMethod,
          total: total,
          items: itemSummary
        }).catch(err => {
          console.warn("Telegram order notification failed:", err);
        });
      } catch (tgErr) {
        console.warn("Telegram trigger error:", tgErr);
      }

      // Clear both carts
      await clearCart();
      clearCJCart();

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
      <main className="flex-1 pb-32 md:pb-8 w-full overflow-x-hidden">
        <div className="container px-3 sm:px-4 md:px-6 py-4 sm:py-8 max-w-6xl w-full min-w-0">
          <Link to="/cart" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-4 sm:mb-6 text-sm font-medium">
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
                      <span>Coupon Discount ({appliedCoupon?.code})</span>
                      <span>-৳{couponDiscount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
              {/* Main Column */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">

                {/* STEP 1: SHIPPING & COUPON (Initial View) */}
                {checkoutStep === "shipping" && (
                  <>
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
                    <Card className="border shadow-sm">
                      <CardHeader className="pb-3 sm:pb-4 border-b bg-muted/20">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Tag className="h-4 w-4" />
                          </div>
                          Coupon Code
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6">
                        {appliedCoupon ? (
                          <div className="flex items-center justify-between p-3 bg-success/10 border border-success/20 rounded-xl">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-success" />
                              <div>
                                <p className="font-bold text-success text-sm">{appliedCoupon.code}</p>
                                <p className="text-xs text-muted-foreground">
                                  {appliedCoupon.discount_type === "percentage" 
                                    ? `${appliedCoupon.discount_value}% Discount Applied` 
                                    : `৳${appliedCoupon.discount_value} Discount Applied`}
                                </p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={removeCoupon} className="h-8 w-8 p-0 rounded-full">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter coupon code (e.g. DURTUP2026)"
                              value={couponCode}
                              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                              className="h-11 flex-1 text-sm"
                            />
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={applyCoupon}
                              disabled={applyingCoupon}
                              className="h-11 px-6 font-semibold"
                            >
                              {applyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* STEP 2: PAYMENT METHOD (Shows after clicking Place Order) */}
                {checkoutStep === "payment" && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300 w-full min-w-0">
                    {/* Back Button & Address Preview */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-muted/40 border rounded-xl w-full min-w-0 overflow-hidden">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCheckoutStep("shipping")}
                        className="text-xs font-semibold text-primary hover:text-primary flex items-center gap-1.5 h-8 px-1 -ml-1 shrink-0"
                      >
                        <ArrowLeft className="h-4 w-4" /> Back to Delivery Details
                      </Button>
                      <div className="text-left sm:text-right text-xs text-muted-foreground truncate w-full sm:w-auto min-w-0">
                        Deliver to: <span className="font-semibold text-foreground">{shippingInfo.firstName} {shippingInfo.lastName}</span> ({shippingInfo.phone})
                      </div>
                    </div>

                    {/* Payment Method Selection Card */}
                    <Card className="border shadow-sm overflow-hidden w-full min-w-0">
                      <CardHeader className="pb-3 sm:pb-4 border-b bg-muted/20 p-3 sm:p-6">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <CreditCard className="h-4 w-4" />
                          </div>
                          Select Payment Method
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-6 space-y-3 w-full min-w-0">
                        <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3 w-full min-w-0">
                          {/* Cash on Delivery (COD) */}
                          <div 
                            onClick={() => setPaymentMethod("cod")}
                            className={`flex items-center gap-3 p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all w-full min-w-0 ${
                              paymentMethod === "cod" 
                                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20" 
                                : "border-border hover:border-primary/40 bg-card"
                            }`}
                          >
                            <RadioGroupItem value="cod" id="page-cod" className="shrink-0" />
                            <Label htmlFor="page-cod" className="flex-1 cursor-pointer min-w-0">
                              <span className="font-bold text-sm text-foreground block">Cash on Delivery (COD)</span>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">Pay in cash when product arrives at your doorstep</p>
                            </Label>
                            {paymentMethod === "cod" && <CheckCircle className="h-5 w-5 text-primary shrink-0 ml-auto" />}
                          </div>

                          {/* bKash */}
                          <div 
                            onClick={() => setPaymentMethod("bkash")}
                            className={`flex items-center gap-3 p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all w-full min-w-0 ${
                              paymentMethod === "bkash" 
                                ? "border-[#E2136E] bg-[#E2136E]/5 shadow-sm ring-1 ring-[#E2136E]/20" 
                                : "border-border hover:border-[#E2136E]/40 bg-card"
                            }`}
                          >
                            <RadioGroupItem value="bkash" id="page-bkash" className="shrink-0" />
                            <Label htmlFor="page-bkash" className="flex-1 cursor-pointer min-w-0">
                              <span className="font-bold text-sm text-foreground block">bKash (বিকাশ)</span>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">Send Money / Make payment via bKash</p>
                            </Label>
                            {paymentMethod === "bkash" && <CheckCircle className="h-5 w-5 text-[#E2136E] shrink-0 ml-auto" />}
                          </div>

                          {/* bKash Payment Details Box */}
                          {paymentMethod === "bkash" && (
                            <div className="p-3 sm:p-5 rounded-xl border-2 border-[#E2136E]/30 bg-gradient-to-br from-[#E2136E]/10 via-background to-muted/20 space-y-3.5 animate-in fade-in zoom-in-95 duration-200 w-full min-w-0 overflow-hidden">
                              {/* bKash Header */}
                              <div className="flex items-center justify-between pb-3 border-b border-[#E2136E]/20 flex-wrap gap-2 min-w-0 w-full">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-9 h-9 rounded-xl bg-[#E2136E] text-white flex items-center justify-center font-black text-xs shadow-sm shrink-0">
                                    bKash
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="font-bold text-sm text-foreground truncate">bKash Payment Details</h4>
                                    <p className="text-[11px] text-muted-foreground truncate">Personal / Merchant Account</p>
                                  </div>
                                </div>
                                <Badge className="bg-[#E2136E] hover:bg-[#E2136E] text-white text-[10px] font-bold px-2 py-0.5 shrink-0">
                                  Send Money
                                </Badge>
                              </div>

                              {/* Instructions & Number */}
                              <div className="p-3 rounded-xl bg-[#E2136E]/10 border border-[#E2136E]/20 space-y-2.5 overflow-hidden w-full min-w-0">
                                <div className="flex items-center justify-between flex-wrap gap-2 w-full">
                                  <div className="space-y-0.5 min-w-0">
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">bKash Number</span>
                                    <span className="text-lg sm:text-xl font-black text-[#E2136E] tracking-wider block select-all">01885985097</span>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      navigator.clipboard.writeText("01885985097");
                                    }}
                                    className="h-8 px-2.5 sm:px-3 text-xs font-semibold border-[#E2136E]/30 text-[#E2136E] hover:bg-[#E2136E]/10 flex items-center gap-1.5 shrink-0"
                                  >
                                    <Copy className="h-3.5 w-3.5" /> Copy Number
                                  </Button>
                                </div>

                                <div className="pt-1 text-xs text-foreground/80 space-y-1.5 break-words">
                                  <p className="flex items-start gap-1.5 font-medium">
                                    <span className="w-4 h-4 rounded-full bg-[#E2136E] text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                                    <span>বিকাশ অ্যাপে গিয়ে <strong>Send Money</strong> করুন।</span>
                                  </p>
                                  <p className="flex items-start gap-1.5 font-medium">
                                    <span className="w-4 h-4 rounded-full bg-[#E2136E] text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                                    <span>টাকার পরিমাণ: <strong className="text-[#E2136E]">৳{total.toLocaleString()}</strong></span>
                                  </p>
                                  <p className="flex items-start gap-1.5 font-medium">
                                    <span className="w-4 h-4 rounded-full bg-[#E2136E] text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                                    <span>পেমেন্ট সম্পন্ন করে নিচের ঘরে আপনার বিকাশ নাম্বার ও TrxID দিন।</span>
                                  </p>
                                </div>
                              </div>

                              {/* Inputs for verification */}
                              <div className="grid sm:grid-cols-2 gap-3 pt-1 w-full min-w-0">
                                <div className="space-y-1.5 min-w-0">
                                  <Label htmlFor="bkashNumber" className="text-xs font-bold text-foreground">
                                    Sender bKash Number (আপনার বিকাশ নাম্বার) *
                                  </Label>
                                  <Input
                                    id="bkashNumber"
                                    placeholder="e.g. 01XXXXXXXXX"
                                    value={bkashNumber}
                                    onChange={(e) => setBkashNumber(e.target.value)}
                                    className="h-10 text-xs border-[#E2136E]/30 focus-visible:ring-[#E2136E] w-full"
                                    required={paymentMethod === "bkash"}
                                  />
                                </div>

                                <div className="space-y-1.5 min-w-0">
                                  <Label htmlFor="bkashTrxId" className="text-xs font-bold text-foreground">
                                    Transaction ID (TrxID / ট্রানজেকশন আইডি) *
                                  </Label>
                                  <Input
                                    id="bkashTrxId"
                                    placeholder="e.g. 9M7A8X9K2"
                                    value={bkashTrxId}
                                    onChange={(e) => setBkashTrxId(e.target.value.toUpperCase())}
                                    className="h-10 text-xs border-[#E2136E]/30 focus-visible:ring-[#E2136E] uppercase font-mono w-full"
                                    required={paymentMethod === "bkash"}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </RadioGroup>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              {/* Order Summary - Desktop */}
              <div className="hidden lg:block lg:col-span-1">
                <Card className="sticky top-24 shadow-sm border">
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <CardTitle className="text-base font-bold">Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 sm:p-6">
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {/* Regular items */}
                      {regularItems.map(item => (
                        <div key={item.id} className="flex gap-3">
                          <img
                            src={item.image}
                            alt={item.product.name}
                            className="w-14 h-14 object-cover rounded-lg border"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.product.name}</p>
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                            <p className="text-sm font-bold text-primary">
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
                            className="w-14 h-14 object-cover rounded-lg border"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            {item.variant && <p className="text-[10px] text-muted-foreground">{item.variant}</p>}
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                            <p className="text-sm font-bold text-primary">
                              ৳{(item.price * item.quantity).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-semibold">৳{subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span className="font-semibold">{shipping === 0 ? <span className="text-success">FREE</span> : `৳${shipping}`}</span>
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
                      <span className="text-primary font-black text-xl">৳{total.toLocaleString()}</span>
                    </div>

                    <Button type="submit" className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Processing Order...
                        </>
                      ) : (
                        checkoutStep === "shipping" ? "Place Order" : `Confirm Order • ৳${total.toLocaleString()}`
                      )}
                    </Button>

                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
                      <Shield className="h-4 w-4 text-emerald-600" />
                      100% Safe & Secure Checkout
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Mobile Place Order Bar */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border p-3 sm:p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
              <div className="flex items-center justify-between gap-4 max-w-lg mx-auto w-full">
                <div>
                  <p className="text-xs text-muted-foreground">Total Payable</p>
                  <p className="text-xl font-black text-primary">৳{total.toLocaleString()}</p>
                  {couponDiscount > 0 && (
                    <p className="text-[11px] text-success font-semibold">Saved ৳{couponDiscount.toLocaleString()}</p>
                  )}
                </div>
                <Button type="submit" size="lg" className="h-12 px-6 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex-1 max-w-[200px] shadow-md shadow-primary/20" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    checkoutStep === "shipping" ? "Place Order" : "Confirm Order"
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
