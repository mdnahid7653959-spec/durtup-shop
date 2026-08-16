import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/firebaseAdapter";
import { ProductCard, type Product } from "@/components/products/ProductCard";
import { getSmartProductImage } from "@/utils/productImageHelper";
import { ChevronRight, TrendingUp } from "lucide-react";

export function TrendingProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
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
          is_best_seller,
          product_images (
            image_url,
            is_primary
          )
        `)
        .eq("status", "active")
        .order("sold_count", { ascending: false })
        .limit(6);

      if (error) {
        console.error("Error fetching products:", error);
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
            rating: Number(p.rating_average) || 4.5,
            reviews: p.rating_count || 100,
            sold: p.sold_count || 500,
            freeShipping: p.free_shipping || false,
            isBestSeller: true,
          };
        });
        setProducts(mappedProducts);
      }
      setLoading(false);
    }
    fetchProducts();
  }, []);

  if (loading || products.length === 0) return null;

  return (
    <section className="py-6">
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Trending Now</h2>
              <p className="text-sm text-muted-foreground">Most popular this week</p>
            </div>
          </div>
          <Link to="/products?sort=trending" className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium">
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
