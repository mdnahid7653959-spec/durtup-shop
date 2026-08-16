import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Product } from "@/components/products/ProductCard";
import { useCJSettings, calculateCJPrice } from "./useCJSettings";
import { smartSearchService } from "@/services/search/SmartSearchService";

interface SearchParams {
  search?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  filter?: string;
  includeCJ?: boolean;
  page?: number;
}

interface CJProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category?: string;
}

// Combined product type with source indicator
export interface CombinedProduct extends Product {
  source: "local" | "cj";
  cjProductId?: string;
  matchType?: string;
}

async function searchLocalProducts(params: SearchParams): Promise<CombinedProduct[]> {
  try {
    const searchOptions = {
      category: params.category,
      brand: params.brand,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      sortBy: (params.sort === "price-low"
        ? "price_asc"
        : params.sort === "price-high"
        ? "price_desc"
        : params.sort === "rating"
        ? "rating"
        : params.sort === "newest"
        ? "newest"
        : "relevance") as any,
      page: params.page || 1,
      limit: 1000
    };

    const searchRes = await smartSearchService.search(params.search || "", searchOptions);

    let mapped: CombinedProduct[] = searchRes.products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      image: p.image,
      price: p.price,
      originalPrice: p.originalPrice,
      rating: p.rating,
      reviews: p.reviews,
      sold: p.sold,
      freeShipping: true,
      isNew: p.isNew || false,
      isBestSeller: p.isBestSeller || false,
      source: "local" as const,
      matchType: p.matchType
    }));

    if (params.filter) {
      if (params.filter === "flash-sale" || params.filter === "featured") {
        mapped = mapped.filter((p) => p.isBestSeller || p.originalPrice);
      } else if (params.filter === "new") {
        mapped = mapped.filter((p) => p.isNew);
      } else if (params.filter === "free-shipping") {
        mapped = mapped.filter((p) => p.freeShipping);
      }
    }

    return mapped;
  } catch (err) {
    console.error("[useCombinedSearch] Search execution error:", err);
    return [];
  }
}

async function searchCJProducts(
  params: SearchParams,
  cjSettings: any
): Promise<CombinedProduct[]> {
  if (!cjSettings?.is_enabled || !cjSettings?.show_in_search || !params.search) {
    return [];
  }

  try {
    const mockCjResponse = { products: [] };
    const products = mockCjResponse.products || [];

    return products.map((p: CJProduct): CombinedProduct => ({
      id: `cj-${p.id}`,
      name: p.name,
      slug: `cj/${p.id}`,
      image: p.image || "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop",
      price: calculateCJPrice(p.price, cjSettings),
      originalPrice: p.originalPrice ? calculateCJPrice(p.originalPrice, cjSettings) : undefined,
      rating: 4.5,
      reviews: 100,
      sold: 500,
      freeShipping: true,
      isNew: false,
      isBestSeller: false,
      source: "cj",
      cjProductId: p.id,
    }));
  } catch (error) {
    console.error("CJ search error:", error);
    return [];
  }
}

export function useCombinedSearch(params: SearchParams) {
  const { data: cjSettings } = useCJSettings();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["combined-search"] });
    };

    if (typeof window !== "undefined") {
      window.addEventListener("mohasagor_products_updated", handleUpdate);
      return () => window.removeEventListener("mohasagor_products_updated", handleUpdate);
    }
  }, [queryClient]);

  return useQuery({
    queryKey: ["combined-search", params, cjSettings?.is_enabled],
    queryFn: async () => {
      try {
        const includeCJ = params.includeCJ !== false && cjSettings?.is_enabled && cjSettings?.show_in_search;
        
        const [localProducts, cjProducts] = await Promise.all([
          searchLocalProducts(params),
          includeCJ && params.search ? searchCJProducts(params, cjSettings) : Promise.resolve([]),
        ]);

        return {
          local: localProducts || [],
          cj: cjProducts || [],
          combined: [...(localProducts || []), ...(cjProducts || [])],
        };
      } catch (err) {
        console.error("Error in useCombinedSearch queryFn:", err);
        return { local: [], cj: [], combined: [] };
      }
    },
    staleTime: 15 * 1000,
    enabled: true,
  });
}
