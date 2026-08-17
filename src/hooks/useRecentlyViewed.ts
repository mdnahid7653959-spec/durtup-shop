import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/firebaseAdapter";
import { useAuth } from "@/contexts/AuthContext";

interface RecentlyViewedProduct {
  id: string;
  name: string;
  slug: string;
  regular_price: number;
  discount_price: number | null;
  rating_average: number | null;
  rating_count: number | null;
  image_url: string | null;
  viewed_at: string;
}

const LOCAL_STORAGE_KEY = "recently_viewed_products";
const MAX_ITEMS = 20;

export function useRecentlyViewed() {
  const { user } = useAuth();
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch recently viewed products
  const fetchRecentlyViewed = useCallback(async () => {
    setIsLoading(true);
    try {
      if (user) {
        // Fetch from database for logged-in users
        const { data, error } = await supabase
          .from("recently_viewed")
          .select(`
            product_id,
            viewed_at,
            products (
              id,
              name,
              slug,
              regular_price,
              discount_price,
              rating_average,
              rating_count,
              product_images (image_url, is_primary)
            )
          `)
          .eq("user_id", user.id)
          .order("viewed_at", { ascending: false })
          .limit(MAX_ITEMS);

        if (error) throw error;

        const products: RecentlyViewedProduct[] = (data || [])
          .filter((item: any) => item.products)
          .map((item: any) => ({
            id: item.products.id,
            name: item.products.name,
            slug: item.products.slug,
            regular_price: item.products.regular_price,
            discount_price: item.products.discount_price,
            rating_average: item.products.rating_average,
            rating_count: item.products.rating_count,
            image_url: item.products.product_images?.find((img: any) => img.is_primary)?.image_url 
              || item.products.product_images?.[0]?.image_url 
              || null,
            viewed_at: item.viewed_at,
          }));

        setRecentlyViewed(products);
      } else {
        // Fetch from localStorage for guests
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const productIds = JSON.parse(stored) as { id: string; viewed_at: string }[];
          
          if (productIds.length > 0) {
            const { data, error } = await supabase
              .from("products")
              .select(`
                id,
                name,
                slug,
                regular_price,
                discount_price,
                rating_average,
                rating_count,
                product_images (image_url, is_primary)
              `)
              .in("id", productIds.map(p => p.id))
              .eq("status", "active");

            if (error) throw error;

            const products: RecentlyViewedProduct[] = productIds
              .map(item => {
                const product = data?.find(p => p.id === item.id);
                if (!product) return null;
                return {
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  regular_price: product.regular_price,
                  discount_price: product.discount_price,
                  rating_average: product.rating_average,
                  rating_count: product.rating_count,
                  image_url: product.product_images?.find((img: any) => img.is_primary)?.image_url 
                    || product.product_images?.[0]?.image_url 
                    || null,
                  viewed_at: item.viewed_at,
                };
              })
              .filter(Boolean) as RecentlyViewedProduct[];

            setRecentlyViewed(products);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching recently viewed:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Track a product view
  const trackView = useCallback(async (productId: string) => {
    try {
      if (user) {
        // Upsert to database for logged-in users
        await supabase
          .from("recently_viewed")
          .upsert({
            user_id: user.id,
            product_id: productId,
            viewed_at: new Date().toISOString(),
            view_count: 1,
          }, {
            onConflict: "user_id,product_id",
          });
      } else {
        // Store in localStorage for guests
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        let items: { id: string; viewed_at: string }[] = stored ? JSON.parse(stored) : [];
        
        // Remove existing entry for this product
        items = items.filter(item => item.id !== productId);
        
        // Add to beginning
        items.unshift({ id: productId, viewed_at: new Date().toISOString() });
        
        // Keep only MAX_ITEMS
        items = items.slice(0, MAX_ITEMS);
        
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
      }
    } catch (error) {
      console.error("Error tracking product view:", error);
    }
  }, [user]);

  // Clear recently viewed
  const clearRecentlyViewed = useCallback(async () => {
    try {
      if (user) {
        await supabase
          .from("recently_viewed")
          .delete()
          .eq("user_id", user.id);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
      setRecentlyViewed([]);
    } catch (error) {
      console.error("Error clearing recently viewed:", error);
    }
  }, [user]);

  // Sync localStorage to database when user logs in
  const syncLocalToDatabase = useCallback(async () => {
    if (!user) return;
    
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) return;
    
    try {
      const items: { id: string; viewed_at: string }[] = JSON.parse(stored);
      
      if (items.length > 0) {
        const upsertData = items.map(item => ({
          user_id: user.id,
          product_id: item.id,
          viewed_at: item.viewed_at,
          view_count: 1,
        }));

        await supabase
          .from("recently_viewed")
          .upsert(upsertData, { onConflict: "user_id,product_id" });
        
        // Clear localStorage after sync
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    } catch (error) {
      console.error("Error syncing recently viewed:", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      syncLocalToDatabase().then(fetchRecentlyViewed);
    } else {
      fetchRecentlyViewed();
    }
  }, [user, fetchRecentlyViewed, syncLocalToDatabase]);

  return {
    recentlyViewed,
    isLoading,
    trackView,
    clearRecentlyViewed,
    refetch: fetchRecentlyViewed,
  };
}
