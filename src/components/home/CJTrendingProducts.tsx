import { useEffect, useRef, useState, useCallback, memo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, TrendingUp, Loader2, Globe } from "lucide-react";
import { supabase } from "@/lib/firebaseAdapter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
interface CJProduct {
  id: string;
  name: string;
  sku: string;
  image: string;
  price: number;
  originalPrice: number;
  category: string;
  freeShipping: boolean;
  inStock: boolean;
  listedCount: number;
}
interface Pagination {
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

// Local storage cache key
const CJ_CACHE_KEY = "cj_trending_cache";
const CJ_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedData {
  products: CJProduct[];
  pagination: Pagination | null;
  timestamp: number;
}
function getCachedData(): CachedData | null {
  try {
    const cached = localStorage.getItem(CJ_CACHE_KEY);
    if (!cached) return null;
    const data: CachedData = JSON.parse(cached);
    if (Date.now() - data.timestamp > CJ_CACHE_DURATION) {
      localStorage.removeItem(CJ_CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
function setCachedData(products: CJProduct[], pagination: Pagination | null) {
  try {
    const data: CachedData = {
      products,
      pagination,
      timestamp: Date.now()
    };
    localStorage.setItem(CJ_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

// Skeleton loader component for fast perceived loading
function ProductSkeleton() {
  return <div className="bg-background rounded-xl border overflow-hidden">
      <Skeleton className="aspect-square w-full" />
      <div className="p-2 sm:p-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
      </div>
    </div>;
}
export function CJTrendingProducts() {
  const [products, setProducts] = useState<CJProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const requestedRef = useRef(false);
  const fetchCJProducts = useCallback(async (page: number = 1, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      // Check cache first for initial load
      if (page === 1) {
        const cached = getCachedData();
        if (cached) {
          setProducts(cached.products);
          setPagination(cached.pagination);
          setCurrentPage(1);
          setLoading(false);
          return;
        }
      }
      setLoading(true);
    }
    setError(null);
    setRetryAfterSeconds(null);
    try {
      // Fetch fewer products initially for faster load (12 instead of 24)
      const {
        data,
        error: fnError
      } = await supabase.functions.invoke("cj-products", {
        body: {
          page,
          size: page === 1 ? 12 : 24
        }
      });
      if (fnError) {
        console.error("CJ function error:", fnError);
        throw new Error(fnError.message);
      }
      if (data?.success && Array.isArray(data?.products)) {
        if (append) {
          setProducts(prev => [...prev, ...data.products]);
        } else {
          setProducts(data.products);
          // Cache first page results
          if (page === 1) {
            setCachedData(data.products, data.pagination || null);
          }
        }
        if (data.pagination) {
          setPagination(data.pagination);
        }
        setCurrentPage(page);
        return;
      }
      if (typeof data?.retryAfterSeconds === "number") {
        setRetryAfterSeconds(data.retryAfterSeconds);
      }
      setError(data?.error || "Failed to load CJ products");
    } catch (err) {
      console.error("Error fetching CJ products:", err);
      setError(err instanceof Error ? err.message : "Failed to load CJ products");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);
  useEffect(() => {
    // React StrictMode runs effects twice in dev; prevent duplicate CJ calls.
    if (requestedRef.current) return;
    requestedRef.current = true;
    fetchCJProducts(1, false);
  }, [fetchCJProducts]);
  const handleLoadMore = () => {
    if (pagination && currentPage < pagination.totalPages && !loadingMore) {
      fetchCJProducts(currentPage + 1, true);
    }
  };
  const hasMore = pagination ? currentPage < pagination.totalPages : false;

  // Show skeleton grid while loading (much faster perceived load)
  if (loading) {
    return <section className="py-3 sm:py-5">
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="p-3 sm:p-4 border-b flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">CJ Trending</h2>
              <p className="text-xs text-muted-foreground">Hot products from CJ Dropshipping</p>
            </div>
          </div>
          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
              {Array.from({
              length: 12
            }).map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          </div>
        </div>
      </section>;
  }
  if (error) {
    return <section className="py-3 sm:py-5">
        
      </section>;
  }
  if (products.length === 0) return null;
  return <section className="py-3 sm:py-5">
      <div className="bg-card border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
              <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">China Product Source</h2>
              
            </div>
          </div>
          <Link to="/products/cj" className="text-xs sm:text-sm font-medium text-primary hover:underline flex items-center gap-1 min-h-[44px] px-2">
            See All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Product Grid */}
        <div className="p-3 sm:p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
            {products.map(product => <CJProductCard key={product.id} product={product} />)}
          </div>

          {/* Load More Button */}
          {hasMore && <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore} className="min-w-[200px]">
                {loadingMore ? <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </> : <>
                    Load More Products
                    {pagination && <span className="ml-2 text-muted-foreground">
                        ({products.length} of {pagination.total})
                      </span>}
                  </>}
              </Button>
            </div>}

          {/* Show count info */}
          {pagination && !hasMore && products.length > 0 && <p className="text-center text-sm text-muted-foreground mt-4">
              Showing all {products.length} products
            </p>}
        </div>
      </div>
    </section>;
}

// BDT conversion
const USD_TO_BDT = 120;
const PROFIT_MARGIN = 1.3; // 30% margin
const CJProductCard = memo(function CJProductCard({
  product
}: {
  product: CJProduct;
}) {
  const discount = product.originalPrice > product.price ? Math.round((product.originalPrice - product.price) / product.originalPrice * 100) : 0;
  const bdtPrice = Math.round(product.price * USD_TO_BDT * PROFIT_MARGIN);
  const originalBdtPrice = Math.round(product.originalPrice * USD_TO_BDT * PROFIT_MARGIN);
  return <Link to={`/product/cj/${product.id}`} className="bg-background rounded-xl border overflow-hidden group block">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" decoding="async" />
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discount > 0 && <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
              -{discount}%
            </span>}
          {product.freeShipping && <span className="bg-green-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
              Free Ship
            </span>}
        </div>
      </div>

      {/* Info */}
      <div className="p-2 sm:p-3">
        <h3 className="text-xs sm:text-sm font-medium text-foreground line-clamp-2 min-h-[2.5rem] leading-tight">
          {product.name}
        </h3>
        
        <p className="text-[10px] text-muted-foreground mt-1 truncate">
          {product.category}
        </p>

        {/* Price in BDT */}
        <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm sm:text-base font-bold text-primary">
            ৳{bdtPrice.toLocaleString()}
          </span>
          {discount > 0 && <span className="text-[10px] sm:text-xs text-muted-foreground line-through">
              ৳{originalBdtPrice.toLocaleString()}
            </span>}
        </div>

        {/* Listed count */}
        <p className="text-[10px] text-muted-foreground mt-1">
          {product.listedCount.toLocaleString()} listed
        </p>
      </div>
    </Link>;
});
