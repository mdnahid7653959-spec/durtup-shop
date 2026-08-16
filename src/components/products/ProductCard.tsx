import { memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Star, Truck, ShoppingCart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
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

function ProductCardComponent({
  product
}: ProductCardProps) {
  const displayImage = getSmartProductImage(product.name, product.image);
  const navigate = useNavigate();
  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const {
    addToCart
  } = useCart();
  const {
    isInWishlist,
    toggleWishlist
  } = useWishlist();
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
  return <div className="group relative bg-card rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200 app-fade-in w-full border border-border">
      {/* Badges - Stacked vertically, inside card bounds */}
      <div className="absolute top-1.5 left-1.5 z-10 flex flex-col gap-1 max-w-[calc(100%-48px)]">
        {discount > 0 && <Badge className="bg-sale text-sale-foreground font-bold text-[10px] px-1.5 py-0.5 rounded-md w-fit">
            -{discount}%
          </Badge>}
        {product.isNew && <Badge className="bg-success text-success-foreground text-[10px] px-1.5 py-0.5 rounded-md w-fit">
            NEW
          </Badge>}
        {product.isBestSeller && <Badge className="bg-warning text-warning-foreground text-[10px] px-1.5 py-0.5 rounded-md w-fit">
            TOP
          </Badge>}
      </div>

      {/* Wishlist button - Fixed position inside card, 44px touch target */}
      <button onClick={handleWishlistToggle} className={cn("absolute top-1.5 right-1.5 z-10 w-9 h-9 rounded-full shadow-md flex items-center justify-center transition-all duration-150 touch-manipulation press-scale", inWishlist ? "bg-sale text-sale-foreground" : "bg-white/90 text-muted-foreground hover:text-sale")} aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}>
        <Heart className={cn("h-4 w-4", inWishlist && "fill-current")} />
      </button>

      {/* Product Image - 1:1 aspect ratio */}
      <Link to={`/product/${product.slug}`} className="block">
        <div className="aspect-square overflow-hidden bg-muted/30">
          <img src={displayImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" decoding="async" />
        </div>
      </Link>

      {/* Product Info - Compact padding */}
      <div className="p-2.5">
        {/* Product Name - 2 lines max */}
        <Link to={`/product/${product.slug}`}>
          <h3 className="font-medium text-[13px] leading-tight text-foreground line-clamp-2 mb-1.5 min-h-[2.25rem]">
            {product.name}
          </h3>
        </Link>

        {/* Rating & Sales - Single line */}
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <div className="flex items-center gap-0.5 bg-warning/10 px-1 py-0.5 rounded">
            <Star className="h-2.5 w-2.5 fill-warning text-warning" />
            <span className="text-[10px] font-semibold text-foreground">
              {product.rating.toFixed(1)}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {product.sold >= 1000 ? `${(product.sold / 1000).toFixed(0)}k sold` : `${product.sold} sold`}
          </span>
        </div>

        {/* Price Section - Aligned */}
        <div className="flex items-baseline gap-1.5 mb-2 flex-wrap">
          <span className="text-base font-bold text-sale">
            ৳{product.price.toLocaleString("en-IN")}
          </span>
          {product.originalPrice && <span className="text-[11px] text-muted-foreground line-through">
              ৳{product.originalPrice.toLocaleString("en-IN")}
            </span>}
        </div>



        {/* Action Buttons - 44px min height */}
        
      </div>
    </div>;
}
export const ProductCard = memo(ProductCardComponent);
