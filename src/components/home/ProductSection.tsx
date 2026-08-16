import { memo, useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, LucideIcon, Loader2 } from "lucide-react";
import { ProductCard, type Product } from "@/components/products/ProductCard";

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  products: Product[];
  viewAllLink: string;
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
}

const INITIAL_COUNT = 12;
const LOAD_MORE_COUNT = 6;

function ProductSectionComponent({
  title,
  subtitle = "Handpicked for you",
  products,
  viewAllLink,
  icon: Icon,
  iconBgColor,
  iconColor,
}: ProductSectionProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const hasMore = visibleCount < products.length;

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    // Small delay for smooth UX
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + LOAD_MORE_COUNT, products.length));
      setIsLoadingMore(false);
    }, 300);
  }, [hasMore, isLoadingMore, products.length]);

  // Intersection observer for auto-load
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (products.length === 0) return null;

  return (
    <section className="py-2.5 sm:py-4">
      <div className="bg-card border rounded-xl sm:rounded-2xl overflow-hidden shadow-sm app-fade-in">
        {/* Header */}
        <div className="p-2.5 sm:p-4 border-b bg-gradient-to-r from-muted/40 to-transparent flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-foreground leading-tight truncate">{title}</h2>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block truncate">{subtitle}</p>
            </div>
          </div>
          <Link 
            to={viewAllLink} 
            className="inline-flex items-center gap-0.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-[10px] sm:text-xs touch-manipulation press-scale hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
          >
            All
            <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </Link>
        </div>
        
        {/* Products grid */}
        <div className="p-2 sm:p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5">
            {products.slice(0, visibleCount).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>

        {/* Auto-load trigger */}
        {hasMore && (
          <div ref={loadMoreRef} className="px-3 py-3 flex items-center justify-center">
            {isLoadingMore && (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export const ProductSection = memo(ProductSectionComponent);
