import type { Product } from "@/components/products/ProductCard";

const MOHASAGOR_CACHE_KEY = "mohasagor_products_master_cache_v2";
const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes (300,000ms)

let inMemoryProductsCache: Product[] | null = null;
let isFetchingAllPages = false;
let autoSyncTimer: number | null = null;
let lastSyncTimestamp: number | null = null;

export function getLastSyncTime(): string | null {
  if (!lastSyncTimestamp) return null;
  return new Date(lastSyncTimestamp).toLocaleTimeString();
}

export const FALLBACK_SUPPLIER_PRODUCTS: Product[] = [
  { id: "supplier-101", name: "X-01 Full Charge Separator – Type-C Auto Power-Off Cable", slug: "product-101", image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=400&fit=crop", price: 490, originalPrice: 690, rating: 4.8, reviews: 34, sold: 120, freeShipping: true, category: "electronics" },
  { id: "supplier-102", name: "Rechargeable Dual Slot Battery Charger with LED Display", slug: "product-102", image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop", price: 160, originalPrice: 280, rating: 4.7, reviews: 22, sold: 85, freeShipping: true, category: "electronics" },
  { id: "supplier-103", name: "Apache Luminous RGB Gaming Mouse (Batmen Edition)", slug: "product-103", image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=400&fit=crop", price: 350, originalPrice: 750, rating: 4.9, reviews: 56, sold: 210, freeShipping: true, category: "electronics" },
  { id: "supplier-104", name: "Rechargeable Water Dispenser Pump | Automatic Electric Pump", slug: "product-104", image: "https://images.unsplash.com/photo-1585336261026-8f5786372966?w=400&h=400&fit=crop", price: 350, originalPrice: 780, rating: 4.6, reviews: 19, sold: 95, freeShipping: true, category: "home" },
  { id: "supplier-105", name: "Archer C6 AC1200 Wireless MU-MIMO Gigabit Router", slug: "product-105", image: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&h=400&fit=crop", price: 3190, originalPrice: 3500, rating: 4.9, reviews: 140, sold: 430, freeShipping: true, category: "electronics" },
  { id: "supplier-106", name: "Touch Lamp Portable Bluetooth Speaker with Wireless Charger", slug: "product-106", image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=400&h=400&fit=crop", price: 370, originalPrice: 699, rating: 4.8, reviews: 45, sold: 180, freeShipping: true, category: "electronics" },
  { id: "supplier-107", name: "Smart Fitness Watch with Heart Rate & Oxygen Monitor", slug: "product-107", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop", price: 1250, originalPrice: 1990, rating: 4.8, reviews: 88, sold: 340, freeShipping: true, category: "electronics" },
  { id: "supplier-108", name: "Ultra Quiet Mini Desk Fan with USB Rechargeable Battery", slug: "product-108", image: "https://images.unsplash.com/photo-1618944847828-82e943c3beb9?w=400&h=400&fit=crop", price: 420, originalPrice: 650, rating: 4.7, reviews: 31, sold: 140, freeShipping: true, category: "home" },
  { id: "supplier-109", name: "Stainless Steel Thermal Coffee Mug (500ml)", slug: "product-109", image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=400&fit=crop", price: 299, originalPrice: 499, rating: 4.9, reviews: 62, sold: 290, freeShipping: true, category: "home" },
  { id: "supplier-110", name: "Ergonomic Memory Foam Back Pillow Cushion", slug: "product-110", image: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400&h=400&fit=crop", price: 580, originalPrice: 950, rating: 4.8, reviews: 27, sold: 110, freeShipping: true, category: "home" },
  { id: "supplier-111", name: "Professional Noise Cancelling Studio Headphones", slug: "product-111", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop", price: 1850, originalPrice: 2600, rating: 4.9, reviews: 104, sold: 520, freeShipping: true, category: "electronics" },
  { id: "supplier-112", name: "Wireless Ergonomic Vertical Optical Mouse 2.4G", slug: "product-112", image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=400&h=400&fit=crop", price: 480, originalPrice: 850, rating: 4.6, reviews: 43, sold: 160, freeShipping: true, category: "electronics" }
];

export async function getCachedMohasagorProducts(): Promise<Product[]> {
  // 1. Check in-memory cache first (0ms)
  if (inMemoryProductsCache && inMemoryProductsCache.length > 0) {
    return inMemoryProductsCache;
  }

  // 2. Check localStorage (0ms)
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(MOHASAGOR_CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryProductsCache = parsed;
          // Trigger background refresh silently for all pages
          fetchAllPagesMohasagorProducts().catch(() => {});
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Error reading mohasagor localStorage cache", e);
    }
  }

  // 3. Network fetch fallback
  const fetched = await fetchAllPagesMohasagorProducts().catch(() => []);
  if (fetched && fetched.length > 0) {
    return fetched;
  }

  // 4. Guaranteed Fallback
  inMemoryProductsCache = FALLBACK_SUPPLIER_PRODUCTS;
  return FALLBACK_SUPPLIER_PRODUCTS;
}


function mapRawProducts(rawProducts: any[], base: string): Product[] {
  const resolveUrl = (url: string) => {
    if (!url) return "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop";
    if (url.startsWith("http") || url.startsWith("//")) return url;
    return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
  };

  return rawProducts.map((p, index) => {
    const firstImage = p.product_images && p.product_images.length > 0
      ? resolveUrl(p.product_images[0].product_image)
      : p.thumbnail_img ? resolveUrl(p.thumbnail_img) : resolveUrl("");

    const API_PROFIT_MARGIN = 1.30; // 30% profit margin
    const rawSalePrice = parseFloat(p.sale_price) || parseFloat(p.discount_price) || 0;
    const rawPrice = parseFloat(p.price) || parseFloat(p.regular_price) || rawSalePrice;
    
    const baseSellingPrice = rawSalePrice > 0 ? rawSalePrice : rawPrice;
    const price = Math.round(baseSellingPrice * API_PROFIT_MARGIN);

    const baseRegularPrice = rawPrice > baseSellingPrice ? rawPrice : Math.round(baseSellingPrice * 1.30);
    const originalPrice = Math.round(baseRegularPrice * API_PROFIT_MARGIN);

    const allImages = p.product_images && p.product_images.length > 0
      ? p.product_images.map((imgObj: any) => resolveUrl(imgObj.product_image || imgObj.image || imgObj.url))
      : [firstImage];

    const formattedImgList = p.product_images && p.product_images.length > 0
      ? p.product_images.map((imgObj: any, idx: number) => ({
          id: imgObj.id ? String(imgObj.id) : `img-${idx}`,
          image_url: resolveUrl(imgObj.product_image || imgObj.image || imgObj.url),
          sort_order: idx
        }))
      : [{ id: "img-0", image_url: firstImage, sort_order: 0 }];

    const rawStock = p.stock_quantity ?? p.stock ?? (p.stock_status === "available" ? 50 : 0);

    return {
      id: p.id.toString(),
      name: p.name,
      slug: p.slug || `product-${p.id}`,
      image: firstImage,
      images: allImages,
      product_images: formattedImgList,
      price,
      originalPrice: originalPrice > price ? originalPrice : undefined,
      rating: 4.8,
      reviews: 15,
      sold: parseInt(p.sold) || 45,
      freeShipping: true,
      isNew: index < 20,
      isBestSeller: index % 4 === 0,
      category: p.category || "",
      description: p.details || p.description || "",
      short_description: p.short_description || "",
      stock: Number(rawStock),
      stock_quantity: Number(rawStock),
      stock_status: p.stock_status || "available",
      sku: p.product_code ? String(p.product_code) : (p.sku || ""),
      product_code: p.product_code
    } as Product & { [key: string]: any };
  });
}

export async function fetchAllPagesMohasagorProducts(): Promise<Product[]> {
  if (isFetchingAllPages && inMemoryProductsCache && inMemoryProductsCache.length > 0) {
    return inMemoryProductsCache;
  }
  isFetchingAllPages = true;

  try {
    const baseApiUrl = "/api/mohasagor/api/reseller/product";

    const headers = {
      "api-key": "A8niclztH9JtzS4t",
      "secret-key": "2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8"
    };

    // 1. Fetch Page 1 to get initial products and last_page total
    const res1 = await fetch(`${baseApiUrl}?page=1`, { headers });
    if (!res1.ok) {
      isFetchingAllPages = false;
      return inMemoryProductsCache || [];
    }

    const data1 = await res1.json();
    const rawProductsPage1: any[] = data1.products || (Array.isArray(data1) ? data1 : []);
    const lastPage = data1.last_page || 1;
    const base = "https://mohasagor.com.bd";

    let allMappedProducts = mapRawProducts(rawProductsPage1, base);

    // Save page 1 immediately so UI updates instantly
    inMemoryProductsCache = allMappedProducts;
    lastSyncTimestamp = Date.now();

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(MOHASAGOR_CACHE_KEY, JSON.stringify(allMappedProducts));
        window.dispatchEvent(new Event("mohasagor_products_updated"));
      } catch (e) {}
    }

    // 2. Fetch all remaining pages in parallel if lastPage > 1
    if (lastPage > 1) {
      const pagePromises = [];
      for (let p = 2; p <= lastPage; p++) {
        pagePromises.push(
          fetch(`${baseApiUrl}?page=${p}`, { headers })
            .then(res => res.ok ? res.json() : null)
            .then(data => data ? (data.products || (Array.isArray(data) ? data : [])) : [])
            .catch(() => [])
        );
      }

      const results = await Promise.all(pagePromises);
      const remainingRawProducts = results.flat();
      const remainingMapped = mapRawProducts(remainingRawProducts, base);

      allMappedProducts = [...allMappedProducts, ...remainingMapped];
      inMemoryProductsCache = allMappedProducts;
      lastSyncTimestamp = Date.now();

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(MOHASAGOR_CACHE_KEY, JSON.stringify(allMappedProducts));
          window.dispatchEvent(new Event("mohasagor_products_updated"));
        } catch (e) {}
      }
    }

    console.log(`[5-Min Auto Sync] API Products synchronized successfully (${allMappedProducts.length} items updated at ${new Date().toLocaleTimeString()})`);
    isFetchingAllPages = false;
    return allMappedProducts;
  } catch (e) {
    console.error("Error fetching all pages of Mohasagor products", e);
    isFetchingAllPages = false;
    return inMemoryProductsCache || [];
  }
}

// Automatic 5-Minute Product Sync Service
export function startAutoProductSync(intervalMs: number = AUTO_SYNC_INTERVAL_MS) {
  if (typeof window === "undefined") return;

  if (autoSyncTimer !== null) {
    window.clearInterval(autoSyncTimer);
  }

  // Run initial background sync
  fetchAllPagesMohasagorProducts().catch(() => {});

  // Schedule recurring sync every 5 minutes
  autoSyncTimer = window.setInterval(() => {
    console.log("[5-Min Auto Sync] Triggering scheduled 5-minute supplier API product sync...");
    fetchAllPagesMohasagorProducts().catch((err) => {
      console.warn("Scheduled 5-min product sync warning:", err);
    });
  }, intervalMs);
}

// Auto-start 5-minute background sync service upon browser load
if (typeof window !== "undefined") {
  startAutoProductSync();
}

export function filterProductsByCategory(products: (Product & { category?: string })[], categorySlug: string, categoryName?: string): Product[] {
  const targetSlug = categorySlug.toLowerCase().replace(/[^a-z0-9]/g, "");
  const targetName = (categoryName || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const filtered = products.filter(p => {
    if (!targetSlug || targetSlug === "all") return true;
    const prodCat = ((p as any).category || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (prodCat.includes(targetSlug) || targetSlug.includes(prodCat)) return true;
    if (targetName && (prodCat.includes(targetName) || targetName.includes(prodCat))) return true;
    if ((targetSlug.includes("fashion") || targetSlug.includes("shirt") || targetSlug.includes("cloth")) && (prodCat.includes("fashion") || prodCat.includes("winter"))) return true;
    if ((targetSlug.includes("gadget") || targetSlug.includes("electronic") || targetSlug.includes("tech") || targetSlug.includes("phone")) && prodCat.includes("gadget")) return true;
    if ((targetSlug.includes("home") || targetSlug.includes("garden") || targetSlug.includes("life")) && prodCat.includes("home")) return true;
    if ((targetSlug.includes("toy") || targetSlug.includes("kid") || targetSlug.includes("hobby") || targetSlug.includes("baby")) && prodCat.includes("kid")) return true;
    if ((targetSlug.includes("watch") || targetSlug.includes("time")) && prodCat.includes("watch")) return true;
    return false;
  });

  return filtered.length > 0 ? filtered : products;
}
