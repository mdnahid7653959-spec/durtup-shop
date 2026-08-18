import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Heart, ShoppingCart, Star, Shield, RotateCcw, Minus, Plus, Loader2, Play, ChevronLeft, ChevronRight, Share2, Zap, MessageSquare, ShieldCheck, Store, Truck, Award, Sparkles, TrendingUp, Package, ZoomIn, ZoomOut, X, Maximize2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/firebaseAdapter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useToast } from "@/hooks/use-toast";
import { useProductRealtimeSync } from "@/hooks/useRealtimeSync";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { RelatedProducts } from "@/components/products/RelatedProducts";
import { ProductReviews } from "@/components/products/ProductReviews";
import { StoreDetails } from "@/components/products/StoreDetails";
import { getCachedMohasagorProducts } from "@/utils/mohasagorCache";
import { calculateProductPrice } from "@/utils/pricingMargin";
import { getSmartProductImage } from "@/utils/productImageHelper";
import { db } from "@/integrations/firebase/client";
import { collection, getDocs } from "firebase/firestore";

interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean | null;
  sort_order: number | null;
}
interface ProductVariant {
  id: number;
  product_id: number;
  attribute: string;
  variant: string;
}
interface Product {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  regular_price: number;
  discount_price: number | null;
  stock_quantity: number;
  free_shipping: boolean;
  rating_average: number;
  rating_count: number;
  sold_count: number;
  is_featured: boolean;
  warranty_info: string | null;
  return_policy: string | null;
  color?: string | null;
  video_url?: string | null;
  product_images?: ProductImage[];
  product_variants?: ProductVariant[];
  category_id?: string | null;
  brand_id?: string | null;
  tags?: string[] | null;
  seller_id?: string | null;
}
const defaultImages = [
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600' fill='%23f8fafc'><rect width='600' height='600' rx='30'/><g transform='translate(250, 240)' fill='none' stroke='%2394a3b8' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'><rect x='10' y='20' width='80' height='70' rx='10'/><circle cx='35' cy='45' r='10'/><path d='M10 75 l25-25 l20 20 l25-25 l10 10'/></g><text x='300' y='360' font-family='sans-serif' font-size='20' font-weight='600' fill='%2364748b' text-anchor='middle'>No Image Uploaded</text></svg>"
];

const getYouTubeEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
};

function MobileProductTopBar() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  return (
    <div className="md:hidden sticky top-0 z-40 bg-primary text-primary-foreground shadow-sm w-full max-w-[100vw] overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex items-center gap-2 px-2 py-1.5 w-full max-w-full">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-white/10 rounded-md shrink-0" aria-label="Back">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) navigate(`/products?search=${encodeURIComponent(q)}`); }} className="flex-1 min-w-0">
          <input type="search" placeholder="Search products..." value={q} onChange={(e) => setQ(e.target.value)}
            className="w-full h-8 rounded-md px-3 text-xs text-foreground bg-white placeholder:text-muted-foreground focus:outline-none" />
        </form>
        <Link to="/wishlist" className="p-1.5 hover:bg-white/10 rounded-md shrink-0" aria-label="Wishlist">
          <Heart className="h-5 w-5" />
        </Link>
        <Link to="/cart" className="p-1.5 hover:bg-white/10 rounded-md shrink-0" aria-label="Cart">
          <ShoppingCart className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}



