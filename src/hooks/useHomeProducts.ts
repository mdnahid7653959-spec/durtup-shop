import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/firebaseAdapter";
import type { Product } from "@/components/products/ProductCard";

const defaultImages = [
  "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1560472355-536de3962603?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop",
];

const fallbackProducts: Product[] = [
  {
    id: "fp-1",
    name: "Wireless Bluetooth Earbuds Pro with Active Noise Cancellation",
    slug: "wireless-bluetooth-earbuds-pro",
    image: defaultImages[0],
    price: 29.99,
    originalPrice: 59.99,
    rating: 4.8,
    reviews: 124,
    sold: 1420,
    freeShipping: true,
    isNew: true,
    isBestSeller: true,
  },
  {
    id: "fp-2",
    name: "Smart Watch Series 8 with Heart Rate Monitor GPS Fitness Tracker",
    slug: "smart-watch-series-8",
    image: defaultImages[1],
    price: 69.99,
    originalPrice: 119.99,
    rating: 4.9,
    reviews: 289,
    sold: 2150,
    freeShipping: true,
    isNew: false,
    isBestSeller: true,
  },
  {
    id: "fp-3",
    name: "Portable Power Bank 20000mAh Fast Charging USB-C",
    slug: "portable-power-bank-20000mah",
    image: defaultImages[2],
    price: 24.99,
    originalPrice: 39.99,
    rating: 4.7,
    reviews: 88,
    sold: 980,
    freeShipping: false,
    isNew: true,
    isBestSeller: false,
  },
  {
    id: "fp-4",
    name: "Mechanical Gaming Keyboard RGB Backlit with Hot-Swappable Switches",
    slug: "mechanical-gaming-keyboard-rgb",
    image: defaultImages[3],
    price: 49.99,
    originalPrice: 89.99,
    rating: 4.8,
    reviews: 156,
    sold: 840,
    freeShipping: true,
    isNew: false,
    isBestSeller: true,
  },
  {
    id: "fp-5",
    name: "Wireless Gaming Mouse 16000 DPI RGB Ergonomic Design",
    slug: "wireless-gaming-mouse-16000-dpi",
    image: defaultImages[4],
    price: 19.99,
    originalPrice: 34.99,
    rating: 4.6,
    reviews: 95,
    sold: 630,
    freeShipping: true,
    isNew: true,
    isBestSeller: false,
  },
  {
    id: "fp-6",
    name: "4K Ultra HD Webcam with Built-in Dual Microphones for Streaming",
    slug: "4k-ultra-hd-webcam-streaming",
    image: defaultImages[5],
    price: 39.99,
    originalPrice: 79.99,
    rating: 4.9,
    reviews: 210,
    sold: 1100,
    freeShipping: true,
    isNew: false,
    isBestSeller: true,
  },
];

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
  is_featured: boolean | null;
  is_flash_sale: boolean | null;
  product_images?: { image_url: string; is_primary: boolean | null }[];
}

import { getSmartProductImage } from "@/utils/productImageHelper";

function mapDbProduct(p: ProductWithImages, index: number): Product {
  const primaryImage = p.product_images?.find((img) => img.is_primary)?.image_url;
  const firstImage = p.product_images?.[0]?.image_url;
  const rawImage = primaryImage || firstImage;
  const image = getSmartProductImage(p.name, rawImage, "", index);

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    image,
    price: p.discount_price || p.regular_price,
    originalPrice: p.discount_price ? p.regular_price : undefined,
    rating: Number(p.rating_average) || 4.7,
    reviews: p.rating_count || 15,
    sold: p.sold_count || 45,
    freeShipping: p.free_shipping ?? true,
    isNew: p.is_new_arrival ?? false,
    isBestSeller: p.is_best_seller ?? false,
  };
}

