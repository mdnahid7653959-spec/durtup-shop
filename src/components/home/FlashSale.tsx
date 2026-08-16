import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/firebaseAdapter";
import { Zap, ChevronRight, ChevronLeft, Timer } from "lucide-react";
import { ProductCard, type Product } from "@/components/products/ProductCard";
import { getSmartProductImage } from "@/utils/productImageHelper";
import { Button } from "@/components/ui/button";

export function FlashSale() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({
    hours: 5,
    minutes: 23,
    seconds: 45,
  });

  useEffect(() => {
    async function fetchFlashSaleProducts() {
      const { data, error } = await supabase
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
          product_images (
            image_url,
            is_primary
          )
        `)
        .eq("status", "active")
        .eq("is_flash_sale", true)
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) {
        console.error("Error fetching flash sale products:", error);
      } else if (data) {
        const mappedProducts: Product[] = (data as any[]).map((p, i) => {
          const primaryImage = p.product_images?.find((img: any) => img.is_primary)?.image_url;
          const firstImage = p.product_images?.[0]?.image_url;
          const image = getSmartProductImage(p.name, primaryImage || firstImage, "", i);

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
          };
        });
        setProducts(mappedProducts);
      }
      setLoading(false);
    }

    fetchFlashSaleProducts();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev;
        
        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        } else {
          // Reset timer for demo
          return { hours: 5, minutes: 23, seconds: 45 };
        }
        
        return { hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (num: number) => num.toString().padStart(2, "0");

  // Don't render if no flash sale products
  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <section className="py-4 sm:py-6 overflow-hidden">
      <div className="bg-card border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-sale via-red-500 to-orange-500 p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center animate-pulse shrink-0">
                <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-white fill-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  Flash Sale
                  <span className="text-[10px] sm:text-xs bg-white/20 px-1.5 sm:px-2 py-0.5 rounded-full">HOT</span>
                </h2>
                <p className="text-white/80 text-xs sm:text-sm truncate">Limited time offers • Don't miss out!</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1 text-white/80 text-xs sm:text-sm">
                <Timer className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                Ends in:
              </div>
              <div className="flex items-center gap-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white flex items-center justify-center">
                  <span className="text-sale font-bold text-lg sm:text-xl">{formatTime(timeLeft.hours)}</span>
                </div>
                <span className="text-white font-bold text-lg sm:text-xl">:</span>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white flex items-center justify-center">
                  <span className="text-sale font-bold text-lg sm:text-xl">{formatTime(timeLeft.minutes)}</span>
                </div>
                <span className="text-white font-bold text-lg sm:text-xl">:</span>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white flex items-center justify-center">
                  <span className="text-sale font-bold text-lg sm:text-xl">{formatTime(timeLeft.seconds)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Products */}
        <div className="p-3 sm:p-6">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-muted rounded-xl mb-3" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-3 flex items-center justify-between bg-muted/50">
          <p className="text-sm text-muted-foreground">
            <span className="text-sale font-semibold">{products.length} items</span> on flash sale
          </p>
          <Link 
            to="/flash-sale" 
            className="inline-flex items-center gap-1 text-primary hover:underline font-medium text-sm"
          >
            View All Deals
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
