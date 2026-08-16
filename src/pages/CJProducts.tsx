import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { SEOHead } from "@/components/SEOHead";
import { supabase } from "@/lib/firebaseAdapter";
import { ChevronRight, Globe, Loader2, RefreshCw, ShoppingCart, Zap } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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

// BDT conversion
const USD_TO_BDT = 120;
const PROFIT_MARGIN = 1.3; // 30% margin

function ProductSkeleton() {
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <Skeleton className="aspect-square w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
      </div>
    </div>
  );
}

export default function CJProducts() {
  const [products, setProducts] = useState<CJProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const requestedRef = useRef(false);
  const navigate = useNavigate();

  const fetchCJProducts = useCallback(async (page: number = 1, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    setRetryAfterSeconds(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("cj-products", {
        body: { page, size: 24 }
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

  // Add to CJ cart
  const addToCart = (product: CJProduct, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const bdtPrice = Math.round(product.price * USD_TO_BDT * PROFIT_MARGIN);
    const cartItem = {
      id: product.id,
      name: product.name,
      price: bdtPrice,
      image: product.image,
      quantity: 1,
      sku: product.sku,
      isCJ: true
    };

    const existingCart = JSON.parse(localStorage.getItem("cj_cart") || "[]");
    const existingIndex = existingCart.findIndex((item: any) => item.id === product.id);
    
    if (existingIndex >= 0) {
      existingCart[existingIndex].quantity += 1;
    } else {
      existingCart.push(cartItem);
    }
    
    localStorage.setItem("cj_cart", JSON.stringify(existingCart));
    toast.success("Added to cart!");
  };

  // Buy now
  const buyNow = (product: CJProduct, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, e);
    navigate("/checkout");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead 
        title="China Product Source - MegaMart"
        description="Browse trending products from China with free shipping and great prices."
      />
      <Header />
      
      <main className="flex-1 pb-20 lg:pb-0">
        <div className="container py-4 sm:py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4 sm:mb-6">
            <Link to="/" className="hover:text-primary">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">China Product Source</span>
          </nav>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
                <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">China Product Source</h1>
                <p className="text-sm text-muted-foreground">
                  {pagination ? `${pagination.total.toLocaleString()} products available` : "Hot products from CJ Dropshipping"}
                </p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => fetchCJProducts(1, false)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Error State */}
          {error && !loading && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-6">
              <p className="text-sm text-foreground">
                {error}
                {typeof retryAfterSeconds === "number" && (
                  <span className="text-muted-foreground"> (retry in ~{retryAfterSeconds}s)</span>
                )}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => fetchCJProducts(1, false)}
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {Array.from({ length: 24 }).map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              {/* Product Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {products.map(product => {
                  const discount = product.originalPrice > product.price 
                    ? Math.round((product.originalPrice - product.price) / product.originalPrice * 100) 
                    : 0;
                  const bdtPrice = Math.round(product.price * USD_TO_BDT * PROFIT_MARGIN);
                  const originalBdtPrice = Math.round(product.originalPrice * USD_TO_BDT * PROFIT_MARGIN);

                  return (
                    <Link 
                      key={product.id} 
                      to={`/product/cj/${product.id}`}
                      className="bg-card rounded-xl border overflow-hidden group block hover:shadow-lg transition-shadow"
                    >
                      {/* Image */}
                      <div className="relative aspect-square overflow-hidden bg-muted">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400";
                          }}
                        />
                        
                        {/* Badges */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          {discount > 0 && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                              -{discount}%
                            </Badge>
                          )}
                          {product.freeShipping && (
                            <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0.5">
                              Free Ship
                            </Badge>
                          )}
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

                        {/* Price */}
                        <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-sm sm:text-base font-bold text-primary">
                            ৳{bdtPrice.toLocaleString()}
                          </span>
                          {discount > 0 && (
                            <span className="text-[10px] sm:text-xs text-muted-foreground line-through">
                              ৳{originalBdtPrice.toLocaleString()}
                            </span>
                          )}
                        </div>

                        {/* Listed count */}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {product.listedCount.toLocaleString()} listed
                        </p>

                        {/* Action Buttons */}
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs"
                            onClick={(e) => addToCart(product, e)}
                          >
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            Cart
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 h-8 text-xs bg-primary"
                            onClick={(e) => buyNow(product, e)}
                          >
                            <Zap className="h-3 w-3 mr-1" />
                            Buy
                          </Button>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="mt-8 flex justify-center">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="min-w-[250px]"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        Load More Products
                        {pagination && (
                          <span className="ml-2 text-muted-foreground">
                            ({products.length} of {pagination.total})
                          </span>
                        )}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* All loaded message */}
              {pagination && !hasMore && products.length > 0 && (
                <p className="text-center text-sm text-muted-foreground mt-8">
                  Showing all {products.length} products
                </p>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <Globe className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No products found.</p>
              <Button onClick={() => fetchCJProducts(1, false)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
