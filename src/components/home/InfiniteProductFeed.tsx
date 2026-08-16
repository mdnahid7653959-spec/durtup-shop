import { useEffect, useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { ProductCard, type Product } from "@/components/products/ProductCard";
import { getCachedMohasagorProducts } from "@/utils/mohasagorCache";

const BATCH_SIZE = 12;

export function InfiniteProductFeed() {
  const [allCatalog, setAllCatalog] = useState<Product[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
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
        }
      } catch (err) {
        console.error("Failed to load infinite product feed:", err);
      }
    }

    initCatalog();

    // Auto 10-minute product shuffle & refresh timer
    const autoRotateTimer = setInterval(async () => {
      const products = await getCachedMohasagorProducts();
      if (products && products.length > 0) {
        const timeBlock = Math.floor(Date.now() / (10 * 60 * 1000));
        const shift = (timeBlock * BATCH_SIZE) % products.length;
        const rotated = [...products.slice(shift), ...products.slice(0, shift)];
        setAllCatalog(rotated);
        setDisplayedProducts(rotated.slice(0, BATCH_SIZE));
        setPage(1);
        setHasMore(rotated.length > BATCH_SIZE);
      }
    }, 10 * 60 * 1000);

    // Listen for background API product updates
    const handleUpdate = async () => {
      const updated = await getCachedMohasagorProducts();
      if (updated && updated.length > 0) {
        setAllCatalog(updated);
      }
    };
    window.addEventListener("mohasagor_products_updated", handleUpdate);
    return () => {
      clearInterval(autoRotateTimer);
      window.removeEventListener("mohasagor_products_updated", handleUpdate);
    };
  }, []);

  // Function to load next batch
  const loadNextBatch = () => {
    if (isLoadingMore || !hasMore || allCatalog.length === 0) return;

    setIsLoadingMore(true);
    setTimeout(() => {
      const nextPage = page + 1;
      const nextBatch = allCatalog.slice(0, nextPage * BATCH_SIZE);

      setDisplayedProducts(nextBatch);
      setPage(nextPage);
      setHasMore(nextBatch.length < allCatalog.length);
      setIsLoadingMore(false);
    }, 250);
  };

  // IntersectionObserver for Infinite Scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadNextBatch();
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [page, hasMore, isLoadingMore, allCatalog]);

  if (displayedProducts.length === 0) return null;

  return (
    <section className="w-full py-6 space-y-4">
      {/* Title block that matches the original theme styling */}
      <div className="flex items-center justify-between border-b pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-primary rounded-full" />
          <h3 className="text-base sm:text-lg font-bold text-foreground">
            More Products For You
          </h3>
        </div>
        <span className="text-xs text-muted-foreground font-semibold">
          {displayedProducts.length} items loaded
        </span>
      </div>

      {/* Product Grid - uses original classes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5">
        {displayedProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Infinite Scroll Sentinel & Loader */}
      <div ref={sentinelRef} className="py-6 text-center flex flex-col items-center justify-center min-h-[60px]">
        {isLoadingMore && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            Loading more products...
          </div>
        )}
      </div>
    </section>
  );
}
