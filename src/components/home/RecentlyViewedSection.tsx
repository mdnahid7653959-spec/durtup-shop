import { memo } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const RecentlyViewedSection = () => {
  const { recentlyViewed, isLoading, clearRecentlyViewed } = useRecentlyViewed();

  if (isLoading || recentlyViewed.length === 0) {
    return null;
  }

  return (
    <div className="py-1.5">
      <div className="bg-card border rounded-lg overflow-hidden">
        {/* Ultra compact header */}
        <div className="flex items-center justify-between px-2 py-1 border-b">
          <h2 className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">Recent</h2>
          <button
            onClick={clearRecentlyViewed}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Clear"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>

        {/* Tiny thumbnails */}
        <ScrollArea className="w-full">
          <div className="flex gap-1 p-1.5">
            {recentlyViewed.slice(0, 20).map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.slug}`}
                state={{ preloadedProduct: product }}
                onMouseEnter={() => { if (product.image_url) { const i = new Image(); i.src = product.image_url; } }}
                onTouchStart={() => { if (product.image_url) { const i = new Image(); i.src = product.image_url; } }}
                className="w-10 h-10 flex-shrink-0 rounded overflow-hidden border bg-muted hover:border-primary transition-colors"
                title={product.name}
              >
                <img
                  src={product.image_url || "/placeholder.svg"}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </Link>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="h-1" />
        </ScrollArea>

      </div>
    </div>
  );
};

export default memo(RecentlyViewedSection);