function mapSupplierProduct(p: any, index: number): Product {
  const base = "https://mohasagor.com.bd";
  const resolveUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("//")) return url;
    return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
  };

  // Get the best image available
  const firstImage = p.product_images && p.product_images.length > 0
    ? resolveUrl(p.product_images[0].product_image)
    : p.thumbnail_img ? resolveUrl(p.thumbnail_img) : null;

  const image = getSmartProductImage(p.name, firstImage || undefined, p.category || "", index);

  let price = 0;
  let originalPrice: number | undefined = undefined;

  if (p.discount_price !== undefined || p.originalPrice !== undefined) {
    price = Number(p.discount_price || p.price || 0);
    originalPrice = p.originalPrice || p.regular_price ? Number(p.originalPrice || p.regular_price) : undefined;
  } else {
    // Exact direct API prices without markup
    const rawSalePrice = parseFloat(p.sale_price) || parseFloat(p.discount_price) || 0;
    const rawPrice = parseFloat(p.price) || parseFloat(p.regular_price) || 0;
    
    if (rawSalePrice > 0 && rawPrice > 0 && rawPrice > rawSalePrice) {
      price = rawSalePrice;
      originalPrice = rawPrice;
    } else if (rawSalePrice > 0) {
      price = rawSalePrice;
      originalPrice = rawPrice > 0 ? rawPrice : undefined;
    } else if (rawPrice > 0) {
      price = rawPrice;
      originalPrice = undefined;
    } else {
      price = parseFloat(p.price) || 0;
    }
  }

  return {
    id: p.id.toString(),
    name: p.name,
    slug: p.slug || `product-${p.id}`,
    image,
    price,
    originalPrice: (originalPrice && originalPrice > price) ? originalPrice : undefined,
    rating: 4.8,
    reviews: 15,
    sold: parseInt(p.sold) || 45,
    freeShipping: true,
    isNew: index < 12,
    isBestSeller: index % 5 === 0,
  };
}

function buildSections(products: Product[]) {
  // 5-Minute Time Block Rotation Seed (changes automatically every 300,000ms)
  const timeBlock = Math.floor(Date.now() / (5 * 60 * 1000));
  const total = products.length;

  if (total > 0) {
    const shift = (timeBlock * 6) % total;
    const rotated = [...products.slice(shift), ...products.slice(0, shift)];

    // Deduplicate so that once a product is assigned to a section, it is excluded from others
    const assignedIds = new Set<string>();
    const getUniqueSlice = (count: number): Product[] => {
      const slice: Product[] = [];
      for (const p of rotated) {
        if (slice.length >= count) break;
        if (!assignedIds.has(p.id)) {
          assignedIds.add(p.id);
          slice.push(p);
        }
      }
      return slice;
    };

    const latestProducts = getUniqueSlice(12);
    const flashSale = getUniqueSlice(6).map(p => ({ ...p, is_flash_sale: true }));
    const featured = getUniqueSlice(12).map(p => ({ ...p, is_featured: true }));
    const newArrivals = getUniqueSlice(12);
    const trending = getUniqueSlice(6);
    const recommended = getUniqueSlice(12);

    return {
      latestProducts,
      flashSale,
      featured,
      newArrivals,
      trending,
      recommended,
    };
  }

  const assignedIds = new Set<string>();
  const getUniqueSlice = (arr: Product[], count: number): Product[] => {
    const slice: Product[] = [];
    for (const p of arr) {
      if (slice.length >= count) break;
      if (!assignedIds.has(p.id)) {
        assignedIds.add(p.id);
        slice.push(p);
      }
    }
    return slice;
  };

  return {
    latestProducts: getUniqueSlice(products, 12),
    flashSale: getUniqueSlice(products, 6).map(p => ({ ...p, is_flash_sale: true })),
    featured: getUniqueSlice(products, 12).map(p => ({ ...p, is_featured: true })),
    newArrivals: getUniqueSlice(products, 12),
    trending: getUniqueSlice(products, 6),
    recommended: getUniqueSlice(products, 12),
  };
}

const CACHE_KEY = "mohasagor_cached_home_products_v4";

function preloadImages(products: Product[]) {
  if (typeof window === "undefined") return;
  products.slice(0, 12).forEach(p => {
    if (p.image) {
      const img = new Image();
      img.src = p.image;
    }
  });
}

function getInitialCachedProducts() {
  if (typeof window === "undefined") return undefined;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.latestProducts?.length) {
        preloadImages(parsed.latestProducts);
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to load cached home products", e);
  }
  return undefined;
}

