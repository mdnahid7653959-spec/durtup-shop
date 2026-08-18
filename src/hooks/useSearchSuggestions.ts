import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { smartSearchService } from "@/services/search/SmartSearchService";
import { getCachedMohasagorProducts } from "@/utils/mohasagorCache";
import { normalizeText } from "@/services/search/FuzzySearchEngine";

export interface SuggestProduct {
  id: string;
  name: string;
  slug: string;
  regular_price: number;
  discount_price: number | null;
  stock_quantity: number;
  rating_average: number;
  rating_count: number;
  image: string | null;
}

export interface SuggestCategory {
  id: string;
  name: string;
  slug: string;
}

export interface SuggestBrand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

export interface SuggestResult {
  products: SuggestProduct[];
  categories: SuggestCategory[];
  brands: SuggestBrand[];
  sellers: { id: string; name: string }[];
  trending: string[];
  recent: string[];
}

/** Debounce any value */
export function useDebounced<T>(value: T, delay = 50): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

async function fetchSuggestions(q: string): Promise<SuggestResult> {
  const term = q.trim();
  if (!term) {
    return {
      products: [],
      categories: [],
      brands: [],
      sellers: [],
      trending: ["Wireless earbuds", "Smart watch", "Mobile phone", "Laptop"],
      recent: getRecentSearches()
    };
  }

  const suggestions = await smartSearchService.getSuggestions(term);

  let products: SuggestProduct[] = (suggestions.products || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    regular_price: p.price,
    discount_price: null,
    stock_quantity: 10,
    rating_average: 4.8,
    rating_count: 15,
    image: p.image || null,
  }));

  // If search service returned 0 products, do an instant fallback scan on local catalog
  if (products.length === 0 && term) {
    try {
      const cached = await getCachedMohasagorProducts();
      if (cached && cached.length > 0) {
        const norm = normalizeText(term);
        const normWords = norm.split(" ").filter(w => w.length > 0);

        const matched = cached.filter((p: any) => {
          const pNorm = normalizeText(p.name || "");
          const pWords = pNorm.split(" ");
          
          if (pNorm.includes(norm)) return true;
          if (pWords.some(w => w.startsWith(norm))) return true;
          if (normWords.length > 1 && normWords.every(nw => pNorm.includes(nw))) return true;
          return false;
        }).slice(0, 8);

        products = matched.map((p: any) => ({
          id: p.id,
          name: p.name,
          slug: p.slug || `product-${p.id}`,
          regular_price: p.price,
          discount_price: p.originalPrice ? p.price : null,
          stock_quantity: 10,
          rating_average: p.rating || 4.8,
          rating_count: p.reviews || 15,
          image: p.image || null,
        }));
      }
    } catch {}
  }

  const categories: SuggestCategory[] = (suggestions.categories || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
  }));

  const brands: SuggestBrand[] = (suggestions.brands || []).map((b: any) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    logo_url: null,
  }));

  return {
    products,
    categories,
    brands,
    sellers: suggestions.sellers || [],
    trending: suggestions.trending || [],
    recent: suggestions.recent || [],
  };
}

export function useSearchSuggestions(rawQuery: string) {
  const query = useDebounced(rawQuery, 200);
  return useQuery({
    queryKey: ["smart-search-suggest", query],
    queryFn: () => fetchSuggestions(query),
    enabled: true,
    staleTime: 15_000,
  });
}

/* Recent searches (localStorage) */
const RECENT_KEY = "durtup_recent_searches";
const MAX_RECENT = 8;

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : ["Wireless earbuds", "Smart watch", "Mobile phone"];
  } catch {
    return [];
  }
}

export function pushRecentSearch(term: string) {
  const t = term.trim();
  if (!t) return;
  try {
    const list = getRecentSearches().filter((x) => x.toLowerCase() !== t.toLowerCase());
    list.unshift(t);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {
    /* ignore */
  }
}

export function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    /* ignore */
  }
}

export function removeRecentSearch(term: string) {
  try {
    const t = term.trim().toLowerCase();
    const list = getRecentSearches().filter((x) => x.toLowerCase() !== t);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
