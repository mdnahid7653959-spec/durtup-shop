import { collection, getDocs } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { supabase } from "@/lib/firebaseAdapter";
import {
  ISearchEngineAdapter,
  SearchOptions,
  SearchResult,
  SearchSuggestions,
  SearchProductResult
} from "../ISearchEngineAdapter";
import { synonymManager } from "../SynonymManager";
import { fuzzyMatchToken, tokenizeText, normalizeText, getEditDistance } from "../FuzzySearchEngine";
import { searchAnalytics } from "../SearchAnalyticsService";
import { getCachedMohasagorProducts } from "@/utils/mohasagorCache";
import { getSmartProductImage } from "@/utils/productImageHelper";

const defaultImages = [
  "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&h=600&fit=crop"
];

export function inferProductCategory(name: string, currentCategory?: string): string {
  const n = (name || "").toLowerCase();
  const c = (currentCategory || "").toLowerCase();

  // 1. Watches & Accessories
  if (
    n.includes("watch") ||
    n.includes("smartwatch") ||
    n.includes("luminous") ||
    n.includes("strap") ||
    n.includes("bracelet") ||
    n.includes("jewelry") ||
    n.includes("sunglasses") ||
    n.includes("belt") ||
    n.includes("wallet") ||
    c.includes("watch")
  ) {
    return "watches";
  }

  // 2. Electronics & Gadgets
  if (
    n.includes("mouse") ||
    n.includes("keyboard") ||
    n.includes("earbuds") ||
    n.includes("headphone") ||
    n.includes("earphone") ||
    n.includes("charger") ||
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
    c.includes("electronic") ||
    c.includes("gadget")
  ) {
    return "electronics";
  }

  // 3. Home & Kitchen
  if (
    n.includes("water dispenser") ||
    n.includes("dispenser") ||
    n.includes("fan") ||
    n.includes("cup") ||
    n.includes("mug") ||
    n.includes("pillow") ||
    n.includes("cushion") ||
    n.includes("kitchen") ||
    n.includes("cooker") ||
    n.includes("lamp") ||
    n.includes("bottle") ||
    n.includes("organizer") ||
    n.includes("rack") ||
    n.includes("towel") ||
    n.includes("bedding") ||
    n.includes("curtain") ||
    n.includes("mop") ||
    n.includes("shelf") ||
    c.includes("home") ||
    c.includes("kitchen")
  ) {
    return "home";
  }

  // 4. Fashion & Clothing
  if (
    n.includes("shirt") ||
    n.includes("pant") ||
    n.includes("t-shirt") ||
    n.includes("jacket") ||
    n.includes("jeans") ||
    n.includes("dress") ||
    n.includes("shoe") ||
    n.includes("sneaker") ||
    n.includes("saree") ||
    n.includes("kurti") ||
    n.includes("cloth") ||
    c.includes("fashion") ||
    c.includes("clothing")
  ) {
    return "fashion";
  }

  // 5. Health & Beauty
  if (
    n.includes("hair dryer") ||
    n.includes("dryer") ||
    n.includes("shaver") ||
    n.includes("trimmer") ||
    n.includes("serum") ||
    n.includes("cream") ||
    n.includes("lotion") ||
    n.includes("lipstick") ||
    n.includes("makeup") ||
    n.includes("soap") ||
    n.includes("shampoo") ||
    n.includes("perfume") ||
    n.includes("gripper") ||
    n.includes("exercise") ||
    c.includes("beauty") ||
    c.includes("health")
  ) {
    return "beauty";
  }

  // 6. Toys & Baby Care
  if (
    n.includes("toy") ||
    n.includes("baby") ||
    n.includes("kid") ||
    n.includes("doll") ||
    n.includes("puzzle") ||
    n.includes("diaper") ||
    n.includes("stroller") ||
    c.includes("kid") ||
    c.includes("toy")
  ) {
    return "kids";
  }

  return c || "general";
}

function getSessionSeed(): number {
  if (typeof window === "undefined") return 12345;
  let seedStr = sessionStorage.getItem("durtup_user_feed_seed");
  if (!seedStr) {
    seedStr = Math.floor(Math.random() * 1000000).toString();
    sessionStorage.setItem("durtup_user_feed_seed", seedStr);
  }
  // Change time bucket every 5 minutes (5 * 60 * 1000 = 300000ms)
  const timeBucket = Math.floor(Date.now() / 300000);
  return parseInt(seedStr, 10) + timeBucket * 9973;
}

