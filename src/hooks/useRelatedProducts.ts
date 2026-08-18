import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/firebaseAdapter";
import { getCachedMohasagorProducts } from "@/utils/mohasagorCache";

export interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviews: number;
  sold: number;
  freeShipping: boolean;
  isBestSeller: boolean;
  isNew?: boolean;
  matchScore?: number;
}

interface ProductContext {
  id: string;
  name: string;
  category_id?: string | null;
  brand_id?: string | null;
  regular_price: number;
  discount_price?: number | null;
  tags?: string[] | null;
}

const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400&h=400&fit=crop",
];

export function useRelatedProducts(productContext: ProductContext | null, limit: number = 12) {
  const [products, setProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRelatedProducts = useCallback(async () => {
    if (!productContext?.id) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Try to fetch and match from local cached Mohasagor products first
      const cachedCatalog = await getCachedMohasagorProducts();
      
      if (cachedCatalog && cachedCatalog.length > 0) {
        // Find current product in cache to get its category name if available
        const currentCachedProd = cachedCatalog.find(p => p.id === productContext.id || p.name === productContext.name);
        const targetCategory = productContext.category_id || (currentCachedProd as any)?.category;

        // Filter out current product
        const otherProducts = cachedCatalog.filter(p => p.id !== productContext.id && p.name !== productContext.name);

        if (otherProducts.length > 0) {
          const scored = otherProducts.map((p: any) => {
            let score = 0;

            // Category match (highest priority) - 50 points
            if (targetCategory && p.category && targetCategory.toString().toLowerCase() === p.category.toString().toLowerCase()) {
              score += 50;
            }

            // Word overlap in product names - 10 points per word
            const currentWords = productContext.name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
            const productWords = p.name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
            const wordOverlap = currentWords.filter(word => 
              productWords.some(pw => pw.includes(word) || word.includes(pw))
            ).length;
            score += wordOverlap * 10;

            // Price proximity - up to 15 points
            const currentPrice = productContext.discount_price || productContext.regular_price;
            const diffRatio = Math.abs(p.price - currentPrice) / currentPrice;
            if (diffRatio < 0.2) score += 15;
            else if (diffRatio < 0.5) score += 8;

            return {
              id: p.id,
              name: p.name,
              slug: p.slug,
              image: p.image,
              price: p.price,
              originalPrice: p.originalPrice,
              rating: p.rating || 4.8,
              reviews: p.reviews || 15,
              sold: p.sold || 45,
              freeShipping: p.freeShipping !== false,
              isBestSeller: p.isBestSeller || false,
              isNew: p.isNew || false,
              matchScore: score
            };
          });

          // Sort by match score descending, then by popularity (sold)
          scored.sort((a, b) => {
            if (b.matchScore !== a.matchScore) {
              return b.matchScore - a.matchScore;
            }
            return b.sold - a.sold;
          });

          // Same category matches first, followed by all other categories
          const categoryMatches = scored.filter(p => p.matchScore >= 50);
          const otherCategoryProducts = scored.filter(p => p.matchScore < 50);
          const finalMatches = [...categoryMatches, ...otherCategoryProducts];

          setProducts(finalMatches);
          setLoading(false);
          return;
        }
      }

      // 2. Database Fallback (if cache search didn't yield enough products)
      const currentPrice = productContext.discount_price || productContext.regular_price;
      const priceMin = currentPrice * 0.5;
      const priceMax = currentPrice * 2;

      let query = supabase
        .from("products")
        .select(`
          id,
          name,
          slug,
          regular_price,
          discount_price,
          rating_average,
          rating_count,
          sold_count,
          free_shipping,
          is_best_seller,
          is_new_arrival,
          category_id,
          brand_id,
          tags,
          product_images (
            image_url,
            is_primary,
            sort_order
          )
        `)
        .eq("status", "active")
        .neq("id", productContext.id)
        .limit(limit * 3);

      if (productContext.category_id && productContext.brand_id) {
        query = query.or(`category_id.eq.${productContext.category_id},brand_id.eq.${productContext.brand_id}`);
      } else if (productContext.category_id) {
        query = query.eq("category_id", productContext.category_id);
      } else if (productContext.brand_id) {
        query = query.eq("brand_id", productContext.brand_id);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      if (!data || data.length === 0) {
        const { data: fallbackData } = await supabase
          .from("products")
          .select(`
            id,
            name,
            slug,
            regular_price,
            discount_price,
            rating_average,
            rating_count,
            sold_count,
            free_shipping,
            is_best_seller,
            is_new_arrival,
            category_id,
            brand_id,
            tags,
            product_images (
              image_url,
              is_primary,
              sort_order
            )
          `)
          .eq("status", "active")
          .neq("id", productContext.id)
          .order("sold_count", { ascending: false })
          .limit(limit);

        if (fallbackData) {
          setProducts(mapToRelatedProducts(fallbackData, productContext));
        }
        setLoading(false);
        return;
      }

      const scoredProducts = data.map((p: any) => {
        let score = 0;
        if (p.category_id && p.category_id === productContext.category_id) {
          score += 40;
        }
        if (p.brand_id && p.brand_id === productContext.brand_id) {
          score += 25;
        }
        const itemPrice = p.discount_price || p.regular_price;
        if (itemPrice >= priceMin && itemPrice <= priceMax) {
          score += 15;
        }
        if (productContext.tags && p.tags) {
          const overlap = productContext.tags.filter((tag: string) => 
            p.tags.includes(tag)
          ).length;
          score += overlap * 10;
        }
        return { ...p, matchScore: score };
      });

      scoredProducts.sort((a, b) => b.matchScore - a.matchScore);
      setProducts(mapToRelatedProducts(scoredProducts.slice(0, limit), productContext));

    } catch (err: any) {
      console.error("Error fetching related products:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [productContext?.id, productContext?.category_id, productContext?.brand_id, limit]);

  useEffect(() => {
    fetchRelatedProducts();

    const handleUpdate = () => {
      fetchRelatedProducts();
    };
    window.addEventListener("mohasagor_products_updated", handleUpdate);
    return () => {
      window.removeEventListener("mohasagor_products_updated", handleUpdate);
    };
  }, [fetchRelatedProducts]);

  return { products, loading, error, refetch: fetchRelatedProducts };
}

function mapToRelatedProducts(data: any[], context: ProductContext): RelatedProduct[] {
  return data.map((p, i) => {
    let image = DEFAULT_IMAGES[i % DEFAULT_IMAGES.length];
    if (p.product_images && p.product_images.length > 0) {
      const primaryImage = p.product_images.find((img: any) => img.is_primary);
      const sortedImages = [...p.product_images].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      image = primaryImage?.image_url || sortedImages[0]?.image_url || image;
    }

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      image,
      price: p.discount_price || p.regular_price,
      originalPrice: p.discount_price ? p.regular_price : undefined,
      rating: Number(p.rating_average) || 0,
      reviews: p.rating_count || 0,
      sold: p.sold_count || 0,
      freeShipping: p.free_shipping || false,
      isBestSeller: p.is_best_seller || false,
      isNew: p.is_new_arrival || false,
      matchScore: p.matchScore,
    };
  });
}
