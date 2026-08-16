import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/firebaseAdapter";

type TableName = "products" | "categories" | "brands" | "orders" | "profiles" | "reviews" | "coupons";

interface RealtimeSyncOptions {
  tables: TableName[];
  onUpdate?: (table: string, payload: any) => void;
}

/**
 * Hook to enable real-time synchronization between Admin Panel and User Pages
 * Automatically invalidates React Query cache when database changes occur
 */
export function useRealtimeSync(options: RealtimeSyncOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channels: ReturnType<typeof supabase.channel>[] = [];

    options.tables.forEach((table) => {
      const channel = supabase
        .channel(`realtime-${table}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: table,
          },
          (payload) => {
            console.log(`[Realtime] ${table} changed:`, payload.eventType);

            // Invalidate relevant queries based on table
            switch (table) {
              case "products":
                queryClient.invalidateQueries({ queryKey: ["home-products"] });
                queryClient.invalidateQueries({ queryKey: ["product-search"] });
                queryClient.invalidateQueries({ queryKey: ["product"] });
                break;
              case "categories":
                queryClient.invalidateQueries({ queryKey: ["categories"] });
                queryClient.invalidateQueries({ queryKey: ["home-products"] });
                break;
              case "brands":
                queryClient.invalidateQueries({ queryKey: ["brands"] });
                break;
              case "orders":
                queryClient.invalidateQueries({ queryKey: ["orders"] });
                queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
                break;
              case "profiles":
                queryClient.invalidateQueries({ queryKey: ["users"] });
                queryClient.invalidateQueries({ queryKey: ["profile"] });
                break;
              case "reviews":
                queryClient.invalidateQueries({ queryKey: ["reviews"] });
                queryClient.invalidateQueries({ queryKey: ["product"] });
                break;
              case "coupons":
                queryClient.invalidateQueries({ queryKey: ["coupons"] });
                break;
            }

            // Call custom onUpdate handler if provided
            options.onUpdate?.(table, payload);
          }
        )
        .subscribe();

      channels.push(channel);
    });

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [queryClient, options.tables.join(",")]);
}

/**
 * Hook specifically for home page real-time updates
 */
export function useHomeRealtimeSync() {
  useRealtimeSync({
    tables: ["products", "categories"],
    onUpdate: (table, payload) => {
      console.log(`[Home] ${table} updated - refreshing display`);
    },
  });
}

/**
 * Hook for product detail page real-time updates
 */
export function useProductRealtimeSync(productId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!productId) return;

    const channel = supabase
      .channel(`product-${productId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
          filter: `id=eq.${productId}`,
        },
        (payload) => {
          console.log("[Product Detail] Product updated:", payload.eventType);
          queryClient.invalidateQueries({ queryKey: ["product", productId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reviews",
          filter: `product_id=eq.${productId}`,
        },
        (payload) => {
          console.log("[Product Detail] Reviews updated:", payload.eventType);
          queryClient.invalidateQueries({ queryKey: ["product-reviews", productId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [productId, queryClient]);
}

/**
 * Utility to manually trigger cache refresh after admin actions
 */
export function useAdminCacheInvalidation() {
  const queryClient = useQueryClient();

  return {
    invalidateProducts: () => {
      queryClient.invalidateQueries({ queryKey: ["home-products"] });
      queryClient.invalidateQueries({ queryKey: ["product-search"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
    },
    invalidateCategories: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    invalidateBrands: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
    },
    invalidateOrders: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    invalidateUsers: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries();
    },
  };
}
