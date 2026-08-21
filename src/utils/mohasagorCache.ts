import type { Product } from "@/components/products/ProductCard";
import { calculateProductPrice } from "@/utils/pricingMargin";
import { getSmartProductImage } from "@/utils/productImageHelper";
import { extractProductVariants } from "@/utils/productVariantHelper";

const MOHASAGOR_CACHE_KEY = "mohasagor_products_master_cache_v10";
const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// IndexedDB configuration for unlimited, fast persistent storage
const IDB_NAME = "durtup_catalog_db";
const IDB_STORE = "products_store";
const IDB_KEY = "mohasagor_catalog_master_v10";
const IDB_VERSION = 1;

let inMemoryProductsCache: Product[] | null = null;
let isFetchingAllPages = false;
let autoSyncTimer: number | null = null;
let lastSyncTimestamp: number | null = null;

// Ultra-fast O(1) Hash Map Index for Instant Lookups
const productIndexMap = new Map<string, Product & { [key: string]: any }>();

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not supported"));
    }
    const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getIdbProducts(): Promise<Product[] | null> {
  try {
    const db = await openIdb();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_KEY);
      req.onsuccess = () => {
        const val = req.result;
        if (Array.isArray(val) && val.length > 0) {
          resolve(val);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setIdbProducts(products: Product[]): Promise<void> {
  if (!Array.isArray(products) || products.length === 0) return;
  try {
    const db = await openIdb();
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    store.put(products, IDB_KEY);
  } catch (err) {
    console.warn("IndexedDB save error:", err);
  }
}

export function updateIndexMap(products: (Product & { [key: string]: any })[]) {
  if (!Array.isArray(products)) return;
  products.forEach((p) => {
    if (!p) return;
    if (p.slug) {
      const s = String(p.slug).toLowerCase();
      productIndexMap.set(s, p);
      productIndexMap.set(encodeURIComponent(s), p);
    }
    if (p.id) {
      const idStr = String(p.id).toLowerCase();
      productIndexMap.set(idStr, p);
      productIndexMap.set(`product-${idStr}`, p);
      productIndexMap.set(`supplier-${idStr}`, p);
    }
    const slugStr = String(p.slug || "").toLowerCase();
    const suffixMatch = slugStr.match(/-(\d+)$/);
    if (suffixMatch) {
      productIndexMap.set(suffixMatch[1], p);
      productIndexMap.set(`product-${suffixMatch[1]}`, p);
    }
    if (p.sku) {
      const skuStr = String(p.sku).toLowerCase();
      productIndexMap.set(skuStr, p);
      productIndexMap.set(`product-${skuStr}`, p);
    }
    if (p.product_code) {
      const codeStr = String(p.product_code).toLowerCase();
      productIndexMap.set(codeStr, p);
      productIndexMap.set(`product-${codeStr}`, p);
    }
  });
}

export function findMohasagorProductSync(slugOrId: string): (Product & { [key: string]: any }) | null {
  if (!slugOrId) return null;
  const targetRaw = decodeURIComponent(slugOrId).split("?")[0].split("&")[0].trim().toLowerCase();
  if (!targetRaw) return null;
  
  if (productIndexMap.has(targetRaw)) return productIndexMap.get(targetRaw)!;

  const cleanId = targetRaw.replace(/^product-/, "").replace(/^supplier-/, "").replace(/^cj_/, "").replace(/^cj-/, "");
  if (productIndexMap.has(cleanId)) return productIndexMap.get(cleanId)!;

  const suffixMatch = targetRaw.match(/-(\d+)$/);
  if (suffixMatch && productIndexMap.has(suffixMatch[1])) return productIndexMap.get(suffixMatch[1])!;

  // Fallback scan across in-memory cache
  if (inMemoryProductsCache && inMemoryProductsCache.length > 0) {
    const found = inMemoryProductsCache.find((p: any) => {
      const pSlug = String(p.slug || "").toLowerCase();
      const pId = String(p.id || "").toLowerCase();
      const pCode = String(p.product_code || p.sku || "").toLowerCase();
      return pSlug === targetRaw || 
             pId === targetRaw || 
             pId === cleanId || 
             pCode === cleanId ||
             pCode === targetRaw ||
             pSlug === `product-${cleanId}` ||
             (suffixMatch && (pId === suffixMatch[1] || pCode === suffixMatch[1] || pSlug.endsWith(`-${suffixMatch[1]}`))) ||
             pSlug.endsWith(`-${cleanId}`);
    });
    if (found) {
      updateIndexMap([found as any]);
      return found as any;
    }
  }

  return null;
}

export function getLastSyncTime(): string | null {
  if (!lastSyncTimestamp) return null;
  return new Date(lastSyncTimestamp).toLocaleTimeString();
}

export const FALLBACK_SUPPLIER_PRODUCTS: Product[] = [
  { id: "supplier-101", name: "X-01 Full Charge Separator – Type-C Auto Power-Off Cable", slug: "product-101", image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=400&fit=crop", price: 690, originalPrice: 930, rating: 4.8, reviews: 34, sold: 120, freeShipping: true, category: "electronics" },
  { id: "supplier-102", name: "Rechargeable Dual Slot Battery Charger with LED Display", slug: "product-102", image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop", price: 280, originalPrice: 380, rating: 4.7, reviews: 22, sold: 85, freeShipping: true, category: "electronics" },
  { id: "supplier-103", name: "Apache Luminous RGB Gaming Mouse (Batmen Edition)", slug: "product-103", image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=400&fit=crop", price: 750, originalPrice: 1010, rating: 4.9, reviews: 56, sold: 210, freeShipping: true, category: "electronics" },
  { id: "supplier-104", name: "Rechargeable Water Dispenser Pump | Automatic Electric Pump", slug: "product-104", image: "https://images.unsplash.com/photo-1585336261026-8f5786372966?w=400&h=400&fit=crop", price: 780, originalPrice: 1050, rating: 4.6, reviews: 19, sold: 95, freeShipping: true, category: "home" },
  { id: "supplier-105", name: "Archer C6 AC1200 Wireless MU-MIMO Gigabit Router", slug: "product-105", image: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&h=400&fit=crop", price: 3500, originalPrice: 4725, rating: 4.9, reviews: 140, sold: 430, freeShipping: true, category: "electronics" },
  { id: "supplier-106", name: "Touch Lamp Portable Bluetooth Speaker with Wireless Charger", slug: "product-106", image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=400&h=400&fit=crop", price: 699, originalPrice: 940, rating: 4.8, reviews: 45, sold: 180, freeShipping: true, category: "electronics" },
  { id: "supplier-107", name: "Smart Fitness Watch with Heart Rate & Oxygen Monitor", slug: "product-107", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop", price: 1480, originalPrice: 1990, rating: 4.8, reviews: 88, sold: 340, freeShipping: true, category: "electronics" },
  { id: "supplier-108", name: "Ultra Quiet Mini Desk Fan with USB Rechargeable Battery", slug: "product-108", image: "https://images.unsplash.com/photo-1618944847828-82e943c3beb9?w=400&h=400&fit=crop", price: 650, originalPrice: 880, rating: 4.7, reviews: 31, sold: 140, freeShipping: true, category: "home" },
  { id: "supplier-109", name: "Stainless Steel Thermal Coffee Mug (500ml)", slug: "product-109", image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=400&fit=crop", price: 499, originalPrice: 670, rating: 4.9, reviews: 62, sold: 290, freeShipping: true, category: "home" },
  { id: "supplier-110", name: "Ergonomic Memory Foam Back Pillow Cushion", slug: "product-110", image: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400&h=400&fit=crop", price: 950, originalPrice: 1280, rating: 4.8, reviews: 27, sold: 110, freeShipping: true, category: "home" },
  { id: "supplier-111", name: "Professional Noise Cancelling Studio Headphones", slug: "product-111", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop", price: 2600, originalPrice: 3500, rating: 4.9, reviews: 104, sold: 520, freeShipping: true, category: "electronics" },
  { id: "supplier-112", name: "Wireless Ergonomic Vertical Optical Mouse 2.4G", slug: "product-112", image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=400&h=400&fit=crop", price: 850, originalPrice: 1150, rating: 4.6, reviews: 43, sold: 160, freeShipping: true, category: "electronics" }
];

// Initialize index map with fallback items immediately
updateIndexMap(FALLBACK_SUPPLIER_PRODUCTS);

export function startMohasagorAutoSync() {
  if (typeof window === "undefined") return;
  if (autoSyncTimer !== null) return;

  // Run auto-sync from live API every 5 minutes
  autoSyncTimer = window.setInterval(async () => {
    try {
      console.log("[Mohasagor Auto-Sync] Auto-fetching fresh products from all API pages (5-min interval)...");
      await fetchAllPagesMohasagorProducts(true);
    } catch (err) {
      console.warn("[Mohasagor Auto-Sync] 5-minute background sync error:", err);
    }
  }, AUTO_SYNC_INTERVAL_MS);
}

// Eagerly bootstrap cache on client startup: IndexedDB -> Static CDN Catalog -> Live Sync
if (typeof window !== "undefined") {
  startMohasagorAutoSync();

  (async () => {
    try {
      // 1. Try IndexedDB first (if it has full catalog of 2000+ items)
      const idbData = await getIdbProducts();
      if (idbData && idbData.length >= 2000) {
        inMemoryProductsCache = idbData;
        updateIndexMap(idbData);
        window.dispatchEvent(new Event("mohasagor_products_updated"));
      } else {
        // 2. Fetch Static CDN Public Catalog (/mohasagor_catalog.json) instantly
        const staticList = await fetchStaticCatalog();
        if (!staticList || staticList.length < 2000) {
          fetchAllPagesMohasagorProducts(true).catch(() => {});
        }
      }
    } catch (e) {
      console.warn("Bootstrap cache error:", e);
      fetchStaticCatalog().catch(() => {});
    }
  })();
}

async function fetchStaticCatalog(): Promise<Product[]> {
  try {
    const res = await fetch("/mohasagor_catalog.json");
    if (res.ok) {
      const rawProducts = await res.json();
      if (Array.isArray(rawProducts) && rawProducts.length > 0) {
        const mapped = mapRawProducts(rawProducts, "https://mohasagor.com.bd");
        inMemoryProductsCache = mapped;
        updateIndexMap(mapped);
        setIdbProducts(mapped).catch(() => {});
        window.dispatchEvent(new Event("mohasagor_products_updated"));
        return mapped;
      }
    }
  } catch (err) {
    console.warn("Failed to load static catalog:", err);
  }
  return [];
}

let ongoingFetchPromise: Promise<Product[]> | null = null;

export async function getCachedMohasagorProducts(): Promise<Product[]> {
  // 1. In-memory cache first (if full catalog is loaded)
  if (inMemoryProductsCache && inMemoryProductsCache.length >= 2000) {
    return inMemoryProductsCache;
  }

  // 2. Check IndexedDB (10-30ms)
  if (typeof window !== "undefined") {
    try {
      const idbItems = await getIdbProducts();
      if (idbItems && idbItems.length >= 2000) {
        inMemoryProductsCache = idbItems;
        updateIndexMap(idbItems);
        return idbItems;
      }
    } catch {}
  }

  // 3. Check static CDN catalog (/mohasagor_catalog.json) which has all 2788 items
  const staticItems = await fetchStaticCatalog();
  if (staticItems && staticItems.length >= 2000) {
    return staticItems;
  }

  // 4. Live network fetch from all API pages
  const fetched = await fetchAllPagesMohasagorProducts().catch(() => []);
  if (fetched && fetched.length > 0) {
    return fetched;
  }

  // 5. Guaranteed Fallback
  if (staticItems && staticItems.length > 0) return staticItems;
  if (inMemoryProductsCache && inMemoryProductsCache.length > 0) return inMemoryProductsCache;
  inMemoryProductsCache = FALLBACK_SUPPLIER_PRODUCTS;
  updateIndexMap(FALLBACK_SUPPLIER_PRODUCTS);
  return FALLBACK_SUPPLIER_PRODUCTS;
}

export function mapRawProducts(rawProducts: any[], base: string = "https://mohasagor.com.bd"): Product[] {
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

  const extractAnyImg = (p: any): string => {
    if (!p) return "";
    if (typeof p === "string") return resolveUrl(p);

    if (p.image && typeof p.image === "string") return resolveUrl(p.image);
    if (p.thumbnail_img && typeof p.thumbnail_img === "string") return resolveUrl(p.thumbnail_img);
    if (p.thumbnail && typeof p.thumbnail === "string") return resolveUrl(p.thumbnail);
    if (p.image_url && typeof p.image_url === "string") return resolveUrl(p.image_url);
    if (p.photo && typeof p.photo === "string") return resolveUrl(p.photo);

    if (Array.isArray(p.product_images) && p.product_images.length > 0) {
      for (const img of p.product_images) {
        if (typeof img === "string" && img.trim()) return resolveUrl(img);
        if (img && typeof img === "object") {
          const u = img.product_image || img.image_url || img.image || img.url;
          if (u && typeof u === "string" && u.trim()) return resolveUrl(u);
        }
      }
    }

    if (Array.isArray(p.images) && p.images.length > 0) {
      for (const img of p.images) {
        if (typeof img === "string" && img.trim()) return resolveUrl(img);
        if (img && typeof img === "object") {
          const u = img.image_url || img.image || img.url;
          if (u && typeof u === "string" && u.trim()) return resolveUrl(u);
        }
      }
    }

    return "";
  };

  return rawProducts.map((p, index) => {
    const rawImage = extractAnyImg(p);
    const firstImage = getSmartProductImage(p.name, rawImage, p.category || "", index);

    // Base supplier price from API (p.price or p.sale_price)
    const exactRetailPrice = parseFloat(p.price) || parseFloat(p.sale_price) || 0;
    const rawRegularPrice = parseFloat(p.regular_price) || 0;

    // Dynamically calculate price with Admin Profit Margin settings
    const calc = calculateProductPrice(exactRetailPrice, undefined, rawRegularPrice);
    const price = calc.price;
    const originalPrice = calc.originalPrice;

    const allImages: string[] = [];
    if (Array.isArray(p.product_images) && p.product_images.length > 0) {
      p.product_images.forEach((imgObj: any) => {
        const u = typeof imgObj === "string" ? resolveUrl(imgObj) : resolveUrl(imgObj?.product_image || imgObj?.image || imgObj?.url || imgObj?.image_url);
        if (u && !allImages.includes(u)) allImages.push(u);
      });
    }
    if (allImages.length === 0) {
      allImages.push(firstImage);
    }

    const formattedImgList = allImages.map((imgUrl, idx) => ({
      id: `img-${idx}`,
      image_url: imgUrl,
      sort_order: idx
    }));

    const rawStock = p.stock_quantity ?? p.stock ?? (p.stock_status === "available" ? 50 : 0);

    // Map Product Variants (Size, Color, Options) using robust multi-source extractor
    const variants = extractProductVariants(p);

    return {
      id: String(p.id || `prod_${Date.now()}_${index}`),
      name: p.name || p.title || "Product",
      slug: p.slug || `product-${p.id}`,
      image: firstImage,
      images: allImages,
      product_images: formattedImgList,
      product_variants: variants,
      variants,
      price,
      originalPrice: originalPrice > price ? originalPrice : undefined,
      regular_price: calc.regularPrice,
      discount_price: calc.discountPrice,
      rating: Number(p.rating || p.rating_average || 4.8),
      reviews: Number(p.reviews || p.rating_count || 15),
      sold: parseInt(p.sold) || parseInt(p.sold_count) || 45,
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

async function fetchPageWithFallback(pageNum: number, headers: Record<string, string>, retries = 3): Promise<any[]> {
  const endpoints = [
    `/api/mohasagor/api/reseller/product?page=${pageNum}`,
    `https://mohasagor.com.bd/api/reseller/product?page=${pageNum}`,
    `https://api.allorigins.win/get?url=${encodeURIComponent(`https://mohasagor.com.bd/api/reseller/product?page=${pageNum}`)}`
  ];

  for (let attempt = 0; attempt < retries; attempt++) {
    for (const url of endpoints) {
      try {
        const isProxy = url.includes("allorigins");
        const fetchHeaders = isProxy ? undefined : headers;
        const res = await fetch(url, fetchHeaders ? { headers: fetchHeaders } : undefined);
        if (res.ok) {
          const data = await res.json();
          let parsedData = data;
          if (isProxy && data.contents) {
            try {
              parsedData = JSON.parse(data.contents);
            } catch {}
          }
          const list = parsedData.products || (Array.isArray(parsedData) ? parsedData : parsedData.data || []);
          if (Array.isArray(list) && list.length > 0) {
            return list;
          }
        }
      } catch (err) {
        // continue to next endpoint
      }
    }
    if (attempt < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
  return [];
}

export async function fetchAllPagesMohasagorProducts(forceRefresh = false): Promise<Product[]> {
  if (!forceRefresh && ongoingFetchPromise) {
    return ongoingFetchPromise;
  }
  if (!forceRefresh && inMemoryProductsCache && inMemoryProductsCache.length >= 2000) {
    return inMemoryProductsCache;
  }

  ongoingFetchPromise = (async () => {
    try {
      const headers = {
        "api-key": "A8niclztH9JtzS4t",
        "secret-key": "2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8"
      };

      // 1. Fetch Page 1 to determine total pages
      let rawProductsPage1: any[] = [];
      let lastPage = 14;

      try {
        const p1Data = await fetchPageWithFallback(1, headers, 3);
        if (p1Data && p1Data.length > 0) {
          rawProductsPage1 = p1Data;
        }
      } catch (err) {
        console.warn("Live page 1 fetch warning, attempting static catalog...", err);
      }

      // If page 1 failed, load static catalog
      if (rawProductsPage1.length === 0) {
        const staticList = await fetchStaticCatalog();
        if (staticList && staticList.length > 0) {
          return staticList;
        }
        return inMemoryProductsCache || FALLBACK_SUPPLIER_PRODUCTS;
      }

      const base = "https://mohasagor.com.bd";
      const allRawPages: any[][] = [rawProductsPage1];

      // 2. Fetch all remaining pages in controlled batches to avoid rate-limiting dropouts
      const concurrency = 3;
      for (let p = 2; p <= lastPage; p += concurrency) {
        const batchPromises: Promise<any[]>[] = [];
        for (let j = p; j < p + concurrency && j <= lastPage; j++) {
          batchPromises.push(fetchPageWithFallback(j, headers, 3));
        }
        const batchResults = await Promise.all(batchPromises);
        allRawPages.push(...batchResults);
        if (p + concurrency <= lastPage) {
          await new Promise((r) => setTimeout(r, 120));
        }
      }

      const allRaw = allRawPages.flat();

      // Deduplicate by ID
      const uniqueMap = new Map<string, any>();
      allRaw.forEach((p) => {
        if (p && p.id) {
          uniqueMap.set(String(p.id), p);
        }
      });

      let allMappedProducts = mapRawProducts(Array.from(uniqueMap.values()), base);

      // SAFETY GUARD: If live fetch retrieved fewer products than the static catalog (e.g. temporary network glitch), merge with static catalog so no products are lost!
      const staticList = await fetchStaticCatalog().catch(() => []);
      if (staticList && staticList.length > allMappedProducts.length) {
        const mergedMap = new Map<string, Product>();
        staticList.forEach((p) => mergedMap.set(String(p.id), p));
        allMappedProducts.forEach((p) => mergedMap.set(String(p.id), p));
        allMappedProducts = Array.from(mergedMap.values());
      }

      updateIndexMap(allMappedProducts);
      inMemoryProductsCache = allMappedProducts;

      lastSyncTimestamp = Date.now();
      setIdbProducts(allMappedProducts).catch(() => {});

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("mohasagor_products_updated"));
      }

      console.log(`[Mohasagor Master Sync] Synchronized ${allMappedProducts.length} items`);
      return allMappedProducts;
    } catch (e) {
      console.error("Error fetching all pages of Mohasagor products", e);
      return inMemoryProductsCache || (await fetchStaticCatalog()) || FALLBACK_SUPPLIER_PRODUCTS;
    } finally {
      ongoingFetchPromise = null;
    }
  })();

  return ongoingFetchPromise;
}

export async function findMohasagorProduct(slugOrId: string): Promise<(Product & { [key: string]: any }) | null> {
  if (!slugOrId) return null;
  const syncMatch = findMohasagorProductSync(slugOrId);
  if (syncMatch) return syncMatch;

  const targetRaw = decodeURIComponent(slugOrId).split("?")[0].split("&")[0].trim();
  const targetLower = targetRaw.toLowerCase();
  
  // Extract suffix (e.g. "mens-stylish-joggers-pant-4034" -> "4034")
  const suffixMatch = targetLower.match(/-(\d+)$/);
  const suffixId = suffixMatch ? suffixMatch[1] : "";
  const cleanId = targetLower.replace(/^product-/, "").replace(/^supplier-/, "").replace(/^cj_/, "").replace(/^cj-/, "");

  const matcher = (p: any): boolean => {
    if (!p) return false;
    const pId = String(p.id || "").toLowerCase();
    const pSlug = String(p.slug || "").toLowerCase();
    const pCode = String(p.product_code || p.sku || "").toLowerCase();
    const pName = String(p.name || p.title || "").toLowerCase();

    if (pSlug === targetLower) return true;
    if (pId === targetLower || pId === cleanId) return true;
    if (pSlug === `product-${cleanId}` || pSlug === `product-${targetLower}`) return true;
    if (pCode && (pCode === cleanId || pCode === targetLower)) return true;
    if (suffixId && (pId === suffixId || pCode === suffixId || pSlug === `product-${suffixId}` || pSlug.endsWith(`-${suffixId}`))) return true;
    if (cleanId && (pSlug.includes(`-${cleanId}`) || pSlug === cleanId)) return true;
    if (targetLower.length > 6 && pName && (pName.includes(targetLower.slice(0, 25)) || targetLower.includes(pName.slice(0, 25)))) return true;
    return false;
  };

  // 1. Check IndexedDB
  try {
    const idbData = await getIdbProducts();
    if (idbData && idbData.length > 0) {
      inMemoryProductsCache = idbData;
      updateIndexMap(idbData);
      const found = idbData.find(matcher);
      if (found) return found as any;
    }
  } catch {}

  // 2. Check Static CDN Public Catalog
  try {
    const staticData = await fetchStaticCatalog();
    if (staticData && staticData.length > 0) {
      const found = staticData.find(matcher);
      if (found) return found as any;
    }
  } catch {}

  // 3. Fetch full catalog across all pages
  const fullProducts = await fetchAllPagesMohasagorProducts();
  if (fullProducts && fullProducts.length > 0) {
    const found = fullProducts.find(matcher);
    if (found) return found as any;
  }

  // 4. Check fallback supplier products
  const fallback = FALLBACK_SUPPLIER_PRODUCTS.find(matcher);
  if (fallback) return fallback as any;

  return null;
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
    fetchAllPagesMohasagorProducts(true).catch((err) => {
      console.warn("Scheduled 5-min product sync warning:", err);
    });
  }, intervalMs);
}

// Auto-start 5-minute background sync service upon browser load
if (typeof window !== "undefined") {
  startAutoProductSync();
}

export function normalizeCategorySlug(raw: string): string {
  const str = (raw || "").toLowerCase().trim();
  if (str.includes("watch") || str.includes("jewelry") || str.includes("jewellery") || str.includes("accessory")) return "watches";
  if (str.includes("toy") || str.includes("kid") || str.includes("baby") || str.includes("child")) return "kids";
  if (str.includes("beauty") || str.includes("health") || str.includes("skin") || str.includes("care") || str.includes("cosmetic")) return "beauty";
  if (str.includes("fashion") || str.includes("cloth") || str.includes("wear") || str.includes("apparel") || str.includes("garment") || str.includes("winter") || str.includes("shoe")) return "fashion";
  if (str.includes("home") || str.includes("kitchen") || str.includes("lifestyle") || str.includes("living") || str.includes("appliance") || str.includes("household") || str.includes("garden")) return "home";
  if (str.includes("electronic") || str.includes("gadget") || str.includes("mobile") || str.includes("phone") || str.includes("tech") || str.includes("audio") || str.includes("computer")) return "electronics";
  return str;
}

export function inferCategory(name: string, currentCategory?: string): string {
  const n = (name || "").toLowerCase();
  const c = (currentCategory || "").toLowerCase();

  // 1. Watches & Accessories
  if (
    n.includes("smartwatch") ||
    n.includes("smart watch") ||
    n.includes("wrist watch") ||
    n.includes("curren") ||
    n.includes("naviforce") ||
    n.includes("skmei") ||
    n.includes("strap") ||
    n.includes("bracelet") ||
    n.includes("jewelry") ||
    n.includes("jewellery") ||
    n.includes("sunglass") ||
    n.includes("sunglasses") ||
    n.includes("ring") ||
    n.includes("necklace") ||
    n.includes("chain") ||
    n.includes("earring") ||
    n.includes("pendant") ||
    n.includes("bangle") ||
    n.includes("eyewear") ||
    (n.includes("watch") && !n.includes("face wash") && !n.includes("stopwatch")) ||
    c.includes("watch") ||
    c.includes("jewelry") ||
    c.includes("accessory")
  ) {
    return "watches";
  }

  // 2. Toys & Baby Care
  if (
    n.includes("toy") ||
    n.includes("toys") ||
    n.includes("baby") ||
    n.includes("kid") ||
    n.includes("kids") ||
    n.includes("child") ||
    n.includes("children") ||
    n.includes("doll") ||
    n.includes("puzzle") ||
    n.includes("diaper") ||
    n.includes("stroller") ||
    n.includes("walker") ||
    n.includes("rc car") ||
    n.includes("lego") ||
    n.includes("rattle") ||
    n.includes("teether") ||
    n.includes("feeding bottle") ||
    c.includes("kid") ||
    c.includes("toy") ||
    c.includes("baby")
  ) {
    return "kids";
  }

  // 3. Health & Beauty
  if (
    n.includes("hair dryer") ||
    n.includes("dryer") ||
    n.includes("shaver") ||
    n.includes("trimmer") ||
    n.includes("clipper") ||
    n.includes("hair straightener") ||
    n.includes("curler") ||
    n.includes("serum") ||
    n.includes("cream") ||
    n.includes("lotion") ||
    n.includes("oil") ||
    n.includes("shampoo") ||
    n.includes("conditioner") ||
    n.includes("soap") ||
    n.includes("face wash") ||
    n.includes("facewash") ||
    n.includes("lipstick") ||
    n.includes("makeup") ||
    n.includes("perfume") ||
    n.includes("fragrance") ||
    n.includes("attar") ||
    n.includes("body spray") ||
    n.includes("sunscreen") ||
    n.includes("scrub") ||
    n.includes("mask") ||
    n.includes("facial") ||
    n.includes("massager") ||
    n.includes("massage") ||
    n.includes("gripper") ||
    n.includes("fitness") ||
    n.includes("slimming") ||
    n.includes("toothbrush") ||
    c.includes("beauty") ||
    c.includes("health") ||
    c.includes("cosmetic") ||
    c.includes("skincare")
  ) {
    return "beauty";
  }

  // 4. Fashion & Clothing
  if (
    n.includes("shirt") ||
    n.includes("t-shirt") ||
    n.includes("tshirt") ||
    n.includes("pant") ||
    n.includes("trouser") ||
    n.includes("jeans") ||
    n.includes("jacket") ||
    n.includes("hoodie") ||
    n.includes("sweater") ||
    n.includes("sweatshirt") ||
    n.includes("coat") ||
    n.includes("blazer") ||
    n.includes("polo") ||
    n.includes("panjabi") ||
    n.includes("punjabi") ||
    n.includes("kurti") ||
    n.includes("saree") ||
    n.includes("sari") ||
    n.includes("sharee") ||
    n.includes("dress") ||
    n.includes("shoe") ||
    n.includes("shoes") ||
    n.includes("sneaker") ||
    n.includes("sneakers") ||
    n.includes("boot") ||
    n.includes("sandal") ||
    n.includes("slippers") ||
    n.includes("loafers") ||
    n.includes("socks") ||
    n.includes("underwear") ||
    n.includes("boxer") ||
    n.includes("innerwear") ||
    n.includes("scarf") ||
    n.includes("hijab") ||
    n.includes("abaya") ||
    n.includes("borkha") ||
    n.includes("khimar") ||
    n.includes("palazzo") ||
    n.includes("lehenga") ||
    n.includes("combo offer") ||
    n.includes("jersey") ||
    n.includes("tracksuit") ||
    n.includes("shorts") ||
    n.includes("cap") ||
    n.includes("hat") ||
    n.includes("belt") ||
    n.includes("wallet") ||
    n.includes("handbag") ||
    n.includes("backpack") ||
    n.includes("bag") ||
    n.includes("tote") ||
    c.includes("fashion") ||
    c.includes("clothing") ||
    c.includes("wear") ||
    c.includes("winter") ||
    c.includes("apparel")
  ) {
    return "fashion";
  }

  // 5. Home & Kitchen
  if (
    n.includes("water dispenser") ||
    n.includes("dispenser") ||
    n.includes("water pump") ||
    n.includes("electric pump") ||
    n.includes("fan") ||
    n.includes("cooler") ||
    n.includes("cup") ||
    n.includes("mug") ||
    n.includes("flask") ||
    n.includes("bottle") ||
    n.includes("thermos") ||
    n.includes("pillow") ||
    n.includes("cushion") ||
    n.includes("bedding") ||
    n.includes("bed sheet") ||
    n.includes("blanket") ||
    n.includes("curtain") ||
    n.includes("towel") ||
    n.includes("kitchen") ||
    n.includes("cooker") ||
    n.includes("stove") ||
    n.includes("kettle") ||
    n.includes("blender") ||
    n.includes("grinder") ||
    n.includes("juicer") ||
    n.includes("chopper") ||
    n.includes("air fryer") ||
    n.includes("pan") ||
    n.includes("pot") ||
    n.includes("knife") ||
    n.includes("sealer") ||
    n.includes("scale") ||
    n.includes("mop") ||
    n.includes("cleaner") ||
    n.includes("vacuum") ||
    n.includes("shelf") ||
    n.includes("rack") ||
    n.includes("organizer") ||
    n.includes("storage") ||
    n.includes("hanger") ||
    n.includes("lamp") ||
    n.includes("light") ||
    n.includes("night lamp") ||
    n.includes("torch") ||
    n.includes("iron") ||
    n.includes("steamer") ||
    n.includes("mosquito") ||
    n.includes("repeller") ||
    n.includes("humidifier") ||
    n.includes("diffuser") ||
    n.includes("lunch box") ||
    n.includes("container") ||
    n.includes("tableware") ||
    n.includes("projector") ||
    c.includes("home") ||
    c.includes("kitchen") ||
    c.includes("lifestyle") ||
    c.includes("living") ||
    c.includes("appliance") ||
    c.includes("household") ||
    c.includes("garden")
  ) {
    return "home";
  }

  // 6. Electronics & Gadgets
  if (
    n.includes("mouse") ||
    n.includes("keyboard") ||
    n.includes("earbuds") ||
    n.includes("headphone") ||
    n.includes("earphone") ||
    n.includes("headset") ||
    n.includes("tws") ||
    n.includes("charger") ||
    n.includes("charging") ||
    n.includes("cable") ||
    n.includes("speaker") ||
    n.includes("power bank") ||
    n.includes("router") ||
    n.includes("bluetooth") ||
    n.includes("camera") ||
    n.includes("display") ||
    n.includes("monitor") ||
    n.includes("receiver") ||
    n.includes("mp3") ||
    n.includes("usb") ||
    n.includes("mic") ||
    n.includes("microphone") ||
    n.includes("tripod") ||
    n.includes("gimbal") ||
    n.includes("adapter") ||
    c.includes("electronic") ||
    c.includes("gadget") ||
    c.includes("mobile") ||
    c.includes("phone") ||
    c.includes("tech")
  ) {
    return "electronics";
  }

  return normalizeCategorySlug(c) || "home";
}

export function filterProductsByCategory(products: (Product & { category?: string })[], categorySlug: string, categoryName?: string): Product[] {
  const targetSlug = normalizeCategorySlug(categorySlug || categoryName || "");

  if (!targetSlug || targetSlug === "all") return products;

  const filtered = products.filter(p => {
    const detected = inferCategory(p.name, p.category);
    const pCatNorm = normalizeCategorySlug(p.category || "");
    return detected === targetSlug || pCatNorm === targetSlug || (p.category || "").toLowerCase().includes(targetSlug);
  });

  return filtered.length > 0 ? filtered : products.slice(0, 20);
}
