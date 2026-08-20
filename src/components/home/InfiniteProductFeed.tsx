import { useEffect, useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { ProductCard, type Product } from "@/components/products/ProductCard";
import { getCachedMohasagorProducts } from "@/utils/mohasagorCache";
import { prefetchProductImages } from "@/utils/productImageHelper";

const BATCH_SIZE = 18;

export function InfiniteProductFeed() {
  const [allCatalog, setAllCatalog] = useState<Product[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Load initial products from cache
  useEffect(() => {
    async function initCatalog() {
      try {
        const products = await getCachedMohasagorProducts();
        if (products && products.length > 0) {
          setAllCatalog(products);
          setDisplayedProducts(products.slice(0, BATCH_SIZE));
          setHasMore(products.length > BATCH_SIZE);
          prefetchProductImages(products, 60);
        }
      } catch (err) {
        console.error("Failed to load infinite product feed:", err);
      }
    }

    initCatalog();

    // Auto 5-minute product shuffle & refresh timer
    const autoRotateTimer = setInterval(async () => {
      const products = await getCachedMohasagorProducts();
      if (products && products.length > 0) {
        const timeBlock = Math.floor(Date.now() / (5 * 60 * 1000));
        const shift = (timeBlock * BATCH_SIZE) % products.length;
        const rotated = [...products.slice(shift), ...products.slice(0, shift)];
        setAllCatalog(rotated);
        setDisplayedProducts(rotated.slice(0, BATCH_SIZE));
        setPage(1);
        setHasMore(rotated.length > BATCH_SIZE);
        prefetchProductImages(rotated, 60);
      }
    }, 5 * 60 * 1000);

    // Listen for background API product updates
    const handleUpdate = async () => {
      const updated = await getCachedMohasagorProducts();
      if (updated && updated.length > 0) {
        setAllCatalog(updated);
        setDisplayedProducts((prev) => {
          const currentCount = Math.max(prev.length, BATCH_SIZE);
          return updated.slice(0, currentCount);
        });
        prefetchProductImages(updated, 60);
      }
    };
    window.addEventListener("mohasagor_products_updated", handleUpdate);
    return () => {
      clearInterval(autoRotateTimer);
      window.removeEventListener("mohasagor_products_updated", handleUpdate);
    };
  }, []);

  // Function to load next batch synchronously with 0ms lag
  const loadNextBatch = () => {
    if (!hasMore || allCatalog.length === 0) return;
    const nextPage = page + 1;
    const nextBatch = allCatalog.slice(0, nextPage * BATCH_SIZE);

    setDisplayedProducts(nextBatch);
    setPage(nextPage);
    setHasMore(nextBatch.length < allCatalog.length);
    // Prefetch upcoming images before the user reaches them
    prefetchProductImages(allCatalog.slice(nextPage * BATCH_SIZE, (nextPage + 2) * BATCH_SIZE), 36);
  };

  // IntersectionObserver for Infinite Scroll with large 1000px look-ahead
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadNextBatch();
        }
      },
      { rootMargin: "1000px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [page, hasMore, allCatalog]);

  if (displayedProducts.length === 0) return null;

  return (
    <section className="w-full py-6 space-y-4">
      {/* Title block that matches the original theme styling */}
      <div className="flex items-center justify-between border-b pb-3">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <span>More to Love</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-600/10 text-orange-600 font-semibold">
            {allCatalog.length}+ items
          </span>
        </h2>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {displayedProducts.map((product, idx) => (
          <ProductCard key={`${product.id}-${idx}`} product={product} priority={idx < 12} />
        ))}
      </div>

      {/* Load More Sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className="w-full py-8 flex justify-center items-center">
          <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
            Loading more products...
          </div>
        </div>
      )}
    </section>
  );
}
