import { memo, useRef, useState, useEffect, useMemo } from "react";
import { Sparkles, RefreshCw, Layers } from "lucide-react";
import { ProductCard, type Product } from "./ProductCard";
import { useRelatedProducts } from "@/hooks/useRelatedProducts";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductContext {
  id: string;
  name: string;
  category_id?: string | null;
  brand_id?: string | null;
  regular_price: number;
  discount_price?: number | null;
  tags?: string[] | null;
}

interface RelatedProductsProps {
  product: ProductContext | null;
  title?: string;
  subtitle?: string;
  limit?: number;
}

function RelatedProductsComponent({
  product,
  title = "For You",
  subtitle = "Recommended items for you",
  limit = 24
}: RelatedProductsProps) {
  const { products, loading } = useRelatedProducts(product, limit);
  const [displayCount, setDisplayCount] = useState(12);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Convert to ProductCard format
  const mappedProducts: Product[] = useMemo(() => {
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      image: p.image,
      price: p.price,
      originalPrice: p.originalPrice,
      rating: p.rating,
      reviews: p.reviews,
      sold: p.sold,
      freeShipping: p.freeShipping,
      isBestSeller: p.isBestSeller,
      isNew: p.isNew
    }));
  }, [products]);

  const visibleProducts = useMemo(() => {
    return mappedProducts.slice(0, displayCount);
  }, [mappedProducts, displayCount]);

  // Infinite Scroll Auto-Load on Scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCount((prev) => (prev < mappedProducts.length ? prev + 12 : prev));
        }
      },
      { rootMargin: "250px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [mappedProducts.length]);

  if (!loading && products.length === 0) return null;

  return (
    <section className="py-8 sm:py-10 lg:py-14 w-full">
      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
        {/* Header (No icons, title set to For You) */}
        <div className="p-4 sm:p-6 lg:px-8 lg:py-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">{title}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-xs font-semibold text-muted-foreground w-fit">
            <span>Same Category First • Auto Load On Scroll</span>
          </div>
        </div>

        {/* Responsive Product Grid */}
        <div className="p-4 sm:p-6 lg:p-8">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-full">
                  <Skeleton className="aspect-square rounded-xl mb-3" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-5 w-1/3" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
                {visibleProducts.map((prod) => (
                  <ProductCard key={prod.id} product={prod} />
                ))}
              </div>

              {/* Infinite Scroll Sentinel & Indicator */}
              <div className="mt-8 pt-4 border-t flex flex-col items-center justify-center text-center gap-2">
                {visibleProducts.length < mappedProducts.length ? (
                  <div ref={sentinelRef} className="flex items-center gap-2 text-xs font-semibold text-primary animate-pulse py-2">
                    <RefreshCw className="h-4 w-4 animate-spin" /> Scroll down to load more products...
                  </div>
                ) : (
                  <span className="text-xs font-medium text-muted-foreground">
                    All {mappedProducts.length} related &amp; recommendation products loaded
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export const RelatedProducts = memo(RelatedProductsComponent);
