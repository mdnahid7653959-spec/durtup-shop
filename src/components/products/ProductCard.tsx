import { memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Star, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { cn } from "@/lib/utils";
import { getSmartProductImage } from "@/utils/productImageHelper";

export interface Product {
  id: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviews: number;
  sold: number;
  freeShipping?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
}

interface ProductCardProps {
  product: Product;
}

function ProductCardComponent({ product }: ProductCardProps) {
  const displayImage = getSmartProductImage(product.name, product.image);
  const navigate = useNavigate();
  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const inWishlist = isInWishlist(product.id);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await addToCart(product.id, 1);
  };

  const handleBuyNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await addToCart(product.id, 1);
    navigate("/checkout");
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  return (
    <div className="group relative bg-card rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 w-full border border-border flex flex-col justify-between">
      <div>
        {/* Badges */}
        <div className="absolute top-1.5 left-1.5 z-10 flex flex-col gap-1 max-w-[calc(100%-48px)] pointer-events-none">
          {discount > 0 && (
            <Badge className="bg-orange-600 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-md w-fit">
              -{discount}%
            </Badge>
          )}
          {product.isNew && (
            <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-md w-fit">
              NEW
            </Badge>
          )}
          {product.isBestSeller && (
            <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-md w-fit">
              TOP
            </Badge>
          )}
        </div>

        {/* Wishlist button */}
        <button
          onClick={handleWishlistToggle}
          className={cn(
            "absolute top-1.5 right-1.5 z-10 w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-all duration-150 active:scale-90",
            inWishlist ? "bg-orange-600 text-white" : "bg-white/90 text-muted-foreground hover:text-orange-600"
          )}
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className={cn("h-4 w-4", inWishlist && "fill-current")} />
        </button>

        {/* Product Image */}
        <Link to={`/product/${product.slug}`} className="block">
          <div className="aspect-square overflow-hidden bg-muted/30">
            <img
              src={displayImage}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                (e.target as HTMLImageElement).src = getSmartProductImage(product.name, "", "");
              }}
            />
          </div>
        </Link>

        {/* Product Info */}
        <div className="p-2.5 pb-0">
          <Link to={`/product/${product.slug}`}>
            <h3 className="font-medium text-[12px] sm:text-[13px] leading-tight text-foreground line-clamp-2 mb-1.5 min-h-[2rem] hover:text-orange-600 transition-colors">
              {product.name}
            </h3>
          </Link>

          {/* Rating & Sales */}
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <div className="flex items-center gap-0.5 bg-amber-500/10 px-1 py-0.5 rounded">
              <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
              <span className="text-[10px] font-semibold text-foreground">
                {product.rating.toFixed(1)}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {product.sold >= 1000 ? `${(product.sold / 1000).toFixed(0)}k sold` : `${product.sold} sold`}
            </span>
          </div>

          {/* Price Section */}
          <div className="flex items-baseline gap-1.5 mb-2 flex-wrap">
            <span className="text-sm sm:text-base font-black text-orange-600">
              ৳{product.price.toLocaleString("en-BD")}
            </span>
            {product.originalPrice && (
              <span className="text-[11px] text-muted-foreground line-through">
                ৳{product.originalPrice.toLocaleString("en-BD")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Button - Instant Buy Now */}
      <div className="p-2.5 pt-0 mt-1">
        <button
          onClick={handleBuyNow}
          className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs sm:text-sm py-2 px-3 rounded-lg flex items-center justify-center shadow-sm active:scale-[0.98] transition-all cursor-pointer"
        >
          Order Now
        </button>
      </div>
    </div>
  );
}

export const ProductCard = memo(ProductCardComponent);
