import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getCachedMohasagorProducts } from "@/utils/mohasagorCache";

export interface WishlistItem {
  id: string;
  product_id: string;
  product: {
    id: string;
    name: string;
    slug: string;
    regular_price: number;
    discount_price: number | null;
  };
  image?: string;
}

interface WishlistContextType {
  items: WishlistItem[];
  loading: boolean;
  itemCount: number;
  isInWishlist: (productId: string) => boolean;
  addToWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const WISHLIST_STORAGE_KEY = "megamart_wishlist";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const getLocalWishlist = useCallback(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const setLocalWishlist = useCallback((wishlist: any[]) => {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
  }, []);

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    try {
      const catalog = await getCachedMohasagorProducts();
      let rawItems: any[] = [];

      if (user) {
        const ref = doc(db, "wishlists", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          rawItems = snap.data().items || [];
        } else {
          rawItems = getLocalWishlist();
        }
      } else {
        rawItems = getLocalWishlist();
      }

      const formatted: WishlistItem[] = rawItems.map((item: any) => {
        const pid = typeof item === 'string' ? item : (item.product_id || item.id);
        const matched = catalog.find(p => p.id === pid);
        return {
          id: `wish-${pid}`,
          product_id: pid,
          product: matched ? {
            id: matched.id,
            name: matched.name,
            slug: matched.slug,
            regular_price: matched.originalPrice || matched.price,
            discount_price: matched.price
          } : {
            id: pid,
            name: "Product",
            slug: `product-${pid}`,
            regular_price: 100,
            discount_price: null
          },
          image: matched?.image || "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400"
        };
      });

      setItems(formatted);
    } catch (err) {
      console.error("Failed to fetch wishlist:", err);
    } finally {
      setLoading(false);
    }
  }, [user, getLocalWishlist]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const syncWishlistToFirebase = async (newItems: WishlistItem[]) => {
    const rawIds = newItems.map(i => i.product_id);
    setLocalWishlist(rawIds);
    if (user) {
      try {
        await setDoc(doc(db, "wishlists", user.uid), {
          items: newItems,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.error("Wishlist Firestore sync error:", e);
      }
    }
  };

  const isInWishlist = useCallback((productId: string) => {
    return items.some(item => item.product_id === productId);
  }, [items]);

  const addToWishlist = useCallback(async (productId: string) => {
    if (isInWishlist(productId)) return;
    const catalog = await getCachedMohasagorProducts();
    const matched = catalog.find(p => p.id === productId);

    const newItem: WishlistItem = {
      id: `wish-${productId}`,
      product_id: productId,
      product: matched ? {
        id: matched.id,
        name: matched.name,
        slug: matched.slug,
        regular_price: matched.originalPrice || matched.price,
        discount_price: matched.price
      } : {
        id: productId,
        name: "Product",
        slug: `product-${productId}`,
        regular_price: 100,
        discount_price: null
      },
      image: matched?.image || "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400"
    };

    setItems(prev => {
      const updated = [...prev, newItem];
      syncWishlistToFirebase(updated);
      return updated;
    });

    toast({
      title: "Added to wishlist",
      description: "Item saved to your wishlist."
    });
  }, [isInWishlist, toast]);

  const removeFromWishlist = useCallback(async (productId: string) => {
    setItems(prev => {
      const updated = prev.filter(item => item.product_id !== productId);
      syncWishlistToFirebase(updated);
      return updated;
    });

    toast({
      title: "Removed from wishlist",
      description: "Item removed from your wishlist."
    });
  }, [toast]);

  const toggleWishlist = useCallback(async (productId: string) => {
    if (isInWishlist(productId)) {
      await removeFromWishlist(productId);
    } else {
      await addToWishlist(productId);
    }
  }, [isInWishlist, addToWishlist, removeFromWishlist]);

  const itemCount = useMemo(() => items.length, [items]);

  const value = useMemo(() => ({
    items,
    loading,
    itemCount,
    isInWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
  }), [items, loading, itemCount, isInWishlist, addToWishlist, removeFromWishlist, toggleWishlist]);

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
