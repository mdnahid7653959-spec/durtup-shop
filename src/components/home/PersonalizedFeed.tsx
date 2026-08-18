import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Heart } from "lucide-react";
import { supabase } from "@/lib/firebaseAdapter";
import { useAuth } from "@/contexts/AuthContext";
import { getSmartProductImage } from "@/utils/productImageHelper";
import { cn } from "@/lib/utils";

const LOCAL_STORAGE_KEY = "recently_viewed_products";

type Row = {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
  regular_price: number;
  discount_price: number | null;
  rating_average: number | null;
  product_images?: { image_url: string; is_primary: boolean | null }[];
};

type Tile = {
  id: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  discountPct: number | null;
  rating: number;
  label: string;
  labelTone: "orange" | "blue" | "gray";
  tall: boolean;
  showHeart?: boolean;
  showRating?: boolean;
  newBadge?: boolean;
};

const FALLBACK_IMG = "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=400&fit=crop";
const LABELS: Array<{ label: string; tone: Tile["labelTone"] }> = [
  { label: "For You", tone: "orange" },
  { label: "Viewed", tone: "blue" },
  { label: "Matching", tone: "gray" },
  { label: "Rare", tone: "orange" },
  { label: "Similar", tone: "blue" },
  { label: "Trending", tone: "gray" },
];

function primaryImage(p: Row): string {
  const primary =
    p.product_images?.find((i) => i.is_primary)?.image_url ||
    p.product_images?.[0]?.image_url;
  return getSmartProductImage(p.name, primary);
}

export function PersonalizedFeed() {
  const { user } = useAuth();
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [personalized, setPersonalized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Collect viewed product ids
        let viewedIds: string[] = [];
        if (user) {
          const { data } = await supabase
            .from("recently_viewed")
            .select("product_id, viewed_at")
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
          } catch { /* ignore */ }
        }

        // Top categories from viewed
        let topCategories: string[] = [];
        if (viewedIds.length > 0) {
          const { data: viewed } = await supabase
            .from("products")
            .select("category_id")
            .in("id", viewedIds);
          const counts = new Map<string, number>();
          (viewed || []).forEach((p) => {
            if (p.category_id) counts.set(p.category_id, (counts.get(p.category_id) || 0) + 1);
          });
          topCategories = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
        }

        const cols =
          "id,name,slug,category_id,regular_price,discount_price,rating_average,product_images(image_url,is_primary)";

        let rows: Row[] = [];
        if (topCategories.length > 0) {
          let q = supabase
            .from("products")
            .select(cols)
            .eq("status", "active")
            .in("category_id", topCategories)
            .order("view_count", { ascending: false })
            .order("sold_count", { ascending: false })
            .limit(18);
          if (viewedIds.length > 0) q = q.not("id", "in", `(${viewedIds.join(",")})`);
          const { data } = await q;
          rows = (data as Row[]) || [];
          if (rows.length >= 6) setPersonalized(true);
        }

        if (rows.length < 12) {
          const exclude = [...new Set([...viewedIds, ...rows.map((r) => r.id)])];
          let q = supabase
            .from("products")
            .select(cols)
            .eq("status", "active")
            .order("view_count", { ascending: false })
            .order("sold_count", { ascending: false })
            .order("rating_average", { ascending: false })
            .limit(12 - rows.length);
          if (exclude.length > 0) q = q.not("id", "in", `(${exclude.join(",")})`);
          const { data: fb } = await q;
          rows = [...rows, ...(((fb as Row[]) || []))];
        }

        const built: Tile[] = rows.slice(0, 12).map((p, i) => {
          const price = p.discount_price ?? p.regular_price;
          const discountPct =
            p.discount_price && p.regular_price > p.discount_price
              ? Math.round(((p.regular_price - p.discount_price) / p.regular_price) * 100)
              : null;
          const meta = LABELS[i % LABELS.length];
          return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            image: primaryImage(p),
            price,
            discountPct,
            rating: Number(p.rating_average) || 4.7,
            label: meta.label,
            labelTone: meta.tone,
            tall: i % 2 === 0, // alternating tall / square
            showHeart: i === 2,
            showRating: i === 4,
            newBadge: i === 5,
          };
        });

        setTiles(built);
      } catch (err) {
        console.error("PersonalizedFeed load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (loading || tiles.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">


      {/* Dense feed */}
      <div className="px-3 pb-4">
        <div className="grid grid-cols-3 gap-2">
          {tiles.map((t) => (
            <Link 
              key={t.id} 
              to={`/product/${t.slug}`} 
              state={{ preloadedProduct: t }}
              onMouseEnter={() => { if (t.image) { const i = new Image(); i.src = t.image; } }}
              onTouchStart={() => { if (t.image) { const i = new Image(); i.src = t.image; } }}
              className="flex flex-col gap-1 group active:scale-95 transition-transform"
            >
              <div
                className={cn(
                  "relative rounded-xl overflow-hidden bg-muted",
                  t.tall ? "aspect-[3/4]" : "aspect-square"
                )}
              >
                <img
                  src={t.image}
                  alt={t.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {t.discountPct !== null && (
                  <div className="absolute top-1 left-1 bg-destructive text-destructive-foreground text-[8px] font-black px-1.5 py-0.5 rounded-sm">
                    -{t.discountPct}%
                  </div>
                )}
                {t.newBadge && (
                  <div className="absolute top-1 left-1 bg-blue-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase">
                    New
                  </div>
                )}
                {t.showHeart && (
                  <button
                    type="button"
                    onClick={(e) => e.preventDefault()}
                    className="absolute top-1 right-1 p-1 bg-background/90 rounded-full shadow-sm"
                  >
                    <Heart className="w-2.5 h-2.5 text-muted-foreground" strokeWidth={2.5} />
                  </button>
                )}
                {t.showRating && (
                  <div className="absolute bottom-1 right-1 bg-black/50 backdrop-blur-sm text-white text-[8px] font-bold px-1 rounded-sm">
                    {t.rating.toFixed(1)} ★
                  </div>
                )}
              </div>
              <div className="px-0.5">
                <div
                  className={cn(
                    "text-[9px] font-bold uppercase tracking-wide",
                    t.labelTone === "orange" && "text-primary",
                    t.labelTone === "blue" && "text-blue-500",
                    t.labelTone === "gray" && "text-muted-foreground"
                  )}
                >
                  {t.label}
                </div>
                <div className="text-xs font-black text-foreground">৳{t.price.toLocaleString()}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
