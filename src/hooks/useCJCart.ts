import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";

export interface CJCartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  variant: string | null;
  variantId: string | null;
  quantity: number;
  isCJProduct: true;
}

const CJ_CART_KEY = "cj_cart";

export function useCJCart() {
  const [items, setItems] = useState<CJCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load cart from localStorage
  const loadCart = useCallback(() => {
    try {
      const stored = localStorage.getItem(CJ_CART_KEY);
      const cart = stored ? JSON.parse(stored) : [];
      setItems(cart);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCart();
    
    // Listen for storage changes (cross-tab sync)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === CJ_CART_KEY) {
        loadCart();
      }
    };
    
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [loadCart]);

  const saveCart = useCallback((newItems: CJCartItem[]) => {
    localStorage.setItem(CJ_CART_KEY, JSON.stringify(newItems));
    setItems(newItems);
    // Dispatch custom event for same-tab sync
    window.dispatchEvent(new Event("cj-cart-update"));
  }, []);

  const addToCart = useCallback((product: Omit<CJCartItem, "quantity">, quantity: number = 1) => {
    const existingIndex = items.findIndex(
      item => item.id === product.id && item.variantId === product.variantId
    );

    let newItems: CJCartItem[];
    if (existingIndex >= 0) {
      newItems = [...items];
      newItems[existingIndex].quantity += quantity;
    } else {
      newItems = [...items, { ...product, quantity }];
    }

    saveCart(newItems);
    toast({
      title: "Added to Cart",
      description: `${product.name} added to your cart`,
    });
  }, [items, saveCart, toast]);

  const updateQuantity = useCallback((itemId: string, variantId: string | null, quantity: number) => {
    if (quantity < 1) return;
    
    const newItems = items.map(item => 
      item.id === itemId && item.variantId === variantId 
        ? { ...item, quantity } 
        : item
    );
    saveCart(newItems);
  }, [items, saveCart]);

  const removeItem = useCallback((itemId: string, variantId: string | null) => {
    const newItems = items.filter(
      item => !(item.id === itemId && item.variantId === variantId)
    );
    saveCart(newItems);
    toast({
      title: "Item removed",
      description: "Item has been removed from your cart",
    });
  }, [items, saveCart, toast]);

  const clearCart = useCallback(() => {
    localStorage.removeItem(CJ_CART_KEY);
    setItems([]);
  }, []);

  const itemCount = useMemo(() => 
    items.reduce((sum, item) => sum + item.quantity, 0), 
    [items]
  );

  const subtotal = useMemo(() => 
    items.reduce((sum, item) => sum + item.price * item.quantity, 0), 
    [items]
  );

  return {
    items,
    loading,
    itemCount,
    subtotal,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    refresh: loadCart,
  };
}