function seededShuffle<T>(array: T[], seed: number): T[] {
  const arr = [...array];
  let m = arr.length, t, i;
  let s = seed;
  const pseudoRandom = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  while (m) {
    i = Math.floor(pseudoRandom() * m--);
    t = arr[m];
    arr[m] = arr[i];
    arr[i] = t;
  }
  return arr;
}

export class FirestoreSearchAdapter implements ISearchEngineAdapter {
  private indexedProducts: any[] = [];
  private indexedCategories: { id: string; name: string; slug: string }[] = [];
  private indexedBrands: { id: string; name: string; slug: string }[] = [];
  private indexedSellers: { id: string; name: string }[] = [];
  private isLoaded = false;
  private lastFetchTime = 0;
  private CACHE_TTL = 1 * 60 * 1000; // 1 minute cache for real-time reactivity

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("admin_products_updated", () => {
        this.invalidateIndex();
        this.buildIndex().catch(() => {});
      });
      window.addEventListener("mohasagor_products_updated", () => {
        this.invalidateIndex();
        this.buildIndex().catch(() => {});
      });
    }

    setTimeout(() => {
      this.buildIndex().catch(() => {});
    }, 100);
  }

  public invalidateIndex(): void {
    this.isLoaded = false;
    this.lastFetchTime = 0;
  }

  public getIndexedCategories(): { id: string; name: string; slug: string }[] {
    return this.indexedCategories;
  }

  public async buildIndex(products?: any[]): Promise<void> {
    const now = Date.now();
    if (this.isLoaded && now - this.lastFetchTime < this.CACHE_TTL && !products) {
      return;
    }

    await synonymManager.init();

    try {
      if (products && products.length > 0) {
        this.indexedProducts = products;
      } else {
        const productMap = new Map<string, any>();

        // 1. Fetch Local Storage Admin Products
        if (typeof window !== "undefined") {
          try {
            const rawLocal = localStorage.getItem("enterprise_admin_products") || localStorage.getItem("local_products");
            if (rawLocal) {
              const localList = JSON.parse(rawLocal);
              if (Array.isArray(localList)) {
                localList.forEach((p: any) => {
                  if (p.id) {
                    const pid = String(p.id);
                    productMap.set(pid, {
                      id: pid,
                      name: p.name || p.title || "Untitled Product",
                      slug: p.slug || `product-${pid}`,
                      regular_price: Number(p.regular_price || p.price || 0),
                      discount_price: p.discount_price || p.discountPrice || null,
                      price: Number(p.discount_price || p.discountPrice || p.regular_price || p.price || 0),
                      category: p.category_name || p.category || "General",
                      brand: p.brand_name || p.brand || "Generic",
                      seller_name: p.seller_id || "Admin",
                      sku: p.sku || `SKU-${pid}`,
                      image: p.image_url || p.image || (Array.isArray(p.images) ? p.images[0] : null) || defaultImages[0],
                      product_images: Array.isArray(p.images) ? p.images.map((u: string) => ({ image_url: u })) : [{ image_url: p.image_url || p.image || defaultImages[0] }],
                      rating_average: Number(p.rating_average || 4.8),
                      rating_count: Number(p.rating_count || 15),
                      sold_count: Number(p.sold_count || 45),
                      in_stock: Number(p.stock_quantity ?? p.stock ?? 50) > 0,
                      status: p.status || "active",
                      short_description: p.short_description || p.shortDescription || "",
                      description: p.description || ""
                    });
                  }
                });
              }
            }
          } catch (e) {
            console.warn("[FirestoreSearchAdapter] LocalStorage read warning:", e);
          }
        }

        // 2. Fetch Supabase DB Products
        try {
          const { data: dbProducts } = await supabase
            .from("products")
            .select(`*, product_images(*)`);
          if (dbProducts && dbProducts.length > 0) {
            dbProducts.forEach((p: any) => {
              const pid = String(p.id);
              const imgList = Array.isArray(p.product_images) && p.product_images.length > 0
                ? p.product_images.map((i: any) => i.image_url).filter(Boolean)
                : [];
              const primaryImg = p.product_images?.find((i: any) => i.is_primary)?.image_url || imgList[0] || p.image_url || p.image || defaultImages[0];

              productMap.set(pid, {
                id: pid,
                name: p.name,
                slug: p.slug || `product-${pid}`,
                regular_price: Number(p.regular_price || 0),
                discount_price: p.discount_price ? Number(p.discount_price) : null,
                price: Number(p.discount_price || p.regular_price || 0),
                category: p.category_id || "General",
                brand: p.brand_id || "Generic",
                seller_name: p.seller_id || "Admin",
                sku: p.sku || `SKU-${pid}`,
                image: primaryImg,
                product_images: imgList.length > 0 ? imgList.map((u: string) => ({ image_url: u })) : [{ image_url: primaryImg }],
                rating_average: Number(p.rating_average || 4.8),
                rating_count: Number(p.rating_count || 15),
                sold_count: Number(p.sold_count || 45),
                in_stock: Number(p.stock_quantity ?? 50) > 0,
                status: p.status || "active",
                short_description: p.short_description || "",
                description: p.description || ""
              });
            });
          }
        } catch (e) {
          console.warn("[FirestoreSearchAdapter] Supabase DB read warning:", e);
        }

        // 3. Fetch Firestore products collection
        try {
          const snap = await getDocs(collection(db, "products"));
          if (!snap.empty) {
            snap.docs.forEach((d) => {
              const pData = d.data();
              const pid = String(d.id);
              if (!productMap.has(pid)) {
                productMap.set(pid, { id: pid, ...pData });
              }
            });
          }
        } catch (e) {
          console.warn("[FirestoreSearchAdapter] Firestore read warning:", e);
        }

        // 4. Fetch/merge live products from mohasagorCache
        try {
          const cached = await getCachedMohasagorProducts();
          if (cached && cached.length > 0) {
            cached.forEach((p: any, idx: number) => {
              const pid = String(p.id);
              if (!productMap.has(pid)) {
                productMap.set(pid, {
                  id: pid,
                  name: p.name,
                  slug: p.slug || `product-${pid}`,
                  regular_price: p.originalPrice || p.price || 0,
                  discount_price: p.originalPrice ? p.price : null,
                  price: p.price || 0,
                  category: p.category || "General",
                  brand: p.brand || "Generic",
                  seller_name: "Durtup Marketplace",
                  sku: p.sku || `SKU-${pid}`,
                  image: p.image,
                  product_images: Array.isArray(p.images) ? p.images.map((u: string) => ({ image_url: u })) : [{ image_url: p.image || defaultImages[idx % defaultImages.length] }],
                  rating_average: p.rating || 4.8,
                  rating_count: p.reviews || 15,
                  sold_count: p.sold || 45,
                  in_stock: true,
                  status: "active",
                  description: p.details || p.description || ""
                });
              }
            });
          }
        } catch (e) {
          console.warn("[FirestoreSearchAdapter] Mohasagor master cache fetch error:", e);
        }

        this.indexedProducts = Array.from(productMap.values());
      }

      // Build categories & brands facets index
      const categorySet = new Map<string, { id: string; name: string; slug: string }>();
      const brandSet = new Map<string, { id: string; name: string; slug: string }>();
      const sellerSet = new Map<string, { id: string; name: string }>();

      this.indexedProducts.forEach((p) => {
        if (p.category) {
          const cName = p.category;
          const cSlug = cName.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
          categorySet.set(cName, { id: cSlug, name: cName, slug: cSlug });
        }
        if (p.brand) {
          const bName = p.brand;
          const bSlug = bName.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
          brandSet.set(bName, { id: bSlug, name: bName, slug: bSlug });
        }
        if (p.seller_name) {
          sellerSet.set(p.seller_name, { id: p.seller_id || p.seller_name, name: p.seller_name });
        }
      });

      this.indexedCategories = Array.from(categorySet.values());
      this.indexedBrands = Array.from(brandSet.values());
      this.indexedSellers = Array.from(sellerSet.values());

      this.isLoaded = true;
      this.lastFetchTime = now;
    } catch (err) {
      console.warn("[FirestoreSearchAdapter] Build index warning:", err);
    }
  }

  public async indexProduct(product: any): Promise<void> {
    const existingIdx = this.indexedProducts.findIndex((p) => p.id === product.id);
    if (existingIdx >= 0) {
      this.indexedProducts[existingIdx] = product;
    } else {
      this.indexedProducts.unshift(product);
    }
  }

  public async removeProduct(id: string): Promise<void> {
    this.indexedProducts = this.indexedProducts.filter((p) => p.id !== id);
  }

  public async getSuggestions(rawQuery: string): Promise<SearchSuggestions> {
    await this.buildIndex();
    const queryStr = rawQuery.toLowerCase().trim();

    if (!queryStr) {
      return {
        products: [],
        categories: this.indexedCategories.slice(0, 4),
        brands: this.indexedBrands.slice(0, 4),
        sellers: this.indexedSellers.slice(0, 4),
        trending: ["Wireless earbuds", "Smart watch", "Mobile phone", "Laptop", "Gaming mouse"],
        recent: searchAnalytics.getRecentSearches()
      };
    }

    const searchResult = await this.search(queryStr, { limit: 8 });

    const suggestedProducts = searchResult.products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      image: p.image,
      price: p.price,
      category: p.category
    }));

    const suggestedCategories = this.indexedCategories.filter(
      (c) => c.name.toLowerCase().includes(queryStr) || queryStr.includes(c.name.toLowerCase())
    ).slice(0, 3);

    const suggestedBrands = this.indexedBrands.filter(
      (b) => b.name.toLowerCase().includes(queryStr) || queryStr.includes(b.name.toLowerCase())
    ).slice(0, 3);

    const suggestedSellers = this.indexedSellers.filter(
      (s) => s.name.toLowerCase().includes(queryStr) || queryStr.includes(s.name.toLowerCase())
    ).slice(0, 3);

    return {
      products: suggestedProducts,
      categories: suggestedCategories,
      brands: suggestedBrands,
      sellers: suggestedSellers,
      trending: ["Wireless earbuds", "Smart watch", "Mobile phone", "Laptop"],
      recent: searchAnalytics.getRecentSearches()
    };
  }

  public async search(rawQuery: string, options: SearchOptions = {}): Promise<SearchResult> {
    await this.buildIndex();
    const queryRaw = (rawQuery || "").trim();
    const queryNorm = normalizeText(queryRaw);

    // 1. Expand query with bilingual synonym engine
    const { expandedTerms, matchedRules } = synonymManager.expandQuery(queryRaw);
    const queryTokens = queryNorm ? tokenizeText(queryNorm, true) : [];

    // 2. Score and rank products
    const scoredProducts: SearchProductResult[] = [];

    for (const p of this.indexedProducts) {
      let score = 0;
      let matchType: SearchProductResult["matchType"] = "partial";

      const pName = p.name || "";
      const pNameNorm = normalizeText(pName);
      const pDescNorm = normalizeText(p.description || p.short_description || "");
      const pCatNorm = normalizeText(p.category || "");
      const pBrandNorm = normalizeText(p.brand || "");
      const pSkuNorm = normalizeText(p.sku || "");
      const pId = String(p.id || "").toLowerCase().trim();
      const pTags = Array.isArray(p.tags) ? p.tags.map((t: string) => normalizeText(t)) : [];

      // If no search query, give all products a base score so they appear when browsing/filtering
      if (!queryNorm) {
        score = 10;
        matchType = "partial";
      } else {
        // A. Exact SKU / ID Match
        if (pSkuNorm === queryNorm || pId === queryNorm || (pSkuNorm.length >= 3 && pSkuNorm.includes(queryNorm))) {
          score += 300;
          matchType = "sku";
        }

        // B. Full Phrase Matches on Normalized Name
        if (pNameNorm === queryNorm) {
          score += 250;
          matchType = "exact";
        } else if (pNameNorm.startsWith(queryNorm)) {
          score += 180;
          matchType = "prefix";
        } else if (pNameNorm.includes(queryNorm)) {
          score += 120;
          matchType = "partial";
        }

        // C. Multi-token flexible matching (Matches words in any order without stop-word noise)
        if (queryTokens.length > 0) {
          let matchedTokensCount = 0;
          for (const token of queryTokens) {
            if (token.length < 2) continue;
            if (pNameNorm.includes(token)) {
              matchedTokensCount++;
              score += 40;
            } else if (pCatNorm.includes(token) || pBrandNorm.includes(token)) {
              matchedTokensCount += 0.5;
              score += 25;
            } else if (pDescNorm.includes(token)) {
              score += 15;
            }
          }

          // Massive bonus if ALL query tokens appear in the product title (e.g. "magic flip n cook", "casual shirt")
          if (queryTokens.length > 1 && matchedTokensCount >= queryTokens.length) {
            score += 100;
            if (matchType !== "exact") matchType = "exact";
          } else if (matchedTokensCount > 0) {
            score += Math.floor(matchedTokensCount * 20);
          }
        }

        // D. Category / Brand Match
        if (pCatNorm && (pCatNorm.includes(queryNorm) || (queryNorm.length > 3 && queryNorm.includes(pCatNorm)))) {
          score += 50;
          if (matchType === "partial") matchType = "semantic";
        }
        if (pBrandNorm && (pBrandNorm.includes(queryNorm) || (queryNorm.length > 3 && queryNorm.includes(pBrandNorm)))) {
          score += 45;
        }

        // E. Check Expanded Terms & Synonyms
        for (const term of expandedTerms) {
          if (!term) continue;
          const termNorm = normalizeText(term);
          if (!termNorm || termNorm === queryNorm) continue;
          if (pNameNorm.includes(termNorm)) {
            score += 60;
            if (matchType !== "exact" && matchType !== "sku") matchType = "synonym";
          } else if (pCatNorm.includes(termNorm)) {
            score += 40;
          }
        }

        // F. Fuzzy Typo Matching for queries >= 3 chars
        if (score === 0 && queryTokens.length > 0) {
          const nameToks = tokenizeText(pNameNorm, true);
          for (const qTok of queryTokens) {
            for (const nTok of nameToks) {
              const fuzzy = fuzzyMatchToken(qTok, nTok);
              if (fuzzy.isMatch && fuzzy.score >= 60) {
                score += fuzzy.score;
                matchType = "fuzzy";
              }
            }
          }
        }
      }

      // Only include items with significant score when querying
      const minScoreThreshold = queryNorm ? 30 : 1;

      if (score >= minScoreThreshold) {
        if (p.rating_average) score += Number(p.rating_average) * 2;
        if (p.sold_count) score += Math.min(20, Number(p.sold_count) * 0.1);
        if (p.is_featured) score += 10;
        if (p.is_best_seller) score += 10;
        if (p.in_stock !== false) score += 10;

        // Map primary image with smart resolver
        const primaryImage = p.product_images?.find((i: any) => i.is_primary)?.image_url;
        const firstImage = p.product_images?.[0]?.image_url;
        const rawImage = p.image || primaryImage || firstImage || defaultImages[0];
        const image = getSmartProductImage(p.name, rawImage);

        scoredProducts.push({
          id: p.id,
          name: p.name,
          slug: p.slug || `product-${p.id}`,
          image,
          price: parseFloat(p.discount_price || p.regular_price || p.price) || 0,
          originalPrice: p.discount_price ? parseFloat(p.regular_price) : undefined,
          rating: Number(p.rating_average) || 4.8,
          reviews: p.rating_count || 15,
          sold: p.sold_count || 40,
          category: p.category,
          brand: p.brand,
          sellerId: p.seller_id,
          sellerName: p.seller_name,
          sku: p.sku,
          isNew: p.is_new_arrival ?? false,
          isBestSeller: p.is_best_seller ?? false,
          isFeatured: p.is_featured ?? false,
          inStock: p.in_stock !== false,
          score,
          matchType
        });
      }
    }

    // 3. Filter results based on options
    let filtered = scoredProducts;

    if (options.category && options.category !== "all") {
      const c = options.category.toLowerCase().trim();
      const targetCategoryMap: Record<string, string> = {
        "electronics": "electronics",
        "fashion": "fashion",
        "home": "home",
        "beauty": "beauty",
        "watches": "watches",
        "kids": "kids"
      };
      const targetSlug = targetCategoryMap[c] || c;

      filtered = filtered.filter((p) => {
        const detected = inferProductCategory(p.name, p.category);
        if (targetSlug === "watches") return detected === "watches";
        if (targetSlug === "home") return detected === "home";
        if (targetSlug === "electronics") return detected === "electronics";
        if (targetSlug === "fashion") return detected === "fashion";
        if (targetSlug === "beauty") return detected === "beauty";
        if (targetSlug === "kids") return detected === "kids";
        return detected === targetSlug || (p.category || "").toLowerCase().includes(targetSlug);
      });
    }
    if (options.brand && options.brand !== "all") {
      const b = options.brand.toLowerCase();
      filtered = filtered.filter((p) => p.brand?.toLowerCase().includes(b));
    }
    if (options.sellerId) {
      filtered = filtered.filter((p) => p.sellerId === options.sellerId || p.sellerName === options.sellerId);
    }
    if (options.minPrice !== undefined) {
      filtered = filtered.filter((p) => p.price >= options.minPrice!);
    }
    if (options.maxPrice !== undefined) {
      filtered = filtered.filter((p) => p.price <= options.maxPrice!);
    }
    if (options.minRating !== undefined) {
      filtered = filtered.filter((p) => p.rating >= options.minRating!);
    }
    if (options.inStockOnly) {
      filtered = filtered.filter((p) => p.inStock !== false);
    }
    if (options.hasDiscount) {
      filtered = filtered.filter((p) => p.originalPrice !== undefined && p.originalPrice > p.price);
    }

    // 4. Sort results & apply 5-minute user session feed rotation
    const sortBy = options.sortBy || "relevance";
    if (sortBy === "relevance" && !queryStr) {
      const seed = getSessionSeed();
      filtered = seededShuffle(filtered, seed);
    } else {
      filtered.sort((a, b) => {
        if (sortBy === "relevance") return b.score - a.score;
        if (sortBy === "popularity") return (b.sold || 0) - (a.sold || 0);
        if (sortBy === "price_asc") return a.price - b.price;
        if (sortBy === "price_desc") return b.price - a.price;
        if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
        if (sortBy === "newest") {
          const idA = parseInt(a.id) || 0;
          const idB = parseInt(b.id) || 0;
          if (idA && idB) return idB - idA;
          return b.isNew ? 1 : -1;
        }
        return b.score - a.score;
      });
    }

    // Log analytics asynchronously
    if (queryStr) {
      searchAnalytics.logSearch(queryStr, filtered.length);
    }

    // 5. Pagination (Default 1000 items to show all catalog products)
    const page = options.page || 1;
    const limit = options.limit || 1000;
    const startIndex = (page - 1) * limit;
    const paginatedProducts = filtered.slice(startIndex, startIndex + limit);
    const totalPages = Math.ceil(filtered.length / limit) || 1;

    // 6. Build Facets
    const categoryFacetMap: Record<string, number> = {};
    const brandFacetMap: Record<string, number> = {};
    const sellerFacetMap: Record<string, { id: string; name: string; count: number }> = {};
    let minP = Infinity;
    let maxP = 0;

    scoredProducts.forEach((p) => {
      if (p.category) categoryFacetMap[p.category] = (categoryFacetMap[p.category] || 0) + 1;
      if (p.brand) brandFacetMap[p.brand] = (brandFacetMap[p.brand] || 0) + 1;
      if (p.sellerName) {
        if (!sellerFacetMap[p.sellerName]) {
          sellerFacetMap[p.sellerName] = { id: p.sellerId || p.sellerName, name: p.sellerName, count: 0 };
        }
        sellerFacetMap[p.sellerName].count += 1;
      }
      if (p.price < minP) minP = p.price;
      if (p.price > maxP) maxP = p.price;
    });

    return {
      products: paginatedProducts,
      total: filtered.length,
      page,
      totalPages,
      appliedSynonyms: matchedRules,
      facets: {
        categories: Object.entries(categoryFacetMap).map(([name, count]) => ({ name, count })),
        brands: Object.entries(brandFacetMap).map(([name, count]) => ({ name, count })),
        sellers: Object.values(sellerFacetMap),
        priceRange: { min: isFinite(minP) ? minP : 0, max: maxP || 1000 }
      }
    };
  }
}

export const firestoreSearchAdapter = new FirestoreSearchAdapter();
