import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/firebaseAdapter";
import type { Product } from "@/components/products/ProductCard";
import { calculateProductPrice } from "@/utils/pricingMargin";

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

import { getSmartProductImage, prefetchProductImages } from "@/utils/productImageHelper";

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
  const resolveUrl = (url: any): string => {
    if (!url || typeof url !== "string") return "";
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
      return trimmed;
    }
    if (trimmed.startsWith("//")) return `https:${trimmed}`;
    return trimmed.startsWith("/") ? `${base}${trimmed}` : `${base}/${trimmed}`;
  };

  // Get the best image available from all potential properties
  let rawFirstImg = "";
  if (p.image && typeof p.image === "string") rawFirstImg = resolveUrl(p.image);
  else if (p.thumbnail_img && typeof p.thumbnail_img === "string") rawFirstImg = resolveUrl(p.thumbnail_img);
  else if (p.thumbnail && typeof p.thumbnail === "string") rawFirstImg = resolveUrl(p.thumbnail);
  else if (p.image_url && typeof p.image_url === "string") rawFirstImg = resolveUrl(p.image_url);
  else if (Array.isArray(p.product_images) && p.product_images.length > 0) {
    const first = p.product_images[0];
    rawFirstImg = typeof first === "string" ? resolveUrl(first) : resolveUrl(first?.product_image || first?.image_url || first?.image || first?.url);
  } else if (Array.isArray(p.images) && p.images.length > 0) {
    const first = p.images[0];
    rawFirstImg = typeof first === "string" ? resolveUrl(first) : resolveUrl(first?.image_url || first?.image || first?.url);
  }

  const image = getSmartProductImage(p.name, rawFirstImg || undefined, p.category || "", index);

  let price = 0;
  let originalPrice: number | undefined = undefined;

  if (p.discount_price !== undefined || p.originalPrice !== undefined) {
    price = Number(p.discount_price || p.price || 0);
    originalPrice = p.originalPrice || p.regular_price ? Number(p.originalPrice || p.regular_price) : undefined;
  } else {
    // Base supplier price from API (p.price or p.sale_price)
    const exactRetailPrice = parseFloat(p.price) || parseFloat(p.sale_price) || 0;
    const rawRegularPrice = parseFloat(p.regular_price) || 0;

    const calc = calculateProductPrice(exactRetailPrice, undefined, rawRegularPrice);
    price = calc.price;
    originalPrice = calc.originalPrice;
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

import { FAST_SEED_PRODUCTS } from "@/data/fastSeedCatalog";

const CACHE_KEY = "mohasagor_cached_home_products_v11";
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes 

function preloadImages(products: Product[]) {
  if (typeof window === "undefined" || !products) return;
  prefetchProductImages(products, 80);
}

function getInitialCachedProducts() {
  if (typeof window === "undefined") return buildSections(FAST_SEED_PRODUCTS);
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
  // Guaranteed Instant 0ms First-Paint fallback
  return buildSections(FAST_SEED_PRODUCTS);
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3500): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
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

  // ── Strategy 1: Fetch directly from live supplier API (Mohasagor API) with fast 3.5s timeout ──
  try {
    const apiUrl = "/api/mohasagor/api/reseller/product";
    const res = await fetchWithTimeout(apiUrl, {
      headers: {
        "api-key": "A8niclztH9JtzS4t",
        "secret-key": "2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8"
      }
    }, 3500);

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
    // API slow or offline, gracefully continue to local DB / master cache
  }

  // ── Strategy 2: Fetch from local DB (synced products + images) ──
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
    console.warn("[useHomeProducts] DB fetch fallback warning:", dbErr);
  }

  // ── Strategy 3: Mohasagor Fast Seed / Master Cache Fallback ──
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

  // ── Strategy 4: Instant Fast Seed Fallback ──
  const mergedFallback = [
    ...adminCreatedProducts,
    ...FAST_SEED_PRODUCTS.filter(m => !adminCreatedProducts.some(ap => ap.id === m.id))
  ];
  return buildSections(mergedFallback);
}

export function useHomeProducts() {
  const queryClient = useQueryClient();
  const current5MinBlock = Math.floor(Date.now() / (5 * 60 * 1000));

  useEffect(() => {
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["home-products"] });
    };
    window.addEventListener("mohasagor_products_updated", handleUpdate);
    return () => window.removeEventListener("mohasagor_products_updated", handleUpdate);
  }, [queryClient]);

  return useQuery({
    queryKey: ["home-products", current5MinBlock],
    queryFn: fetchAllHomeProducts,
    initialData: getInitialCachedProducts,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchInterval: 5 * 60 * 1000, // Auto-rotate and fetch fresh unique products every 5 minutes!
    refetchIntervalInBackground: true,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}