function InlineStoreBar({ sellerId, onContactSeller, contactingSeller }: {
  sellerId: string;
  onContactSeller: () => void;
  contactingSeller: boolean;
}) {
  const { data: store, isLoading } = useQuery({
    queryKey: ["inline-store", sellerId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("resolve_product_seller", {
        _product_seller_id: sellerId,
      });

      if (error) {
        console.error("Inline store resolve error:", error);
        return null;
      }

      return Array.isArray(data) ? data[0] : data;
    },
    enabled: !!sellerId,
  });

  if (isLoading) {
    return <div className="h-16 mt-4 rounded-xl bg-muted animate-pulse" />;
  }

  const storeName = store?.shop_name || "Durtup Official";

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border mt-4">
      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
        {store?.shop_logo ? (
          <img src={store.shop_logo} alt={storeName} className="w-full h-full object-cover" />
        ) : (
          <Store className="h-5 w-5 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground truncate">{storeName}</span>
          {(store?.is_featured ?? true) && <ShieldCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
        </div>
        {store?.rating_average != null ? (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-warning text-warning" />
            <span className="text-xs text-muted-foreground">
              {Number(store.rating_average).toFixed(1)} ({store.rating_count || 0})
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Trusted marketplace seller</span>
        )}
      </div>
      <Button size="sm" variant="outline" className="gap-1.5 flex-shrink-0" onClick={onContactSeller} disabled={contactingSeller}>
        {contactingSeller ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">Chat</span>
      </Button>
    </div>
  );
}

export default function ProductDetail() {
  const {
    slug
  } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const {
    addToCart
  } = useCart();
  const {
    isInWishlist,
    toggleWishlist
  } = useWishlist();
  const {
    toast
  } = useToast();
  const {
    trackView
  } = useRecentlyViewed();
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Enable real-time sync for this product
  useProductRealtimeSync(product?.id);

  // Image URL Resolver & Fallback Helper
  const resolveImage = (img: any): string => {
    if (!img) return getSmartProductImage(product?.name || "", "", product?.category_id || "");
    const url = typeof img === "string" ? img : img.image_url || img.url || img.product_image;
    if (!url || typeof url !== "string") return getSmartProductImage(product?.name || "", "", product?.category_id || "");
    const trimmed = url.trim();
    if (!trimmed) return getSmartProductImage(product?.name || "", "", product?.category_id || "");
    let fullUrl = trimmed;
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("data:") && !trimmed.startsWith("blob:")) {
      if (trimmed.startsWith("//")) fullUrl = `https:${trimmed}`;
      else if (trimmed.startsWith("/")) fullUrl = `https://mohasagor.com.bd${trimmed}`;
      else fullUrl = `https://mohasagor.com.bd/${trimmed}`;
    }
    return getSmartProductImage(product?.name || "", fullUrl, product?.category_id || "");
  };

  const recordUserProductView = (p: any) => {
    if (typeof window === "undefined" || !p) return;
    try {
      const cat = p.category_id || p.category_slug || p.category || "";
      if (cat) {
        const rawCats = localStorage.getItem("user_viewed_categories");
        const cats: string[] = rawCats ? JSON.parse(rawCats) : [];
        const updatedCats = [cat, ...cats.filter((c: string) => c !== cat)].slice(0, 10);
        localStorage.setItem("user_viewed_categories", JSON.stringify(updatedCats));
      }
      const rawProds = localStorage.getItem("recently_viewed_products");
      const prods: any[] = rawProds ? JSON.parse(rawProds) : [];
      const updatedProds = [
        { id: p.id, name: p.name || p.title, slug: p.slug, category: cat, image: p.product_images?.[0]?.image_url || p.image || p.image_url },
        ...prods.filter((item: any) => item.id !== p.id)
      ].slice(0, 15);
      localStorage.setItem("recently_viewed_products", JSON.stringify(updatedProds));
    } catch {}
  };

  // Get images from product or use defaults
  const rawImgList = product?.product_images && product.product_images.length > 0
    ? product.product_images.map(img => typeof img === "string" ? img : img.image_url)
    : (product as any)?.images && Array.isArray((product as any).images) && (product as any).images.length > 0
    ? (product as any).images
    : (product as any)?.image_url || (product as any)?.image
    ? [(product as any).image_url || (product as any).image]
    : [getSmartProductImage(product?.name || "", "", product?.category_id || "")];

  const images = (rawImgList || []).map(resolveImage).filter(Boolean);
  if (images.length === 0) images.push(getSmartProductImage(product?.name || "", "", product?.category_id || ""));


  // Touch swipe handling for images
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      // Swipe left
      const totalImages = (product as any)?.video_url ? images.length + 1 : images.length;
      setSelectedImage(prev => Math.min(prev + 1, totalImages - 1));
      setShowVideo(selectedImage === images.length - 1 && (product as any)?.video_url);
    }
    if (touchEnd - touchStart > 75) {
      // Swipe right
      setSelectedImage(prev => Math.max(prev - 1, 0));
      setShowVideo(false);
    }
  };
  // Helper to map images from Mohasagor API
  const mapSupplierImages = (raw: any): ProductImage[] => {
    const product_images: ProductImage[] = [];
    const base = "https://mohasagor.com.bd";
    
    const resolveUrl = (url: any): string => {
      if (!url || typeof url !== "string") return "";
      const trimmed = url.trim();
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
        return trimmed;
      }
      if (trimmed.startsWith("//")) return `https:${trimmed}`;
      return trimmed.startsWith("/") ? `${base}${trimmed}` : `${base}/${trimmed}`;
    };

    const addedUrls = new Set<string>();
    const addImg = (url: any) => {
      const u = resolveUrl(url);
      if (u && !addedUrls.has(u)) {
        addedUrls.add(u);
        product_images.push({
          id: `img-${product_images.length}`,
          image_url: u,
          is_primary: product_images.length === 0,
          sort_order: product_images.length
        });
      }
    };

    // 1. Check raw.product_images array (objects or strings)
    if (Array.isArray(raw.product_images) && raw.product_images.length > 0) {
      raw.product_images.forEach((img: any) => {
        if (typeof img === "string") {
          addImg(img);
        } else if (img && typeof img === "object") {
          addImg(img.product_image || img.image_url || img.image || img.url);
        }
      });
    }

    // 2. Check raw.images array (objects or strings)
    if (Array.isArray(raw.images) && raw.images.length > 0) {
      raw.images.forEach((img: any) => {
        if (typeof img === "string") {
          addImg(img);
        } else if (img && typeof img === "object") {
          addImg(img.image_url || img.url || img.image);
        }
      });
    }

    // 3. Single image properties
    if (raw.thumbnail_img) addImg(raw.thumbnail_img);
    if (raw.image_url) addImg(raw.image_url);
    if (raw.image) addImg(raw.image);
    if (raw.thumbnail) addImg(raw.thumbnail);

    return product_images;
  };

  // Helper to map supplier product to Product interface (Price MUST match card price exactly)
  const mapSupplierProduct = (raw: any, productSlug: string, imagesArr: ProductImage[]): Product => {
    let sellingPrice = 0;
    let regularPrice: number | null = null;

    // Check if product is already processed with final price (e.g. from mohasagorCache or home products)
    if (raw.discount_price !== undefined || raw.originalPrice !== undefined) {
      sellingPrice = Number(raw.discount_price || raw.price || 0);
      regularPrice = raw.originalPrice || raw.regular_price ? Number(raw.originalPrice || raw.regular_price) : null;
    } else {
      // Direct raw API object - calculate with dynamic margin
      const exactRetailPrice = parseFloat(raw.price) || parseFloat(raw.sale_price) || 0;
      const rawRegularPrice = parseFloat(raw.regular_price) || 0;

      const calc = calculateProductPrice(exactRetailPrice, undefined, rawRegularPrice);
      sellingPrice = calc.price;
      regularPrice = calc.regularPrice;
    }

    const variants = (raw.product_variants || []).map((v: any) => ({
      id: parseInt(v.id) || Math.floor(Math.random() * 100000),
      product_id: parseInt(raw.id) || 0,
      attribute: v.attribute || "Option",
      variant: v.variant || v.name || v.color || v.size,
    }));

    return {
      id: raw.id.toString(),
      name: raw.name || raw.title || "Product",
      slug: productSlug,
      short_description: raw.short_description || null,
      description: raw.details || raw.description || "High quality product.",
      regular_price: (regularPrice && regularPrice > sellingPrice) ? regularPrice : sellingPrice,
      discount_price: (regularPrice && regularPrice > sellingPrice) ? sellingPrice : null,
      stock_quantity: parseInt(raw.stock_quantity) || parseInt(raw.stock) || 50,
      free_shipping: true,
      rating_average: Number(raw.rating_average || 4.8),
      rating_count: Number(raw.rating_count || 15),
      sold_count: parseInt(raw.sold) || parseInt(raw.sold_count) || 45,
      is_featured: Boolean(raw.is_featured || raw.isFeatured),
      warranty_info: raw.warranty_info || null,
      return_policy: raw.return_policy || null,
      color: raw.color || null,
      video_url: raw.video_link || raw.video_url || null,
      product_images: imagesArr,
      product_variants: variants,
      category_id: raw.category_id || raw.category || null,
      seller_id: raw.seller_id || "mohasagor.com.bd"
    };
  };

  useEffect(() => {
    async function fetchProduct() {
      if (!slug) return;
      setLoading(true);
      const targetSlug = decodeURIComponent(slug).trim();
      const targetLower = targetSlug.toLowerCase();
      
      // Extract numeric ID suffix if present (e.g. "stylishcomfortable-sports-t-shirt-4-four-pis-combo-offer-9749" -> "9749")
      const suffixMatch = targetLower.match(/-(\d+)$/);
      const extractedId = suffixMatch ? suffixMatch[1] : "";
      const cleanId = extractedId || targetLower.replace('product-', '').replace('supplier-', '');

      try {
        // 1. Check Local Storage Admin Products (Instant 0ms)
        try {
          const rawLocal = localStorage.getItem("enterprise_admin_products") || localStorage.getItem("local_products");
          if (rawLocal) {
            const list = JSON.parse(rawLocal);
            if (Array.isArray(list)) {
              const found = list.find((p: any) => 
                (p.slug || "").toLowerCase() === targetLower || 
                (p.id || "").toLowerCase() === targetLower || 
                String(p.id) === targetSlug ||
                (p.name || p.title || "").toLowerCase() === targetLower
              );

              if (found) {
                const rawImgs = Array.isArray(found.images) && found.images.length > 0
                  ? found.images
                  : Array.isArray(found.product_images) && found.product_images.length > 0
                  ? found.product_images.map((i: any) => i.image_url || i.url)
                  : [found.image_url || found.image || defaultImages[0]];

                const imgList: ProductImage[] = rawImgs.map((imgUrl: string, idx: number) => ({
                  id: `img-${idx}`,
                  image_url: imgUrl,
                  is_primary: idx === 0,
                  sort_order: idx
                }));

                const formattedProduct: Product = {
                  id: String(found.id || `prod_${Date.now()}`),
                  name: found.name || found.title || "Product",
                  slug: found.slug || targetSlug,
                  short_description: found.short_description || found.shortDescription || null,
                  description: found.description || "High quality product from store.",
                  regular_price: Number(found.regular_price || found.price || 0),
                  discount_price: found.discount_price ? Number(found.discount_price) : null,
                  stock_quantity: Number(found.stock_quantity || found.stock || 50),
                  free_shipping: Boolean(found.free_shipping ?? true),
                  rating_average: Number(found.rating_average || 4.8),
                  rating_count: Number(found.rating_count || 18),
                  sold_count: Number(found.sold_count || 45),
                  is_featured: Boolean(found.is_featured || found.isFeatured),
                  warranty_info: found.warranty_info || null,
                  return_policy: found.return_policy || null,
                  color: found.color || null,
                  video_url: found.video_url || null,
                  product_images: imgList,
                  product_variants: Array.isArray(found.product_variants) ? found.product_variants : [],
                  category_id: found.category_id || found.category || null,
                  seller_id: found.seller_id || "Admin"
                };

                setProduct(formattedProduct);
                setSelectedImage(0);
                trackView(formattedProduct.id);
                recordUserProductView(formattedProduct);
                setLoading(false);
                return;
              }
            }
          }
        } catch (localErr) {
          console.warn("ProductDetail local storage check warning:", localErr);
        }

        // 2. Query Mohasagor Supplier Master Cache (Fast 0ms in-memory/localStorage - Ensures 100% price parity with cards)
        try {
          const cachedMohasagor = await getCachedMohasagorProducts();
          if (cachedMohasagor && cachedMohasagor.length > 0) {
            const foundSp = cachedMohasagor.find(
              (sp: any) =>
                String(sp.id) === cleanId ||
                (extractedId && String(sp.id) === extractedId) ||
                sp.slug === targetSlug ||
                sp.slug === `product-${cleanId}` ||
                (extractedId && sp.slug === `product-${extractedId}`) ||
                String(sp.product_code) === cleanId ||
                (extractedId && String(sp.product_code) === extractedId) ||
                (sp.name && targetLower.includes(sp.name.toLowerCase().slice(0, 15)))
            );

            if (foundSp) {
              const mappedImages = mapSupplierImages(foundSp);
              const mappedProduct = mapSupplierProduct(foundSp, targetSlug, mappedImages);
              setProduct(mappedProduct);
              setSelectedImage(0);
              trackView(mappedProduct.id);
              setLoading(false);
              return;
            }
          }
        } catch (spErr) {
          console.warn("Supplier cache lookup warning:", spErr);
        }

        // 3. Query Database by slug OR id
        try {
          const { data, error } = await supabase.from("products").select(`
              *,
              product_images (
                id,
                image_url,
                is_primary,
                sort_order
              ),
              product_variants (
                id,
                product_id,
                name,
                color,
                size,
                storage,
                price,
                image_url
              ),
              supplier_product_mappings (
                supplier_id,
                supplier_sku
              )
            `).or(`slug.eq.${targetSlug},id.eq.${targetSlug}`).maybeSingle();

          if (data && (data.slug === targetSlug || data.id === targetSlug || String(data.id) === cleanId)) {
            const dbVariants: ProductVariant[] = [];
            if (data.product_variants && Array.isArray(data.product_variants)) {
              data.product_variants.forEach((v: any, idx: number) => {
                if (v.size) dbVariants.push({ id: v.id || idx, product_id: data.id, attribute: "Size", variant: v.size });
                if (v.color) dbVariants.push({ id: v.id || idx + 1000, product_id: data.id, attribute: "Color", variant: v.color });
                if (v.storage) dbVariants.push({ id: v.id || idx + 2000, product_id: data.id, attribute: "Storage", variant: v.storage });
                if (!v.size && !v.color && !v.storage && v.name) dbVariants.push({ id: v.id || idx, product_id: data.id, attribute: "Option", variant: v.name });
              });
            }
            data.product_variants = dbVariants;

            const mapping = data.supplier_product_mappings && data.supplier_product_mappings[0];
            const isMohasagor = data.sku?.startsWith("MOH-") || (mapping && mapping.supplier_sku);
            if (isMohasagor) {
              try {
                const supplierSku = mapping?.supplier_sku || data.sku.replace("MOH-", "");
                const { data: responseData, error: apiError } = await supabase.functions.invoke("supplier-api", {
                  body: { 
                    action: "get-product-details", 
                    supplierId: mapping?.supplier_id || "da929859-f7fa-4590-a3ad-f7012eac5b8c", 
                    payload: { productId: supplierSku } 
                  }
                });

                if (!apiError && responseData?.success && responseData.data) {
                  const raw = responseData.data;
                  let mappedImages = mapSupplierImages(raw);
                  if (mappedImages.length === 0 && data.product_images && data.product_images.length > 0) {
                    mappedImages = data.product_images;
                  }
                  const mappedProduct = mapSupplierProduct(raw, targetSlug, mappedImages);
                  mappedProduct.id = data.id;
                  if (data.seller_id) mappedProduct.seller_id = data.seller_id;
                  if ((!mappedProduct.product_variants || mappedProduct.product_variants.length === 0) && dbVariants.length > 0) {
                    mappedProduct.product_variants = dbVariants;
                  }
                  setProduct(mappedProduct);
                  trackView(data.id);
                  setLoading(false);
                  return;
                }
              } catch (err) {
                console.warn("Failed to fetch live supplier product details:", err);
              }
            }

            setProduct(data as unknown as Product);
            setSelectedImage(0);
            if (data.id) trackView(data.id);
            recordUserProductView(data);
            setLoading(false);
            return;
          }
        } catch (dbErr) {
          console.warn("Supabase product lookup warning:", dbErr);
        }

        // 4. Query Firestore DB by slug OR id
        try {
          const snap = await getDocs(collection(db, "products"));
          if (!snap.empty) {
            const foundDoc = snap.docs.find(d => {
              const data = d.data();
              return d.id === targetSlug || data.slug === targetSlug || data.id === targetSlug;
            });
            if (foundDoc) {
              const data = foundDoc.data();
              const rawImgs = Array.isArray(data.images) && data.images.length > 0
                ? data.images
                : [data.image_url || data.image || defaultImages[0]];

              const imgList: ProductImage[] = rawImgs.map((imgUrl: string, idx: number) => ({
                id: `img-${idx}`,
                image_url: imgUrl,
                is_primary: idx === 0,
                sort_order: idx
              }));

              const formatted: Product = {
                id: foundDoc.id,
                name: data.title || data.name || "Product",
                slug: data.slug || targetSlug,
                short_description: data.short_description || data.shortDescription || null,
                description: data.description || "High quality product.",
                regular_price: Number(data.regular_price || data.price || 0),
                discount_price: data.discount_price ? Number(data.discount_price) : null,
                stock_quantity: Number(data.stock_quantity ?? data.stock ?? 50),
                free_shipping: true,
                rating_average: Number(data.rating_average || 4.8),
                rating_count: Number(data.rating_count || 15),
                sold_count: Number(data.sold_count || 40),
                is_featured: Boolean(data.is_featured || data.isFeatured),
                warranty_info: data.warranty_info || null,
                return_policy: data.return_policy || null,
                color: data.color || null,
                video_url: data.video_url || null,
                product_images: imgList,
                product_variants: [],
                category_id: data.category_id || data.category || null,
                seller_id: data.seller_id || "Admin"
              };
              setProduct(formatted);
              setSelectedImage(0);
              trackView(formatted.id);
              setLoading(false);
              return;
            }
          }
        } catch (fsErr) {
          console.warn("Firestore product lookup warning:", fsErr);
        }

        // 5. Direct Supplier API Fallback
        const searchId = extractedId || cleanId;
        if (searchId) {
          try {
            const apiUrl = "/api/mohasagor/api/reseller/product";
            const res = await fetch(apiUrl, {
              headers: {
                "api-key": "A8niclztH9JtzS4t",
                "secret-key": "2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8"
              }
            });

            if (res.ok) {
              const responseData = await res.json();
              const rawProducts = responseData.products || (Array.isArray(responseData) ? responseData : []);
              const found = rawProducts.find((p: any) => 
                p.id == searchId || 
                p.product_code == searchId || 
                p.id == cleanId ||
                (p.name && targetLower.includes(p.name.toLowerCase().slice(0, 15)))
              );
              
              if (found) {
                const mappedImages = mapSupplierImages(found);
                const mappedProduct = mapSupplierProduct(found, targetSlug, mappedImages);
                setProduct(mappedProduct);
                trackView(mappedProduct.id);
                setLoading(false);
                return;
              }
            }
          } catch (apiErr) {
            console.error("Error fetching Mohasagor product detail API fallback:", apiErr);
          }
        }
      } catch (err) {
        console.error("ProductDetail catch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [slug, trackView]);
  const handleAddToCart = async () => {
    if (!product) return;
    
    // Check if there are variants and they haven't all been selected
    if (product.product_variants && product.product_variants.length > 0) {
       // Group variants by attribute to check if all attributes have a selection
       const attributes = Array.from(new Set(product.product_variants.map(v => v.attribute)));
       const unselected = attributes.filter(attr => !selectedVariants[attr]);
       if (unselected.length > 0) {
         toast({
           title: "Selection Required",
           description: `Please select: ${unselected.join(", ")}`,
           variant: "destructive"
         });
         return;
       }
    }

    setAddingToCart(true);
    await addToCart(product.id, quantity, selectedVariants);
    setAddingToCart(false);
  };
  const handleBuyNow = async () => {
    if (!product) return;
    
    if (product.product_variants && product.product_variants.length > 0) {
       const attributes = Array.from(new Set(product.product_variants.map(v => v.attribute)));
       const unselected = attributes.filter(attr => !selectedVariants[attr]);
       if (unselected.length > 0) {
         toast({
           title: "Selection Required",
           description: `Please select: ${unselected.join(", ")}`,
           variant: "destructive"
         });
         return;
       }
    }

    setBuyingNow(true);
    await addToCart(product.id, quantity, selectedVariants);
    setBuyingNow(false);
    navigate("/checkout");
  };
  const handleWishlistToggle = () => {
    if (!product) return;
    toggleWishlist(product.id);
  };
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          url: window.location.href
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Product link copied to clipboard"
      });
    }
  };

  const { user: authUser } = useAuth();
  const [contactingSeller, setContactingSeller] = useState(false);

  const handleContactSeller = async () => {
    if (!authUser) {
      toast({ title: "Please login", description: "You need to login to chat with support", variant: "destructive" });
      navigate("/login");
      return;
    }
    setContactingSeller(true);
    try {
      const targetSellerId = product?.seller_id || "admin";
      const targetProductId = product?.id || null;
      const convId = `conv-${authUser.id}-${targetSellerId}${targetProductId ? `-${targetProductId}` : ''}`;
      const nowIso = new Date().toISOString();

      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("id", convId)
        .maybeSingle();

      if (existing?.id) {
        navigate(`/messages/${existing.id}`);
      } else {
        await supabase
          .from("conversations")
          .insert({
            id: convId,
            buyer_id: authUser.id,
            seller_id: targetSellerId,
            product_id: targetProductId,
            last_message_at: nowIso,
            last_message: `Inquiry about: ${product?.name || "Product"}`,
            seller_unread_count: 1,
            buyer_unread_count: 0,
            created_at: nowIso
          });

        await supabase
          .from("messages")
          .insert({
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            conversation_id: convId,
            sender_id: authUser.id,
            sender_type: "buyer",
            content: `Hi, I am inquiring about "${product?.name || "this product"}".`,
            created_at: nowIso,
            is_read: false
          });

        navigate(`/messages/${convId}`);
      }
    } catch (err) {
      console.error("Error contacting support:", err);
      toast({ title: "Error", description: "Could not start chat", variant: "destructive" });
    } finally {
      setContactingSeller(false);
    }
  };

  const inWishlist = product ? isInWishlist(product.id) : false;
  if (loading) {
    return <div className="min-h-screen flex flex-col bg-background">
        <div className="hidden md:block"><Header /></div>
        <MobileProductTopBar />
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
      </div>;
  }
  if (!product) {
    return <div className="min-h-screen flex flex-col bg-background">
        <div className="hidden md:block"><Header /></div>
        <MobileProductTopBar />
        <main className="flex-1 container py-8 pb-20 md:pb-8">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-foreground mb-4">Product Not Found</h1>
            <p className="text-muted-foreground mb-6">The product you're looking for doesn't exist.</p>
            <Link to="/">
              <Button size="lg">Back to Home</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>;
  }
  const price = product.discount_price || product.regular_price;
  const discount = product.discount_price ? Math.round((1 - product.discount_price / product.regular_price) * 100) : 0;
  return <div className="min-h-screen flex flex-col bg-background">
      <div className="hidden md:block"><Header /></div>
      <MobileProductTopBar />

      <main className="flex-1 pb-40 md:pb-8 w-full max-w-full overflow-hidden">
        <div className="container py-4 sm:py-8 w-full max-w-full">
          {/* Breadcrumb - Hidden on mobile */}
          <nav className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground mb-6 max-w-full overflow-hidden">
            <Link to="/" className="hover:text-primary shrink-0">Home</Link>
            <span>/</span>
            <Link to="/products" className="hover:text-primary shrink-0">Products</Link>
            <span>/</span>
            <span className="text-foreground line-clamp-1 truncate">{product.name}</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 w-full max-w-full min-w-0">
            {/* Product Images Section */}
            <div className="w-full max-w-full min-w-0">
              {/* Main Image with clean, premium presentation */}
              <div className="flex justify-center mb-4 w-full max-w-full">
                <div className="relative w-full max-w-full sm:max-w-[480px] lg:max-w-[540px]">
                  <div
                    ref={imageContainerRef}
                    className="relative aspect-square w-full rounded-2xl overflow-hidden bg-neutral-50/80 dark:bg-card border border-border/70 shadow-sm cursor-zoom-in group flex items-center justify-center"
                    onClick={() => !showVideo && setLightboxOpen(true)}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    {showVideo && product.video_url ? (
                      getYouTubeEmbedUrl(product.video_url) ? (
                        <iframe
                          src={getYouTubeEmbedUrl(product.video_url) || ''}
                          title="Product Video"
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video src={product.video_url} controls className="w-full h-full object-contain object-center bg-black/5" playsInline />
                      )
                    ) : (
                      <img
                        src={images[selectedImage]}
                        alt={product.name}
                        className="w-full h-full object-contain object-center transition-transform duration-300 group-hover:scale-105 select-none"
                        loading="eager"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = defaultImages[0];
                        }}
                      />
                    )}

                    {/* Tap to Zoom Badge */}
                    {!showVideo && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
                        className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-semibold shadow-lg hover:bg-primary transition-all hover:scale-105 z-10"
                      >
                        <ZoomIn className="h-3.5 w-3.5" /> Tap to Zoom
                      </button>
                    )}

                    {/* Featured badge */}
                    {product.is_featured && (
                      <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-warning to-primary text-white text-xs font-bold shadow-md z-10">
                        <Sparkles className="h-3 w-3" />
                        FEATURED
                      </div>
                    )}

                    {/* Image Counter Badge */}
                    <div className="absolute top-3 right-14 sm:right-16 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-white text-xs font-bold shadow-md z-10">
                      {selectedImage + 1} / {(product as any).video_url ? images.length + 1 : images.length}
                    </div>

                    {/* Image navigation arrows */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(Math.max(0, selectedImage - 1));
                        setShowVideo(false);
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 dark:bg-card/90 backdrop-blur shadow-md flex items-center justify-center opacity-0 sm:opacity-100 hover:bg-primary hover:text-white transition-all disabled:opacity-0 z-10"
                      disabled={selectedImage === 0}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const totalImages = (product as any)?.video_url ? images.length : images.length - 1;
                        if (selectedImage < totalImages) {
                          setSelectedImage(selectedImage + 1);
                          if (selectedImage === images.length - 1 && (product as any)?.video_url) {
                            setShowVideo(true);
                          }
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 dark:bg-card/90 backdrop-blur shadow-md flex items-center justify-center opacity-0 sm:opacity-100 hover:bg-primary hover:text-white transition-all z-10"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>

                    {/* Share button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleShare(); }}
                      className="absolute top-3 right-3 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 dark:bg-card/90 backdrop-blur shadow-md flex items-center justify-center hover:bg-primary hover:text-white transition-all z-10"
                      aria-label="Share"
                    >
                      <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>

                    {/* Image indicator dots */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 sm:hidden z-10 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full">
                      {images.map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all ${selectedImage === i && !showVideo ? 'bg-white w-5' : 'bg-white/50 w-1.5'}`} />
                      ))}
                      {product.video_url && <div className={`h-1.5 rounded-full transition-all ${showVideo ? 'bg-white w-5' : 'bg-white/50 w-1.5'}`} />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Thumbnail strip */}
              <div className="flex gap-2 sm:gap-3 justify-start sm:justify-center overflow-x-auto py-2 px-1 scrollbar-hide w-full max-w-full">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedImage(i);
                      setShowVideo(false);
                    }}
                    className={`w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 bg-neutral-50/80 dark:bg-card hover:scale-105 ${
                      selectedImage === i && !showVideo
                        ? 'border-primary ring-2 ring-primary/30 shadow-md shadow-primary/10 scale-105'
                        : 'border-border/60 hover:border-primary/50 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-200"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = defaultImages[0];
                      }}
                    />
                  </button>
                ))}
                {/* Video thumbnail */}
                {product.video_url && (
                  <button
                    onClick={() => setShowVideo(true)}
                    className={`w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-xl overflow-hidden border-2 transition-all flex items-center justify-center bg-muted flex-shrink-0 relative hover:scale-105 ${
                      showVideo ? 'border-primary ring-2 ring-primary/30 shadow-md scale-105' : 'border-border/60 hover:border-primary/50 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                      <Play className="h-5 w-5 sm:h-7 sm:w-7 text-white fill-white" />
                    </div>
                    {getYouTubeEmbedUrl(product.video_url) ? (
                      <img
                        src={`https://img.youtube.com/vi/${product.video_url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1]}/mqdefault.jpg`}
                        alt="Video thumbnail"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video src={product.video_url} className="w-full h-full object-cover" muted playsInline />
                    )}
                  </button>
                )}
              </div>
            </div>


            {/* Product Info */}
            <div className="w-full max-w-full min-w-0 space-y-5 sm:space-y-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {product.is_featured && (
                    <Badge className="bg-gradient-to-r from-warning to-primary text-white border-0 gap-1">
                      <Sparkles className="h-3 w-3" /> Best Seller
                    </Badge>
                  )}
                  {product.sold_count > 100 && (
                    <Badge variant="outline" className="border-primary/30 text-primary gap-1">
                      <TrendingUp className="h-3 w-3" /> Trending
                    </Badge>
                  )}
                  <Badge variant="outline" className="border-success/30 text-success gap-1">
                    <ShieldCheck className="h-3 w-3" /> Authentic
                  </Badge>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 leading-tight tracking-tight">
                  {product.name}
                </h1>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm">
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-warning/10">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    <span className="text-foreground font-semibold">
                      {product.rating_average.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground">
                      ({product.rating_count})
                    </span>
                  </div>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" />
                    {product.sold_count.toLocaleString()} sold
                  </span>
                </div>
              </div>

              {/* Premium price card */}
              <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-primary/10 via-warning/5 to-primary/5 border border-primary/20">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative flex items-baseline gap-3 flex-wrap">
                  <span className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-primary to-warning bg-clip-text text-transparent">
                    ৳{price.toLocaleString()}
                  </span>
                  {discount > 0 && (
                    <>
                      <span className="text-lg sm:text-xl text-muted-foreground line-through">
                        ৳{product.regular_price.toLocaleString()}
                      </span>
                      <Badge variant="destructive" className="bg-sale text-base font-bold">-{discount}%</Badge>
                    </>
                  )}
                </div>
                {discount > 0 && (
                  <p className="relative mt-2 text-sm text-success font-medium flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    You save ৳{(product.regular_price - price).toLocaleString()}
                  </p>
                )}
                {product.free_shipping && (
                  <div className="relative mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    <Truck className="h-3.5 w-3.5" /> Free Shipping
                  </div>
                )}
              </div>

              {/* Product Color */}
              {(product as any).color && <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Color:</span>
                  <div className="w-8 h-8 rounded-full border-2 border-border shadow-sm" style={{
                backgroundColor: (product as any).color
              }} title={(product as any).color} />
                  <span className="text-sm text-muted-foreground">{(product as any).color}</span>
                </div>}

              {/* Product Variants (Color, Size, etc.) */}
              {product.product_variants && product.product_variants.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  {Array.from(new Set(product.product_variants.map(v => v.attribute))).map(attribute => {
                    const variantsForAttr = product.product_variants!.filter(v => v.attribute === attribute);
                    return (
                      <div key={attribute}>
                        <h4 className="text-sm font-medium mb-2">{attribute}: <span className="text-muted-foreground">{selectedVariants[attribute] || 'Select one'}</span></h4>
                        <div className="flex flex-wrap gap-2">
                          {variantsForAttr.map((variant, idx) => (
                            <button
                              key={variant.id}
                              onClick={() => {
                                setSelectedVariants(prev => ({ ...prev, [attribute]: variant.variant }));
                                if (idx < images.length) {
                                  setSelectedImage(idx);
                                  setShowVideo(false);
                                }
                              }}
                              className={`px-4 py-2 border rounded-xl text-sm font-medium transition-all shadow-sm
                                ${selectedVariants[attribute] === variant.variant 
                                  ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/40 scale-105 font-bold shadow-md' 
                                  : 'border-muted hover:border-primary/50 text-muted-foreground hover:text-foreground'}`}
                            >
                              {variant.variant}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quantity & Add to Cart */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">Quantity:</span>
                  {product.stock_quantity > 1 ? (
                    <>
                      <div className="flex items-center border-2 border-primary/20 rounded-xl overflow-hidden bg-background">
                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} className="p-3 hover:bg-primary hover:text-white transition-colors touch-manipulation disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit">
                          <Minus className="h-5 w-5" />
                        </button>
                        <span className="px-6 font-bold text-lg">{quantity}</span>
                        <button onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))} disabled={quantity >= product.stock_quantity} className="p-3 hover:bg-primary hover:text-white transition-colors touch-manipulation disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit">
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {product.stock_quantity} available
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-success">
                      Only 1 left in stock
                    </span>
                  )}
                </div>



                {/* Desktop buttons */}
                <div className="hidden sm:flex gap-3">
                  <Button size="lg" variant="outline" className="flex-1 h-14 text-lg border-2 border-primary/30 hover:border-primary hover:bg-primary/5" onClick={handleAddToCart} disabled={addingToCart}>
                    {addingToCart ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <ShoppingCart className="h-5 w-5 mr-2" />}
                    Add to Cart
                  </Button>
                  <Button size="lg" className="flex-1 h-14 text-lg bg-gradient-to-r from-primary to-warning hover:opacity-90 shadow-lg shadow-primary/30" onClick={handleBuyNow} disabled={buyingNow}>
                    {buyingNow ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Zap className="h-5 w-5 mr-2" />}
                    Buy Now
                  </Button>
                  <Button size="lg" variant={inWishlist ? "default" : "outline"} className="h-14 w-14" onClick={handleWishlistToggle}>
                    <Heart className={`h-6 w-6 ${inWishlist ? "fill-current" : ""}`} />
                  </Button>
                </div>
              </div>

              {/* Trust badges - 4 icons */}
              <div className="grid grid-cols-4 gap-2 sm:gap-3 pt-4 border-t">
                <div className="flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-xl bg-muted/40 hover:bg-primary/5 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-center">Secure Pay</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-xl bg-muted/40 hover:bg-primary/5 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <RotateCcw className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-center">Easy Return</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-xl bg-muted/40 hover:bg-primary/5 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Truck className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-center">Fast Delivery</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-xl bg-muted/40 hover:bg-primary/5 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Award className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-center">Warranty</span>
                </div>
              </div>


              {/* Inline Store Info + Chat */}
              {product.seller_id ? (
                <InlineStoreBar 
                  sellerId={product.seller_id}
                  onContactSeller={handleContactSeller}
                  contactingSeller={contactingSeller}
                />
              ) : (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border mt-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground">Durtup Official</span>
                      <ShieldCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    </div>
                    <span className="text-xs text-muted-foreground">Official Store</span>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5 flex-shrink-0" onClick={handleContactSeller} disabled={contactingSeller}>
                    {contactingSeller ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">Chat</span>
                  </Button>
                </div>
              )}

              {/* Description */}
              {product.description && (
                <div className="pt-5 border-t w-full max-w-full overflow-hidden">
                  <h3 className="font-bold text-base sm:text-lg text-foreground mb-3 flex items-center gap-2">
                    <span className="w-1 h-5 bg-gradient-to-b from-primary to-warning rounded-full" />
                    Description
                  </h3>
                  {/<[a-z][\s\S]*>/i.test(product.description) ? (
                    <div
                      className="product-description-content text-muted-foreground text-sm leading-relaxed prose prose-sm max-w-none break-words overflow-hidden w-full
                        [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg
                        [&_table]:w-full [&_table]:max-w-full [&_table]:table-auto [&_table]:border-collapse [&_table]:block [&_table]:overflow-x-auto
                        [&_td]:border [&_td]:border-border [&_td]:p-2 [&_td]:break-words
                        [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:break-words
                        [&_a]:text-primary [&_a]:underline [&_a]:break-all
                        [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                        [&_p]:break-words [&_p]:max-w-full [&_div]:max-w-full [&_span]:max-w-full"
                      dangerouslySetInnerHTML={{
                        __html: product.description
                          .replace(/&nbsp;/gi, " ")
                          .replace(/&amp;/gi, "&")
                          .replace(/&lt;/gi, "<")
                          .replace(/&gt;/gi, ">")
                          .replace(/&quot;/gi, '"')
                          .replace(/&#39;/gi, "'")
                          .replace(/width\s*:\s*\d{3,}px/gi, "width: 100%")
                          .replace(/min-width\s*:\s*\d{3,}px/gi, "min-width: 0px")
                          .replace(/width="[0-9]{3,}"/gi, 'width="100%"'),
                      }}
                    />
                  ) : (
                    <p className="product-description-content text-muted-foreground text-sm leading-relaxed whitespace-pre-line break-words overflow-hidden max-w-full">
                      {product.description
                        .replace(/&nbsp;/gi, " ")
                        .replace(/&amp;/gi, "&")
                        .replace(/&lt;/gi, "<")
                        .replace(/&gt;/gi, ">")
                        .replace(/&quot;/gi, '"')
                        .replace(/&#39;/gi, "'")}
                    </p>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Product Ratings & Reviews Section (Directly Below Description) */}
          <div className="mt-8 w-full max-w-full min-w-0">
            <ProductReviews
              productId={product.id}
              ratingAverage={product.rating_average}
              ratingCount={product.rating_count}
              productName={product.name}
            />
          </div>

          {/* Store Information */}
          <div className="mt-8 w-full max-w-full min-w-0">
            {product.seller_id ? (
              <StoreDetails
                sellerId={product.seller_id}
                onContactSeller={handleContactSeller}
                contactingSeller={contactingSeller}
              />
            ) : (
              <div className="bg-card rounded-2xl border p-4 sm:p-6 max-w-xl">
                <h3 className="text-lg font-bold text-foreground mb-4">Store Information</h3>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center flex-shrink-0">
                    <Store className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground text-base">Durtup Official</h4>
                      <ShieldCheck className="h-4 w-4 text-primary flex-shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground">Official Store</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-3 bg-muted/50 rounded-xl">
                    <Star className="h-4 w-4 mx-auto text-warning mb-1" />
                    <p className="text-sm font-semibold text-foreground">5.0</p>
                    <p className="text-xs text-muted-foreground">Rating</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-xl">
                    <Shield className="h-4 w-4 mx-auto text-primary mb-1" />
                    <p className="text-sm font-semibold text-foreground">100%</p>
                    <p className="text-xs text-muted-foreground">Authentic</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-xl">
                    <RotateCcw className="h-4 w-4 mx-auto text-primary mb-1" />
                    <p className="text-sm font-semibold text-foreground">Easy</p>
                    <p className="text-xs text-muted-foreground">Returns</p>
                  </div>
                </div>
                <Button className="w-full gap-2" onClick={handleContactSeller} disabled={contactingSeller}>
                  {contactingSeller ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                  Chat with Store
                </Button>
              </div>
            )}
          </div>

          {/* Related Products - Full width below product grid */}
          <div className="w-full max-w-full min-w-0">
            <RelatedProducts 
              product={{
                id: product.id,
                name: product.name,
                category_id: product.category_id,
                brand_id: product.brand_id,
                regular_price: product.regular_price,
                discount_price: product.discount_price,
                tags: product.tags,
              }}
              title="For You"
              subtitle="Recommended items for you"
              limit={12}
            />
          </div>
        </div>

        {/* Mobile sticky bottom bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-3 pt-2.5 max-w-[100vw] overflow-hidden" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
          <div className="flex items-center gap-2 max-w-lg mx-auto w-full">
            <Button
              variant={inWishlist ? "default" : "outline"}
              className="h-11 w-11 shrink-0 p-0 rounded-xl"
              onClick={handleWishlistToggle}
              aria-label="Wishlist"
            >
              <Heart className={`h-5 w-5 ${inWishlist ? "fill-current" : ""}`} />
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11 px-2 sm:px-4 text-xs sm:text-sm font-semibold rounded-xl min-w-0"
              onClick={handleAddToCart}
              disabled={addingToCart}
            >
              {addingToCart ? <Loader2 className="h-4 w-4 mr-1 animate-spin shrink-0" /> : <ShoppingCart className="h-4 w-4 mr-1 shrink-0" />}
              <span className="truncate">Cart</span>
            </Button>
            <Button
              className="flex-1 h-11 px-2 sm:px-4 text-xs sm:text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 min-w-0"
              onClick={handleBuyNow}
              disabled={buyingNow}
            >
              {buyingNow ? <Loader2 className="h-4 w-4 mr-1 animate-spin shrink-0" /> : <Zap className="h-4 w-4 mr-1 shrink-0" />}
              <span className="truncate">Buy Now</span>
            </Button>
          </div>
        </div>
      </main>
      {/* Interactive Fullscreen Image Lightbox Zoom Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Header Bar */}
          <div className="flex items-center justify-between text-white z-10 max-w-7xl mx-auto w-full">
            <span className="text-sm font-semibold tracking-wide bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
              {selectedImage + 1} / {images.length} • {product.name}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setZoomScale((s) => (s >= 2.5 ? 1 : s + 0.75))}
                className="p-2.5 rounded-full bg-white/10 hover:bg-primary transition-all text-white hover:scale-110"
                title="Toggle Zoom"
              >
                {zoomScale > 1 ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
              </button>
              <button
                onClick={() => { setLightboxOpen(false); setZoomScale(1); }}
                className="p-2.5 rounded-full bg-white/10 hover:bg-destructive transition-all text-white hover:scale-110"
                title="Close"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Main Zoomed Image Container */}
          <div 
            className="relative flex-1 flex items-center justify-center overflow-hidden my-4"
            onClick={() => setZoomScale((s) => (s >= 2.5 ? 1 : s + 0.75))}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage((prev) => Math.max(0, prev - 1));
                setZoomScale(1);
              }}
              disabled={selectedImage === 0}
              className="absolute left-2 sm:left-6 z-10 p-3.5 rounded-full bg-black/70 text-white hover:bg-primary disabled:opacity-20 transition-all hover:scale-110 shadow-2xl"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>

            <img
              src={images[selectedImage]}
              alt={product.name}
              style={{ transform: `scale(${zoomScale})` }}
              className="max-h-[78vh] max-w-[92vw] object-contain transition-transform duration-300 cursor-zoom-in drop-shadow-2xl"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = defaultImages[0]; }}
            />

            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage((prev) => Math.min(images.length - 1, prev + 1));
                setZoomScale(1);
              }}
              disabled={selectedImage === images.length - 1}
              className="absolute right-2 sm:right-6 z-10 p-3.5 rounded-full bg-black/70 text-white hover:bg-primary disabled:opacity-20 transition-all hover:scale-110 shadow-2xl"
            >
              <ChevronRight className="h-7 w-7" />
            </button>
          </div>

          {/* Modal Thumbnail Strip */}
          <div className="flex justify-center gap-3 overflow-x-auto py-2 z-10 max-w-7xl mx-auto w-full">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => { setSelectedImage(i); setZoomScale(1); }}
                className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                  selectedImage === i ? "border-primary ring-2 ring-primary/60 scale-105 shadow-xl" : "border-white/20 opacity-60 hover:opacity-100"
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
      <Footer />
    </div>;
}
