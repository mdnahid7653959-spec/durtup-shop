import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Heart, ShoppingCart, Star, Truck, Shield, RotateCcw, Minus, Plus, Loader2, ChevronLeft, ChevronRight, Share2, Zap } from "lucide-react";
import DOMPurify from "dompurify";
import { supabase } from "@/lib/firebaseAdapter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useCJCart } from "@/hooks/useCJCart";
import { useToast } from "@/hooks/use-toast";
import { RelatedProducts } from "@/components/products/RelatedProducts";
// BDT conversion rate with profit margin
const USD_TO_BDT = 120;
const PROFIT_MARGIN = 1.3; // 30% margin

interface CJProductVariant {
  variantId: string;
  variantSku: string;
  variantName: string;
  variantNameEn: string;
  variantImage: string;
  variantStandard: string;
  variantUnit: string;
  variantProperty: string;
  variantVolume: number;
  variantWeight: number;
  variantSellPrice: number;
}

interface CJProductDetail {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  sku: string;
  images: string[];
  price: number;
  originalPrice: number;
  category: string;
  freeShipping: boolean;
  inStock: boolean;
  variants: CJProductVariant[];
  weight: number;
  packingWeight: number;
  listedCount: number;
}

export default function CJProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<CJProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<CJProductVariant | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const { addToCart: addToCJCart } = useCJCart();
  const { toast } = useToast();
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Touch swipe handling
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    const images = product?.images || [];
    if (touchStart - touchEnd > 75) {
      setSelectedImage((prev) => Math.min(prev + 1, images.length - 1));
    }
    if (touchEnd - touchStart > 75) {
      setSelectedImage((prev) => Math.max(prev - 1, 0));
    }
  };

  useEffect(() => {
    async function fetchProduct() {
      if (!id) return;

      try {
        const { data, error: fnError } = await supabase.functions.invoke("cj-products", {
          body: { productId: id },
        });

        if (fnError) {
          console.error("CJ function error:", fnError);
          throw new Error(fnError.message);
        }

        console.log("CJ product detail response:", data);

        if (data?.success && data?.product) {
          setProduct(data.product);
          // Select first variant by default
          if (data.product.variants?.length > 0) {
            setSelectedVariant(data.product.variants[0]);
          }
        } else {
          setError(data?.error || "Product not found");
        }
      } catch (err) {
        console.error("Error fetching CJ product:", err);
        setError(err instanceof Error ? err.message : "Failed to load product");
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [id]);

  const handleAddToCart = async () => {
    if (!product) return;
    
    setAddingToCart(true);
    
    const cjProduct = {
      id: `cj_${product.id}`,
      name: product.nameEn || product.name,
      price: convertToBDT(selectedVariant?.variantSellPrice || product.price),
      image: selectedVariant?.variantImage || product.images[0] || "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200&h=200&fit=crop",
      variant: selectedVariant?.variantNameEn || selectedVariant?.variantName || null,
      variantId: selectedVariant?.variantId || null,
      isCJProduct: true as const,
    };

    addToCJCart(cjProduct, quantity);
    setAddingToCart(false);
  };

  const handleBuyNow = async () => {
    if (!product) return;
    
    setBuyingNow(true);
    
    const cjProduct = {
      id: `cj_${product.id}`,
      name: product.nameEn || product.name,
      price: convertToBDT(selectedVariant?.variantSellPrice || product.price),
      image: selectedVariant?.variantImage || product.images[0] || "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200&h=200&fit=crop",
      variant: selectedVariant?.variantNameEn || selectedVariant?.variantName || null,
      variantId: selectedVariant?.variantId || null,
      isCJProduct: true as const,
    };

    addToCJCart(cjProduct, quantity);
    setBuyingNow(false);
    navigate("/checkout");
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.nameEn || product?.name,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied!", description: "Product link copied to clipboard" });
    }
  };

  const convertToBDT = (usdPrice: number) => {
    return Math.round(usdPrice * USD_TO_BDT * PROFIT_MARGIN);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-4 sm:py-8 pb-20 md:pb-8">
          <div className="animate-pulse">
            <div className="grid md:grid-cols-2 gap-4 sm:gap-8">
              <div className="aspect-square bg-muted rounded-xl" />
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-12 bg-muted rounded w-1/3" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-8 pb-20 md:pb-8">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-foreground mb-4">Product Not Found</h1>
            <p className="text-muted-foreground mb-6">{error || "The product you're looking for doesn't exist."}</p>
            <Link to="/">
              <Button size="lg">Back to Home</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const currentPrice = selectedVariant?.variantSellPrice || product.price;
  const bdtPrice = convertToBDT(currentPrice);
  const originalBdtPrice = convertToBDT(product.originalPrice);
  const discount = product.originalPrice > currentPrice
    ? Math.round(((product.originalPrice - currentPrice) / product.originalPrice) * 100)
    : 0;

  const images = product.images.length > 0 ? product.images : [
    "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=600&fit=crop"
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <Header />
      <main className="flex-1 pb-44 md:pb-8 overflow-x-hidden">
        <div className="w-full max-w-full px-3 sm:px-6 lg:container py-3 sm:py-6 overflow-x-hidden">
          {/* Breadcrumb - Desktop only */}
          <nav className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground mb-4 lg:mb-6">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <Link to="/products?source=cj" className="hover:text-primary transition-colors">CJ Products</Link>
            <span>/</span>
            <span className="text-foreground line-clamp-1 max-w-[200px]">{product.nameEn || product.name}</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-4 lg:gap-10 w-full max-w-full min-w-0">
            {/* Product Images - Mobile Optimized */}
            <div className="space-y-2 sm:space-y-4 w-full max-w-full min-w-0">
              {/* Main Image - Full Width on Mobile */}
              <div 
                ref={imageContainerRef}
                className="aspect-square w-full rounded-xl sm:rounded-2xl overflow-hidden bg-neutral-50/80 dark:bg-card border border-border/70 shadow-sm relative touch-pan-y flex items-center justify-center"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <img 
                  src={images[selectedImage]} 
                  alt={product.nameEn || product.name}
                  className="w-full h-full object-contain object-center transition-opacity duration-300 select-none"
                  loading="eager"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=600&fit=crop";
                  }}
                />

                {/* Navigation arrows - Desktop only */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedImage(Math.max(0, selectedImage - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-background/90 shadow-lg flex items-center justify-center opacity-0 sm:opacity-100 hover:bg-background transition-all disabled:opacity-30"
                      disabled={selectedImage === 0}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setSelectedImage(Math.min(images.length - 1, selectedImage + 1))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-background/90 shadow-lg flex items-center justify-center opacity-0 sm:opacity-100 hover:bg-background transition-all disabled:opacity-30"
                      disabled={selectedImage === images.length - 1}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}

                {/* Share button */}
                <button
                  onClick={handleShare}
                  className="absolute top-2.5 right-2.5 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-background/90 shadow-md flex items-center justify-center hover:bg-background transition-all active:scale-95"
                >
                  <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>

                {/* Badges - Mobile Optimized */}
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                  {discount > 0 && (
                    <Badge variant="destructive" className="bg-sale text-xs px-2 py-0.5">-{discount}%</Badge>
                  )}
                  {product.freeShipping && (
                    <Badge className="bg-success text-xs px-2 py-0.5">Free Ship</Badge>
                  )}
                </div>

                {/* Image counter - Mobile only */}
                {images.length > 1 && (
                  <div className="absolute bottom-2.5 right-2.5 sm:hidden bg-foreground/60 text-background text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
                    {selectedImage + 1} / {images.length}
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery - Horizontal Scroll */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto py-1 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
                  {images.slice(0, 8).map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-xl overflow-hidden border-2 transition-all active:scale-95 bg-neutral-50/80 dark:bg-card ${
                        selectedImage === i 
                          ? 'border-primary ring-2 ring-primary/30 shadow-md scale-105' 
                          : 'border-border hover:border-muted-foreground/50 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img 
                        src={img} 
                        alt={`View ${i + 1}`} 
                        className="w-full h-full object-cover transition-transform duration-200" 
                        loading="lazy"
                        onError={(e) => { 
                          e.currentTarget.src = "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=100&h=100&fit=crop"; 
                        }} 
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info - Mobile Optimized */}
            <div className="space-y-4 sm:space-y-5 w-full max-w-full min-w-0">
              {/* Badge & Title */}
              <div className="space-y-2">
                <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs">International</Badge>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground leading-tight line-clamp-3">
                  {product.nameEn || product.name}
                </h1>
                
                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                  <span>SKU: {product.sku}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{product.listedCount.toLocaleString()} sold</span>
                  <span className="hidden sm:inline">•</span>
                  <span className={`font-medium ${product.inStock ? "text-success" : "text-destructive"}`}>
                    {product.inStock ? "✓ In Stock" : "Out of Stock"}
                  </span>
                </div>
              </div>

              {/* Price Box - Premium Design */}
              <div className="p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl border border-primary/20 shadow-sm">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">
                    ৳{bdtPrice.toLocaleString()}
                  </span>
                  {discount > 0 && (
                    <>
                      <span className="text-base sm:text-lg text-muted-foreground/70 line-through">
                        ৳{originalBdtPrice.toLocaleString()}
                      </span>
                      <Badge className="bg-gradient-to-r from-destructive to-primary text-destructive-foreground text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
                        {discount}% OFF
                      </Badge>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground/60 mt-2">Inclusive of all taxes</p>
              </div>

              {/* Variants - Clean Compact Pills */}
              {product.variants.length > 0 && (
                <div className="space-y-3 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Select Variant</span>
                    <span className="text-xs text-muted-foreground">{product.variants.length} options</span>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1 scrollbar-hide">
                    {product.variants.map((variant) => {
                      // Extract short variant name (last meaningful part)
                      const fullName = variant.variantNameEn || variant.variantName || variant.variantStandard || '';
                      const shortName = fullName.split(' ').slice(-2).join(' ').substring(0, 20) || fullName.substring(0, 20);
                      
                      return (
                        <button
                          key={variant.variantId}
                          onClick={() => setSelectedVariant(variant)}
                          title={fullName}
                          className={`px-3 py-2 rounded-xl border-2 text-xs sm:text-sm font-medium transition-all duration-200 active:scale-95 max-w-[140px] truncate ${
                            selectedVariant?.variantId === variant.variantId
                              ? "border-primary bg-primary text-primary-foreground shadow-md"
                              : "border-border bg-background hover:border-primary/50 hover:bg-muted/50"
                          }`}
                        >
                          {shortName}
                        </button>
                      );
                    })}
                  </div>
                  {selectedVariant?.variantImage && (
                    <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-xl">
                      <img 
                        src={selectedVariant.variantImage} 
                        alt={selectedVariant.variantNameEn}
                        className="w-12 h-12 rounded-lg object-cover border-2 border-primary/40 shadow-sm"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=100&h=100&fit=crop";
                        }}
                      />
                      <span className="text-xs text-muted-foreground line-clamp-2 flex-1">
                        {selectedVariant.variantNameEn || selectedVariant.variantName}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons - Premium Mobile Design */}
              <div className="space-y-3 pt-4">
                {/* Quantity + Buy Now Row */}
                <div className="flex items-center gap-3">
                  {/* Quantity Selector - Premium */}
                  <div className="flex items-center border-2 border-border rounded-2xl overflow-hidden bg-muted/40 shrink-0 shadow-sm">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-11 h-12 flex items-center justify-center hover:bg-muted transition-colors touch-manipulation active:bg-primary/10"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-10 font-bold text-center text-lg">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-11 h-12 flex items-center justify-center hover:bg-muted transition-colors touch-manipulation active:bg-primary/10"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {/* Buy Now Button - Gradient Premium */}
                  <Button 
                    size="lg" 
                    className="flex-1 h-12 text-sm sm:text-base font-bold bg-gradient-to-r from-primary via-primary to-primary/80 hover:opacity-90 shadow-lg hover:shadow-xl rounded-2xl transition-all duration-300 active:scale-[0.97]" 
                    onClick={handleBuyNow} 
                    disabled={buyingNow || !product.inStock}
                  >
                    {buyingNow ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    Buy Now
                  </Button>
                </div>
                
                {/* Add to Cart Button - Full Width Premium */}
                <Button 
                  size="lg"
                  variant="outline"
                  className="w-full h-12 text-sm sm:text-base font-bold border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 active:scale-[0.97]" 
                  onClick={handleAddToCart} 
                  disabled={addingToCart || !product.inStock}
                >
                  {addingToCart ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ShoppingCart className="h-4 w-4 mr-2" />
                  )}
                  Add to Cart
                </Button>
              </div>

              {/* Features - Premium Card Grid */}
              <div className="grid grid-cols-3 gap-2.5 pt-5">
                <div className="flex flex-col items-center gap-1.5 text-center p-3 rounded-2xl bg-gradient-to-b from-muted/60 to-muted/30 border border-border/50 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Truck className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium leading-tight">{product.freeShipping ? "Free Ship" : "Fast Ship"}</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 text-center p-3 rounded-2xl bg-gradient-to-b from-muted/60 to-muted/30 border border-border/50 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium leading-tight">Secure</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 text-center p-3 rounded-2xl bg-gradient-to-b from-muted/60 to-muted/30 border border-border/50 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <RotateCcw className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium leading-tight">Easy Return</span>
                </div>
              </div>

              {/* Description */}
              {(product.descriptionEn || product.description) && (
                <div className="space-y-2 pt-4 border-t w-full max-w-full overflow-hidden">
                  <h3 className="text-sm font-semibold">Description</h3>
                  <div 
                    className="product-description-content text-xs sm:text-sm text-muted-foreground prose prose-sm max-w-none prose-p:my-2 prose-p:leading-relaxed overflow-hidden break-words w-full
                      [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_table]:w-full [&_table]:max-w-full [&_table]:border-collapse [&_table]:block [&_table]:overflow-x-auto
                      [&_td]:border [&_td]:border-border [&_td]:p-2 [&_td]:break-words [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:break-words
                      [&_a]:text-primary [&_a]:underline [&_a]:break-all
                      [&_p]:break-words [&_p]:max-w-full [&_div]:max-w-full [&_span]:max-w-full"
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(
                        (product.descriptionEn || product.description)
                          .replace(/width\s*:\s*\d{3,}px/gi, "width: 100%")
                          .replace(/min-width\s*:\s*\d{3,}px/gi, "min-width: 0px")
                          .replace(/width="[0-9]{3,}"/gi, 'width="100%"'),
                        {
                          ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'span', 'b', 'i', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'td', 'th', 'tbody', 'thead', 'img'],
                          ALLOWED_ATTR: ['class', 'src', 'alt', 'width', 'height'],
                          FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'style', 'link'],
                          FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'href', 'action']
                        }
                      )
                    }}
                  />
                </div>
              )}

              {/* Weight Info - Compact */}
              <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pt-3 border-t">
                <span>Weight: {product.weight}g</span>
                <span>Pack: {product.packingWeight}g</span>
                <span className="line-clamp-1">Cat: {product.category}</span>
              </div>
            </div>
          </div>

          {/* Related Products */}
          <div className="w-full max-w-full min-w-0">
            <RelatedProducts 
              product={{
                id: product.id,
                name: product.nameEn || product.name,
                category_id: product.category || null,
                regular_price: product.price,
                discount_price: product.originalPrice || undefined,
              }}
              title="You May Also Like"
              subtitle="Similar products based on your interests"
              limit={12}
            />
          </div>
        </div>

        {/* Mobile sticky bottom bar - Enhanced */}
        <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)] p-3 sm:hidden z-40 max-w-[100vw] overflow-hidden" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
          <div className="flex items-center gap-2 max-w-lg mx-auto w-full">
            {/* Mini Quantity */}
            <div className="flex items-center border rounded-xl overflow-hidden bg-muted/50 shrink-0">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-9 h-11 flex items-center justify-center active:bg-muted"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-8 text-center font-semibold text-sm">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-9 h-11 flex items-center justify-center active:bg-muted"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            
            <Button 
              variant="outline"
              size="lg" 
              className="flex-1 h-11 text-sm font-medium border-primary text-primary active:scale-[0.98] rounded-xl" 
              onClick={handleAddToCart}
              disabled={addingToCart || !product.inStock}
            >
              {addingToCart ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4 mr-1" />
              )}
              Cart
            </Button>
            <Button 
              size="lg" 
              className="flex-1 h-11 text-sm font-semibold bg-gradient-to-r from-primary to-primary/80 active:scale-[0.98] rounded-xl shadow-md shadow-primary/20" 
              onClick={handleBuyNow}
              disabled={buyingNow || !product.inStock}
            >
              {buyingNow ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-1" />
              )}
              Buy Now
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
