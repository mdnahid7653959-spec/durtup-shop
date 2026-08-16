import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/firebaseAdapter";
import { ProductCard, type Product } from "@/components/products/ProductCard";
import { getSmartProductImage } from "@/utils/productImageHelper";
import { ChevronRight, Flame, Star, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeaturedProductsProps {
  title: string;
  viewAllLink?: string;
  filterType?: "featured" | "new" | "bestseller";
  icon?: "flame" | "star" | "sparkles";
  accentColor?: string;
}

interface ProductWithImages {
  id: string;
  name: string;
  slug: string;
  regular_price: number;
  discount_price: number | null;
  rating_average: number | null;
  rating_count: number | null;
  sold_count: number | null;
  free_shipping: boolean | null;
  is_new_arrival: boolean | null;
  is_best_seller: boolean | null;
  stock_quantity: number | null;
  status: string | null;
  product_images: { image_url: string; is_primary: boolean | null }[];
}

const defaultImages = [
  "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1560472355-536de3962603?w=400&h=400&fit=crop",
];

export function FeaturedProducts({ 
  title, 
  viewAllLink = "/products",
  filterType = "featured",
  icon = "flame",
  accentColor = "primary"
}: FeaturedProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const IconComponent = icon === "flame" ? Flame : icon === "star" ? Star : Sparkles;

  useEffect(() => {
    async function fetchProducts() {
      try {
        setError(null);
        
        // Build the query with product_images join
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
            is_new_arrival,
            is_best_seller,
            stock_quantity,
            status,
            product_images (
              image_url,
              is_primary
            )
          `)
          .eq("status", "active")
          .limit(12);

        // Apply filter based on type
        if (filterType === "featured") {
          query = query.eq("is_featured", true);
        } else if (filterType === "new") {
          query = query.eq("is_new_arrival", true);
        } else if (filterType === "bestseller") {
          query = query.eq("is_best_seller", true);
        }

        query = query.order("created_at", { ascending: false });

        const { data, error: fetchError } = await query;

        if (fetchError) {
          console.error("Error fetching products:", fetchError);
          setError("Unable to load products");
          return;
        }

        if (data) {
          const productsWithImages = data as ProductWithImages[];
          
          const mappedProducts: Product[] = productsWithImages.map((p, i) => {
            // Use actual product image if available, otherwise fallback
            const primaryImage = p.product_images?.find((img) => img.is_primary)?.image_url;
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
              isNew: p.is_new_arrival || false,
              isBestSeller: p.is_best_seller || false,
            };
          });
          
          setProducts(mappedProducts);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [filterType]);

  if (loading) {
    return (
      <section className="py-6">
        <div className="bg-card border rounded-2xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
              <div className="h-6 bg-muted rounded w-40 animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-muted rounded-xl mb-3" />
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-6">
        <div className="bg-card border rounded-2xl p-6 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="py-6">
      <div className="bg-card border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-${accentColor}/10 flex items-center justify-center`}>
              <IconComponent className={`h-5 w-5 text-${accentColor}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{title}</h2>
              <p className="text-sm text-muted-foreground">Handpicked for you</p>
            </div>
          </div>
          <Link 
            to={viewAllLink} 
            className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium"
          >
            View All
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        
        {/* Products grid */}
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {products.slice(0, 12).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>

        {/* Load more */}
        {products.length > 6 && (
          <div className="border-t px-4 py-4 flex items-center justify-center bg-muted/30">
            <Button variant="outline" asChild>
              <Link to={viewAllLink} className="gap-2">
                View All {title}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
