import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Search as SearchIcon, X, Clock, TrendingUp, Loader2, Star, Camera } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/firebaseAdapter";
import {
  useSearchSuggestions,
  getRecentSearches,
  pushRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from "@/hooks/useSearchSuggestions";
import { ImageSearchModal } from "@/components/search/ImageSearchModal";
import { cn } from "@/lib/utils";

function currency(n: number) {
  return `৳${n.toLocaleString("en-BD")}`;
}

function Highlight({ text, term }: { text: string; term: string }) {
  const q = term.trim();
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/15 text-primary rounded px-0.5">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

/** Popular = most searched across the whole site (aggregate from search_history) */
function usePopularSearches() {
  return useQuery({
    queryKey: ["popular-searches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("search_history")
        .select("search_term, query")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const counts = new Map<string, number>();
      (data || []).forEach((r: any) => {
        const raw = (r.search_term || r.query || "").toString().trim();
        if (!raw) return;
        const k = raw.toLowerCase();
        counts.set(k, (counts.get(k) || 0) + 1);
      });
      return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([term]) => term);
    },
    staleTime: 5 * 60_000,
  });
}

const FALLBACK_TRENDING = [
  "Wireless earbuds",
  "Smart watch",
  "Phone case",
  "LED lights",
  "Summer dress",
  "Sneakers",
  "Backpack",
  "Skincare",
];

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: suggestions, isFetching } = useSearchSuggestions(query);
  const { data: popular } = usePopularSearches();
  const trending = popular && popular.length ? popular : FALLBACK_TRENDING;

  useEffect(() => {
    setRecent(getRecentSearches());
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const hasQuery = query.trim().length >= 1;

  const submit = (t: string) => {
    const term = t.trim();
    if (!term) return;
    pushRecentSearch(term);
    navigate(`/products?search=${encodeURIComponent(term)}`);
  };

  const removeOne = (t: string) => {
    removeRecentSearch(t);
    setRecent(getRecentSearches());
  };

  const clearAll = () => {
    clearRecentSearches();
    setRecent([]);
    setEditMode(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky search header */}
      <div className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-md w-full">
        <div className="max-w-2xl mx-auto flex items-center gap-2 px-3 py-2 sm:px-4">
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-full hover:bg-white/10 active:scale-95 transition shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(query);
            }}
            className="flex-1 min-w-0"
          >
            <div className="flex items-center gap-2 bg-background text-foreground rounded-full h-10 px-3 shadow-inner w-full">
              <SearchIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, brands, categories..."
                className="flex-1 min-w-0 bg-transparent outline-none border-0 text-[13px] placeholder:text-muted-foreground/70 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
              />
              {isFetching && hasQuery && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
              )}
              {query && (
                <button
                  type="button"
                  aria-label="Clear"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="p-1 rounded-full text-muted-foreground hover:bg-muted shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6 max-w-2xl mx-auto pb-24">
        {/* Live suggestions */}
        {hasQuery ? (
          <div className="space-y-4">
            {suggestions?.products?.length ? (
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">
                  Products
                </h3>
                <ul className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/50">
                  {suggestions.products.map((p) => {
                    const price = p.discount_price ?? p.regular_price;
                    return (
                      <li key={p.id}>
                        <Link
                          to={`/product/${p.slug}`}
                          onClick={() => pushRecentSearch(query)}
                          className="flex items-center gap-3 p-2.5 hover:bg-muted/50 transition"
                        >
                          <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden shrink-0">
                            {p.image && (
                              <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              <Highlight text={p.name} term={query} />
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs">
                              <span className="font-semibold text-foreground">{currency(price)}</span>
                              {p.discount_price && (
                                <span className="text-muted-foreground line-through">
                                  {currency(p.regular_price)}
                                </span>
                              )}
                              {p.rating_average > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  {p.rating_average.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0",
                              p.stock_quantity > 0
                                ? "bg-green-500/10 text-green-600"
                                : "bg-destructive/10 text-destructive"
                            )}
                          >
                            {p.stock_quantity > 0 ? "In stock" : "Out"}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {suggestions?.categories?.length ? (
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">
                  Categories
                </h3>
                <div className="flex flex-wrap gap-2">
                  {suggestions.categories.map((c) => (
                    <Link
                      key={c.id}
                      to={`/category/${c.slug}`}
                      className="px-3 py-1.5 rounded-full border border-border/70 bg-card text-sm hover:bg-muted"
                    >
                      <Highlight text={c.name} term={query} />
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {!suggestions?.products?.length &&
              !suggestions?.categories?.length &&
              !isFetching && (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground mb-3">No results for "{query}"</p>
                  <button
                    onClick={() => submit(query)}
                    className="text-sm text-primary font-semibold"
                  >
                    Search anyway →
                  </button>
                </div>
              )}
          </div>
        ) : (
          <>
            {/* Recent searches */}
            <section>
              <div className="flex items-center justify-between px-1 mb-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Recent searches
                </h3>
                {recent.length > 0 && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setEditMode((v) => !v)}
                      className="text-xs font-medium text-primary"
                    >
                      {editMode ? "Done" : "Edit"}
                    </button>
                    {editMode && (
                      <button
                        onClick={clearAll}
                        className="text-xs font-medium text-destructive"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                )}
              </div>
              {recent.length === 0 ? (
                <p className="text-xs text-muted-foreground px-1">
                  No recent searches yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {recent.map((t) => (
                    <div
                      key={t}
                      className="group inline-flex items-center gap-1 rounded-full border border-border/70 bg-card pl-3 pr-1 h-8 text-sm hover:bg-muted transition"
                    >
                      <button
                        className="truncate max-w-[160px]"
                        onClick={() => submit(t)}
                      >
                        {t}
                      </button>
                      <button
                        aria-label={`Remove ${t}`}
                        onClick={() => removeOne(t)}
                        className={cn(
                          "h-6 w-6 grid place-items-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition",
                          editMode ? "opacity-100" : "opacity-0 group-hover:opacity-100 md:opacity-100"
                        )}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Popular / trending */}
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2 inline-flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Popular on Darzo
              </h3>
              <div className="flex flex-wrap gap-2">
                {trending.map((t, i) => (
                  <button
                    key={t}
                    onClick={() => submit(t)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 h-8 text-sm font-medium hover:bg-primary/20 transition"
                  >
                    <span className="text-[10px] font-bold opacity-70">{i + 1}</span>
                    {t}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