async function fetchAllHomeProducts() {
  // ── Strategy 0: Admin Created Products merge helper ──
  let adminCreatedProducts: Product[] = [];
  try {
    const raw = localStorage.getItem("enterprise_admin_products") || localStorage.getItem("local_products");
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        adminCreatedProducts = list.map((p: any, index: number) => ({
          id: p.id || `admin-prod-${index}`,
          name: p.title || p.name || "Untitled Product",
          slug: p.slug || `prod-${index}`,
          image: p.image_url || p.images?.[0] || defaultImages[index % defaultImages.length],
          price: Number(p.discount_price || p.regular_price || p.price || 0),
          originalPrice: p.discount_price ? Number(p.regular_price || p.price) : undefined,
          rating: 4.9,
          reviews: 20,
          sold: 50,
          freeShipping: true,
          isNew: true,
          isBestSeller: true,
        }));
      }
    }
  } catch {}

  // ── Strategy 1: Fetch from local DB (synced products + images) ──
  try {
    const { data: dbProducts, error: dbError } = await supabase
      .from("products")
      .select(`
        id, name, slug, regular_price, discount_price,
        rating_average, rating_count, sold_count,
        free_shipping, is_new_arrival, is_best_seller, is_featured, is_flash_sale,
        product_images ( image_url, is_primary )
      `)
      .order("created_at", { ascending: false })
      .limit(60);

    if (!dbError && dbProducts && dbProducts.length > 0) {
      const mapped = (dbProducts as ProductWithImages[]).map(mapDbProduct);
      const merged = [
        ...adminCreatedProducts,
        ...mapped.filter(m => !adminCreatedProducts.some(ap => ap.id === m.id))
      ];
      const result = buildSections(merged);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(result));
      } catch (e) {}
      preloadImages(result.latestProducts);
      return result;
    }
  } catch (dbErr) {
    console.warn("[useHomeProducts] DB fetch failed, trying live API:", dbErr);
  }

  // ── Strategy 2: Fetch directly from live supplier API (Mohasagor API) ──
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
      if (Array.isArray(rawProducts) && rawProducts.length > 0) {
        const mapped = rawProducts.map(mapSupplierProduct);
        const merged = [
          ...adminCreatedProducts,
          ...mapped.filter(m => !adminCreatedProducts.some(ap => ap.id === m.id))
        ];
        const result = buildSections(merged);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(result));
        } catch (e) {}
        preloadImages(result.latestProducts);
        return result;
      }
    }
  } catch (err) {
    console.warn("[useHomeProducts] Error fetching from Mohasagor API:", err);
  }

  // ── Strategy 3: Mohasagor Supplier Master Cache Fallback ──
  try {
    const { getCachedMohasagorProducts } = await import("@/utils/mohasagorCache");
    const cachedMohasagor = await getCachedMohasagorProducts();
    if (cachedMohasagor && cachedMohasagor.length > 0) {
      const merged = [
        ...adminCreatedProducts,
        ...cachedMohasagor.filter(m => !adminCreatedProducts.some(ap => ap.id === m.id))
      ];
      const result = buildSections(merged);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(result));
      } catch (e) {}
      preloadImages(result.latestProducts);
      return result;
    }
  } catch (cachedErr) {
    console.warn("[useHomeProducts] Supplier cache fallback warning:", cachedErr);
  }

  // ── Strategy 4: Hardcoded fallback ──
  const mergedFallback = [
    ...adminCreatedProducts,
    ...fallbackProducts.filter(m => !adminCreatedProducts.some(ap => ap.id === m.id))
  ];
  return buildSections(mergedFallback);
}


export function useHomeProducts() {
  const current10MinBlock = Math.floor(Date.now() / (10 * 60 * 1000));

  return useQuery({
    queryKey: ["home-products", current10MinBlock],
    queryFn: fetchAllHomeProducts,
    initialData: getInitialCachedProducts,
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    refetchInterval: 10 * 60 * 1000, // Auto-rotate and fetch fresh unique products every 10 minutes!
    refetchIntervalInBackground: true,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
}
