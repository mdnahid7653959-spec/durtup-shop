import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Product } from "@/components/products/ProductCard";
import { useCJSettings, calculateCJPrice } from "./useCJSettings";
import { smartSearchService } from "@/services/search/SmartSearchService";
import { getCachedMohasagorProducts, filterProductsByCategory } from "@/utils/mohasagorCache";

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
      sortBy: (params.sort === "price-low" || params.sort === "price_asc"
        ? "price_asc"
        : params.sort === "price-high" || params.sort === "price_desc"
        ? "price_desc"
        : params.sort === "rating"
        ? "rating"
        : params.sort === "newest"
        ? "newest"
        : params.sort === "trending" || params.sort === "popular" || params.sort === "popularity"
        ? "popularity"
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

    // Fallback: If search adapter returned empty, directly fetch and filter from master supplier catalog
    if (mapped.length === 0) {
      const allMohasagor = await getCachedMohasagorProducts();
      let fallbackList = allMohasagor;
      if (params.category && params.category !== "all") {
        fallbackList = filterProductsByCategory(allMohasagor, params.category);
      }
      if (fallbackList && fallbackList.length > 0) {
        mapped = fallbackList.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          image: p.image,
          price: p.price,
          originalPrice: p.originalPrice,
          rating: p.rating || 4.8,
          reviews: p.reviews || 15,
          sold: p.sold || 45,
          freeShipping: true,
          isNew: p.isNew || false,
          isBestSeller: p.isBestSeller || false,
          source: "local" as const,
          matchType: "fallback"
        }));
      }
    }

    // Post-filter by Special Filter Type
    if (params.filter && params.filter !== "all") {
      if (params.filter === "flash-sale" || params.filter === "featured" || params.filter === "on-sale") {
        mapped = mapped.filter((p) => (p.originalPrice && p.originalPrice > p.price) || p.isBestSeller);
      } else if (params.filter === "new") {
        mapped = mapped.filter((p) => p.isNew);
      } else if (params.filter === "free-shipping") {
        mapped = mapped.filter((p) => p.freeShipping);
      } else if (params.filter === "in-stock") {
        mapped = mapped.filter((p) => (p as any).stock !== 0);
      }
    }

    // Price Bounds
    if (params.minPrice !== undefined && !isNaN(params.minPrice)) {
      mapped = mapped.filter((p) => p.price >= params.minPrice!);
    }
    if (params.maxPrice !== undefined && !isNaN(params.maxPrice)) {
      mapped = mapped.filter((p) => p.price <= params.maxPrice!);
    }

    // Post-sort guarantee
    if (params.sort === "price-low" || params.sort === "price_asc") {
      mapped.sort((a, b) => a.price - b.price);
    } else if (params.sort === "price-high" || params.sort === "price_desc") {
      mapped.sort((a, b) => b.price - a.price);
    } else if (params.sort === "rating") {
      mapped.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (params.sort === "trending" || params.sort === "popular" || params.sort === "popularity") {
      mapped.sort((a, b) => (b.sold || 0) - (a.sold || 0));
    } else if (params.sort === "newest") {
      mapped.sort((a, b) => (parseInt(b.id) || 0) - (parseInt(a.id) || 0));
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
