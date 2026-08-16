import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/firebaseAdapter";
import { ProductCard, type Product } from "@/components/products/ProductCard";
import { ChevronRight, ThumbsUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getSmartProductImage } from "@/utils/productImageHelper";

const LOCAL_STORAGE_KEY = "recently_viewed_products";
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1560472355-536de3962603?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&h=400&fit=crop",
];

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
  regular_price: number;
  discount_price: number | null;
  rating_average: number | null;
  rating_count: number | null;
  sold_count: number | null;
  view_count: number | null;
  free_shipping: boolean | null;
  product_images?: { image_url: string; is_primary: boolean | null }[];
};

function mapToProduct(p: ProductRow, i: number): Product {
  const primary =
    p.product_images?.find((img) => img.is_primary)?.image_url ||
    p.product_images?.[0]?.image_url;
  const image = getSmartProductImage(p.name, primary, "", i);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    image,
    price: p.discount_price || p.regular_price,
    originalPrice: p.discount_price ? p.regular_price : undefined,
    rating: Number(p.rating_average) || 4.7,
    reviews: p.rating_count || 100,
    sold: p.sold_count || 0,
    freeShipping: p.free_shipping ?? true,
  };
}

export function RecommendedProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [personalized, setPersonalized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPersonalized() {
      setLoading(true);
      try {
        // 1. Collect viewed product ids
        let viewedIds: string[] = [];
        if (user) {
          const { data } = await supabase
            .from("recently_viewed")
            .select("product_id, view_count, viewed_at")
            .eq("user_id", user.id)
            .order("viewed_at", { ascending: false })
            .limit(30);
          viewedIds = (data || []).map((r) => r.product_id);
        } else {
          try {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (stored) {
              const items = JSON.parse(stored) as { id: string }[];
              viewedIds = items.map((i) => i.id).slice(0, 30);
            }
          } catch {
            /* ignore */
          }
        }

        // 2. If we have viewed products, find their categories to recommend similar
        let topCategoryIds: string[] = [];
        if (viewedIds.length > 0) {
          const { data: viewedProducts } = await supabase
            .from("products")
            .select("category_id")
            .in("id", viewedIds);

          const counts = new Map<string, number>();
          (viewedProducts || []).forEach((p) => {
            if (p.category_id) counts.set(p.category_id, (counts.get(p.category_id) || 0) + 1);
          });
          topCategoryIds = [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([id]) => id);
        }

        // 3. Fetch recommended products
        const selectCols =
          "id,name,slug,category_id,regular_price,discount_price,rating_average,rating_count,sold_count,view_count,free_shipping,product_images(image_url,is_primary)";

        let recommended: ProductRow[] = [];
        if (topCategoryIds.length > 0) {
          let query = supabase
            .from("products")
            .select(selectCols)
            .eq("status", "active")
            .in("category_id", topCategoryIds)
            .order("view_count", { ascending: false })
            .order("sold_count", { ascending: false })
            .limit(18);
          if (viewedIds.length > 0) {
            query = query.not("id", "in", `(${viewedIds.join(",")})`);
          }
          const { data } = await query;
          recommended = (data as ProductRow[]) || [];
          if (recommended.length >= 6) setPersonalized(true);
        }

        // 4. Fallback / top-up with globally popular products
        if (recommended.length < 12) {
          const excludeIds = [...new Set([...viewedIds, ...recommended.map((r) => r.id)])];
          let fbQuery = supabase
            .from("products")
            .select(selectCols)
            .eq("status", "active")
            .order("view_count", { ascending: false })
            .order("sold_count", { ascending: false })
            .order("rating_average", { ascending: false })
            .limit(12 - recommended.length);
          if (excludeIds.length > 0) {
            fbQuery = fbQuery.not("id", "in", `(${excludeIds.join(",")})`);
          }
          const { data: fb } = await fbQuery;
          recommended = [...recommended, ...(((fb as ProductRow[]) || []))];
        }

        setProducts(recommended.slice(0, 12).map(mapToProduct));
      } catch (err) {
        console.error("Error fetching recommended products:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPersonalized();
  }, [user]);

  if (loading || products.length === 0) return null;

  return (
    <section className="py-6">
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <ThumbsUp className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {personalized ? "Picked For You" : "Popular Right Now"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {personalized
                  ? "Based on what you've been browsing"
                  : "Trending products shoppers love"}
              </p>
            </div>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium"
          >
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
