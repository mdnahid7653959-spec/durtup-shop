import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getCachedMohasagorProducts } from "@/utils/mohasagorCache";

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  variant_id?: string | null;
  selected_variants?: Record<string, string>;
  color?: string | null;
  size?: string | null;
  variant_name?: string | null;
  product: {
    id: string;
    name: string;
    slug: string;
    regular_price: number;
    discount_price: number | null;
    stock_quantity: number;
  };
  image?: string;
}

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  itemCount: number;
  subtotal: number;
  addToCart: (productId: string, quantity?: number, variants?: Record<string, string>) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "megamart_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const getLocalCart = useCallback(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const setLocalCart = useCallback((cart: any[]) => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, []);

  const fetchCart = useCallback(async () => {
    setLoading(true);
    try {
      const catalog = await getCachedMohasagorProducts();
      let rawItems: any[] = [];

      if (user) {
        const cartRef = doc(db, "carts", user.uid);
        const cartSnap = await getDoc(cartRef);
        if (cartSnap.exists()) {
          rawItems = cartSnap.data().items || [];
        } else {
          rawItems = getLocalCart();
        }
      } else {
        rawItems = getLocalCart();
      }

      const formatted: CartItem[] = rawItems.map((item: any) => {
        const matched = catalog.find(p => p.id === item.product_id || p.id === item.id);
        const prodData = item.product || (matched ? {
          id: matched.id,
          name: matched.name,
          slug: matched.slug,
          regular_price: matched.originalPrice || matched.price,
          discount_price: matched.price,
          stock_quantity: 50
        } : {
          id: item.product_id || "item",
          name: item.name || "Product",
          slug: `product-${item.product_id}`,
          regular_price: item.price || 100,
          discount_price: null,
          stock_quantity: 50
        });

        // Resolve variant text
        let variantName = item.variant_name || null;
        if (!variantName && item.selected_variants) {
          variantName = Object.entries(item.selected_variants).map(([k, v]) => `${k}: ${v}`).join(", ");
        } else if (!variantName && item.variant_id) {
          try {
            const parsed = JSON.parse(item.variant_id);
            if (typeof parsed === "object") {
              variantName = Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(", ");
            }
          } catch {}
        }

        return {
          id: item.id || `cart-${item.product_id}`,
          product_id: item.product_id || item.id,
          quantity: item.quantity || 1,
          variant_id: item.variant_id || null,
          selected_variants: item.selected_variants || null,
          color: item.color || item.selected_variants?.Color || item.selected_variants?.color || null,
          size: item.size || item.selected_variants?.Size || item.selected_variants?.size || null,
          variant_name: variantName,
          product: prodData,
          image: item.image || matched?.image || "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400"
        };
      });

      setItems(formatted);
    } catch (err) {
      console.error("Failed to load cart:", err);
    } finally {
      setLoading(false);
    }
  }, [user, getLocalCart]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const syncCartToFirebase = async (newItems: CartItem[]) => {
    setLocalCart(newItems);
    if (user) {
      try {
        await setDoc(doc(db, "carts", user.uid), {
          items: newItems,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.error("Firestore cart sync error:", e);
      }
    }
  };

  const addToCart = useCallback(async (productId: string, quantity: number = 1, variants?: Record<string, string>) => {
    const catalog = await getCachedMohasagorProducts();
    const targetProd = catalog.find(p => p.id === productId);

    const variantKey = variants && Object.keys(variants).length > 0 ? JSON.stringify(variants) : "";
    const variantName = variants && Object.keys(variants).length > 0 
      ? Object.entries(variants).map(([k, v]) => `${k}: ${v}`).join(", ")
      : null;
    const color = variants?.Color || variants?.color || null;
    const size = variants?.Size || variants?.size || null;

    setItems((prev) => {
      const existingIdx = prev.findIndex(item => 
        item.product_id === productId && 
        (JSON.stringify(item.selected_variants || {}) === JSON.stringify(variants || {}) || item.variant_name === variantName)
      );
      let updated: CartItem[];

      if (existingIdx > -1) {
        updated = prev.map((item, idx) => 
          idx === existingIdx ? { ...item, quantity: item.quantity + quantity } : item
        );
      } else {
        const newItem: CartItem = {
          id: `cart-${productId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          product_id: productId,
          quantity,
          variant_id: variantKey || null,
          selected_variants: variants || undefined,
          color,
          size,
          variant_name: variantName,
          product: targetProd ? {
            id: targetProd.id,
            name: targetProd.name,
            slug: targetProd.slug,
            regular_price: targetProd.originalPrice || targetProd.price,
            discount_price: targetProd.price,
            stock_quantity: 50
          } : {
            id: productId,
            name: "Product",
            slug: `product-${productId}`,
            regular_price: 100,
            discount_price: null,
            stock_quantity: 50
          },
          image: targetProd?.image || "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400"
        };
        updated = [...prev, newItem];
      }

      syncCartToFirebase(updated);
      return updated;
    });

    toast({
      title: "Added to cart!",
      description: variantName ? `Selected: ${variantName}` : "Item has been added to your shopping cart."
    });
  }, [user, toast]);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(itemId);
      return;
    }

    setItems((prev) => {
      const updated = prev.map(item => item.id === itemId ? { ...item, quantity } : item);
      syncCartToFirebase(updated);
      return updated;
    });
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    setItems((prev) => {
      const updated = prev.filter(item => item.id !== itemId);
      syncCartToFirebase(updated);
      return updated;
    });

    toast({
      title: "Item removed",
      description: "Item removed from your cart."
    });
  }, [toast]);

  const clearCart = useCallback(async () => {
    setItems([]);
    syncCartToFirebase([]);
  }, []);

  const itemCount = useMemo(() => {
    return items.reduce((acc, item) => acc + item.quantity, 0);
  }, [items]);

  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => {
      const price = item.product.discount_price || item.product.regular_price;
      return acc + price * item.quantity;
    }, 0);
  }, [items]);

  const value = useMemo(() => ({
    items,
    loading,
    itemCount,
    subtotal,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    refreshCart: fetchCart,
  }), [items, loading, itemCount, subtotal, addToCart, updateQuantity, removeItem, clearCart, fetchCart]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
