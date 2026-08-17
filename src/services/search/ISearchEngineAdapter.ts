export interface SearchOptions {
  category?: string;
  brand?: string;
  sellerId?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStockOnly?: boolean;
  hasDiscount?: boolean;
  sortBy?: "relevance" | "popularity" | "price_asc" | "price_desc" | "rating" | "newest";
  page?: number;
  limit?: number;
}

export interface SearchProductResult {
  id: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviews: number;
  sold: number;
  category?: string;
  brand?: string;
  sellerId?: string;
  sellerName?: string;
  sku?: string;
  isNew?: boolean;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  inStock?: boolean;
  score: number;
  matchType: "exact" | "sku" | "semantic" | "synonym" | "prefix" | "partial" | "fuzzy";
}

export interface SearchSuggestions {
  products: { id: string; name: string; slug: string; image: string; price: number; category?: string }[];
  categories: { id: string; name: string; slug: string }[];
  brands: { id: string; name: string; slug: string }[];
  sellers: { id: string; name: string }[];
  trending: string[];
  recent: string[];
}

export interface SearchResult {
  products: SearchProductResult[];
  total: number;
  page: number;
  totalPages: number;
  appliedSynonyms: string[];
  correctedQuery?: string;
  facets: {
    categories: { name: string; count: number }[];
    brands: { name: string; count: number }[];
    sellers: { id: string; name: string; count: number }[];
    priceRange: { min: number; max: number };
  };
}

export interface ISearchEngineAdapter {
  search(query: string, options?: SearchOptions): Promise<SearchResult>;
  getSuggestions(query: string): Promise<SearchSuggestions>;
  indexProduct(product: any): Promise<void>;
  removeProduct(id: string): Promise<void>;
  buildIndex(products: any[]): Promise<void>;
}
