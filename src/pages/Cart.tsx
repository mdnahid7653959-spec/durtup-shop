import { Link } from "react-router-dom";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShoppingCart, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useCart } from "@/contexts/CartContext";
import { useCJCart } from "@/hooks/useCJCart";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Cart() {
  const { items: regularItems, loading: regularLoading, subtotal: regularSubtotal, updateQuantity, removeItem } = useCart();
  const { items: cjItems, loading: cjLoading, subtotal: cjSubtotal, updateQuantity: updateCJQuantity, removeItem: removeCJItem } = useCJCart();
  const { toast } = useToast();
  const [couponCode, setCouponCode] = useState("");

  const loading = regularLoading || cjLoading;
  const totalItems = regularItems.length + cjItems.length;
  const subtotal = regularSubtotal + cjSubtotal;
  const totalQuantity = regularItems.reduce((acc, item) => acc + item.quantity, 0) + 
                        cjItems.reduce((acc, item) => acc + item.quantity, 0);
  const shipping = totalItems > 0 ? 120 : 0;
  const total = subtotal + shipping;

  const handleApplyCoupon = () => {
    if (couponCode.trim()) {
      toast({
        title: "Coupon applied",
        description: `Coupon "${couponCode}" has been applied.`
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-6 sm:py-16 pb-24 md:pb-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48 mb-8" />
            <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
              <div className="lg:col-span-2 space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-xl border">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-muted rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-64 bg-muted rounded-xl" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (totalItems === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-12 sm:py-16 pb-24 md:pb-8">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Your cart is empty</h1>
            <p className="text-muted-foreground mb-6 text-sm sm:text-base">Looks like you haven't added anything yet.</p>
            <Link to="/products">
              <Button size="lg" className="h-12 px-8">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Start Shopping
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pb-44 md:pb-8">
        <div className="container py-4 sm:py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 sm:mb-8">
            Shopping Cart ({totalItems})
          </h1>

          <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              {/* Regular Cart Items */}
              {regularItems.map(item => {
                const price = item.product.discount_price || item.product.regular_price;
                return (
                  <div key={item.id} className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-xl border">
                    <img
                      src={item.image || "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200&h=200&fit=crop"}
                      alt={item.product.name}
                      className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <Link 
                        to={`/product/${item.product.slug}`}
                        className="font-medium text-sm sm:text-base text-foreground hover:text-primary line-clamp-2"
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-lg sm:text-xl font-bold text-primary mt-1">
                        ৳{price.toLocaleString()}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border rounded-lg overflow-hidden">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-2 sm:p-2.5 hover:bg-muted transition-colors touch-manipulation active:bg-muted/70"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="px-3 sm:px-4 font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-2 sm:p-2.5 hover:bg-muted transition-colors touch-manipulation active:bg-muted/70"
                            disabled={item.quantity >= item.product.stock_quantity}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-muted-foreground hover:text-destructive transition-colors touch-manipulation"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* CJ Cart Items */}
              {cjItems.map(item => (
                <div key={`${item.id}-${item.variantId}`} className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-xl border relative">
                  <Badge className="absolute top-2 right-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs">
                    <Globe className="h-3 w-3 mr-1" />
                    International
                  </Badge>
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200&h=200&fit=crop";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base text-foreground line-clamp-2 pr-20">
                      {item.name}
                    </p>
                    {item.variant && (
                      <p className="text-xs text-muted-foreground mt-0.5">Variant: {item.variant}</p>
                    )}
                    <p className="text-lg sm:text-xl font-bold text-primary mt-1">
                      ৳{item.price.toLocaleString()}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateCJQuantity(item.id, item.variantId, item.quantity - 1)}
                          className="p-2 sm:p-2.5 hover:bg-muted transition-colors touch-manipulation active:bg-muted/70"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="px-3 sm:px-4 font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateCJQuantity(item.id, item.variantId, item.quantity + 1)}
                          className="p-2 sm:p-2.5 hover:bg-muted transition-colors touch-manipulation active:bg-muted/70"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeCJItem(item.id, item.variantId)}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors touch-manipulation"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary - Desktop */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="bg-card rounded-xl border p-6 sticky top-24">
                <h2 className="text-lg font-bold text-foreground mb-4">Order Summary</h2>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal ({totalItems} items)</span>
                    <span className="font-medium">৳{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium">
                      {shipping === 0 ? (
                        <span className="text-success">FREE</span>
                      ) : (
                        `৳${shipping.toLocaleString()}`
                      )}
                    </span>
                  </div>
                </div>

                <div className="border-t my-4" />

                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="h-11"
                  />
                  <Button variant="outline" onClick={handleApplyCoupon} className="h-11 px-4">Apply</Button>
                </div>

                <div className="flex justify-between text-lg font-bold mb-4">
                  <span>Total</span>
                  <span className="text-primary">৳{total.toLocaleString()}</span>
                </div>

                <Link to="/checkout">
                  <Button className="w-full h-12 text-base font-semibold">
                    Proceed to Checkout
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>

                <Link to="/products" className="block text-center mt-4 text-sm text-primary hover:underline">
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile sticky checkout bar (Positioned directly above MobileBottomNav) */}
        <div className="lg:hidden fixed bottom-[60px] sm:bottom-16 left-0 right-0 z-30 bg-card/95 backdrop-blur-md border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)] p-3">
          <div className="flex items-center justify-between gap-4 max-w-lg mx-auto w-full">
            <div>
              <p className="text-xs text-muted-foreground">Total ({totalItems} items)</p>
              <p className="text-xl font-bold text-primary">৳{total.toLocaleString()}</p>
              {shipping > 0 && (
                <span className="text-[11px] text-muted-foreground">+ ৳{shipping.toLocaleString()} Delivery</span>
              )}
            </div>
            <Link to="/checkout" className="flex-1 max-w-[180px]">
              <Button size="lg" className="h-11 w-full px-4 text-sm sm:text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md shadow-primary/20">
                Checkout
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
