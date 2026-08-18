import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X, Loader2, Clock, TrendingUp, Star, Package, Tag, Store, Camera } from "lucide-react";
import {
  useSearchSuggestions,
  getRecentSearches,
  pushRecentSearch,
  clearRecentSearches,
  type SuggestProduct,
} from "@/hooks/useSearchSuggestions";
import { ImageSearchModal } from "./ImageSearchModal";
import { cn } from "@/lib/utils";

interface SmartSearchBarProps {
  variant?: "desktop" | "mobile";
  className?: string;
  placeholder?: string;
  trendingSearches?: string[];
  autoFocus?: boolean;
  onNavigate?: () => void;
}

type Row =
  | { type: "recent" | "trending" | "category" | "brand"; label: string; href: string }
  | { type: "product"; label: string; href: string; product: SuggestProduct };

function Highlight({ text, term }: { text: string; term: string }) {
  const q = term.trim();
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/15 text-primary rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

function currency(n: number) {
  return `৳${n.toLocaleString("en-BD")}`;
}

export function SmartSearchBar({
  variant = "desktop",
  className,
  placeholder = "Search products, brands and categories...",
  trendingSearches = ["Wireless earbuds", "Smart watch", "Phone case", "LED lights", "Summer dress"],
  autoFocus,
  onNavigate,
}: SmartSearchBarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isFetching } = useSearchSuggestions(query);
  const hasQuery = query.trim().length >= 1;

  useEffect(() => {
    setRecent(getRecentSearches());
  }, [open]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const rows: Row[] = useMemo(() => {
    const r: Row[] = [];
    if (!hasQuery) {
      recent.forEach((s) => r.push({ type: "recent", label: s, href: `/products?search=${encodeURIComponent(s)}` }));
      trendingSearches.forEach((s) =>
        r.push({ type: "trending", label: s, href: `/products?search=${encodeURIComponent(s)}` })
      );
      return r;
    }
    (data?.products || []).forEach((p) =>
      r.push({ type: "product", label: p.name, href: `/product/${p.slug}`, product: p })
    );
    (data?.categories || []).forEach((c) =>
      r.push({ type: "category", label: c.name, href: `/category/${c.slug}` })
    );
    (data?.brands || []).forEach((b) =>
      r.push({ type: "brand", label: b.name, href: `/products?brand=${encodeURIComponent(b.slug)}` })
    );
    return r;
  }, [hasQuery, data, recent, trendingSearches]);

  const submit = useCallback(
    (term: string) => {
      const t = term.trim();
      if (!t) return;
      pushRecentSearch(t);
      setOpen(false);
      onNavigate?.();
      navigate(`/products?search=${encodeURIComponent(t)}`);
    },
    [navigate, onNavigate]
  );

  const goto = useCallback(
    (row: Row) => {
      if (row.type !== "product") pushRecentSearch(row.label);
      setOpen(false);
      onNavigate?.();
      navigate(row.href);
    },
    [navigate, onNavigate]
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.min(rows.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(-1, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && rows[activeIdx]) goto(rows[activeIdx]);
      else submit(query);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const showDropdown =
    open && (hasQuery ? true : rows.length > 0);
  // Mobile: tap opens dedicated /search page for a richer experience
  if (variant === "mobile") {
    return (
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          navigate("/search");
        }}
        aria-label="Open search"
        className={cn(
          "w-full h-10 pl-3.5 pr-1 flex items-center gap-2 rounded-full",
          "bg-background/95 border border-border/60 shadow-lg shadow-black/5 text-left",
          "active:scale-[0.99] transition",
          className
        )}
      >
        <Search className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
        <span className="flex-1 min-w-0 truncate text-[13px] text-muted-foreground/70">
          {placeholder}
        </span>
        <span
          aria-hidden
          className="h-8 w-8 grid place-items-center rounded-full bg-primary text-primary-foreground shrink-0"
        >
          <Search className="h-3.5 w-3.5" />
        </span>
      </button>
    );
  }

  return (
    <div ref={wrapRef} className={cn("relative w-full", className)}>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(query);
        }}
        role="search"
        aria-label="Site search"
      >
        <div
          className={cn(
            "group flex items-center bg-background/95 backdrop-blur border border-border/60",
            "rounded-full shadow-lg shadow-black/5 transition-all duration-200 overflow-hidden",
            "focus-within:border-primary/60 focus-within:shadow-xl focus-within:shadow-primary/10 focus-within:ring-2 focus-within:ring-primary/20",
            variant === "desktop" ? "h-11 gap-2 pl-4 pr-1.5" : "h-10 gap-2 pl-3.5 pr-1"
          )}
        >


          <Search className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
          <input
            ref={inputRef}
            autoFocus={autoFocus}
            type="search"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls="smart-search-listbox"
            aria-autocomplete="list"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(-1);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className={cn(
              "flex-1 min-w-0 bg-transparent text-foreground placeholder:text-muted-foreground/70 outline-none border-0 leading-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
              variant === "desktop" ? "text-sm" : "text-[13px]"
            )}
          />

          {isFetching && hasQuery && (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" aria-hidden />
          )}
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                setActiveIdx(-1);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="submit"
            aria-label="Search"
            className={cn(
              "inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0",
              "hover:bg-primary/90 active:scale-95 transition-all shadow-sm",
              variant === "desktop" ? "h-8 px-3.5 text-xs font-semibold gap-1.5" : "h-8 w-8"
            )}
          >
            <Search className={variant === "desktop" ? "h-4 w-4" : "h-3.5 w-3.5"} />
            {variant === "desktop" && <span>Search</span>}
          </button>
        </div>
      </form>

      {showDropdown && (
        <div
          id="smart-search-listbox"
          role="listbox"
          className={cn(
            "absolute left-0 right-0 top-full mt-2 z-[60]",
            "bg-popover text-popover-foreground border border-border/60 rounded-2xl shadow-2xl",
            "overflow-hidden animate-in fade-in-0 slide-in-from-top-1 duration-150"
          )}
        >
          <div className="max-h-[70vh] overflow-y-auto overscroll-contain">
            {/* No query state */}
            {!hasQuery && (
              <div className="p-3 space-y-3">
                {recent.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between px-2 pb-1.5">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3 w-3" /> Recent
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          clearRecentSearches();
                          setRecent([]);
                        }}
                        className="text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 px-2">
                      {recent.map((s, i) => (
                        <button
                          key={s}
                          onMouseEnter={() => setActiveIdx(i)}
                          onClick={() => submit(s)}
                          className={cn(
                            "text-xs px-3 py-1.5 rounded-full border border-border bg-muted/50",
                            "hover:bg-primary/10 hover:border-primary/40 transition-colors",
                            activeIdx === i && "bg-primary/10 border-primary/40"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </section>
                )}
                <section>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-2 pb-1.5">
                    <TrendingUp className="h-3 w-3" /> Trending
                  </h4>
                  <div className="flex flex-wrap gap-1.5 px-2">
                    {trendingSearches.map((s, i) => {
                      const idx = recent.length + i;
                      return (
                        <button
                          key={s}
                          onMouseEnter={() => setActiveIdx(idx)}
                          onClick={() => submit(s)}
                          className={cn(
                            "text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/10 to-primary/5",
                            "text-primary hover:from-primary/20 hover:to-primary/10 transition-colors",
                            activeIdx === idx && "from-primary/20 to-primary/10"
                          )}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* Query state */}
            {hasQuery && (
              <>
                {rows.length === 0 && !isFetching && (
                  <div className="p-8 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Search className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No results for "{query}"</p>
                    <p className="text-xs text-muted-foreground mt-1">Try different keywords or check spelling</p>
                    <button
                      onClick={() => submit(query)}
                      className="mt-3 text-xs font-semibold text-primary hover:underline"
                    >
                      Search anyway →
                    </button>
                  </div>
                )}

                {(data?.products?.length || 0) > 0 && (
                  <section className="py-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-4 pb-1.5 flex items-center gap-1.5">
                      <Package className="h-3 w-3" /> Products
                    </h4>
                    {data!.products.map((p, i) => {
                      const rowIdx = i;
                      const active = activeIdx === rowIdx;
                      const inStock = p.stock_quantity > 0;
                      const price = p.discount_price ?? p.regular_price;
                      const hasDiscount = p.discount_price != null && p.discount_price < p.regular_price;
                      return (
                        <Link
                          key={p.id}
                          to={`/product/${p.slug}`}
                          state={{ preloadedProduct: p }}
                          role="option"
                          aria-selected={active}
                          onMouseEnter={() => {
                            setActiveIdx(rowIdx);
                            if (p.image) {
                              const img = new Image();
                              img.src = p.image;
                            }
                          }}
                          onClick={() => {
                            setOpen(false);
                            onNavigate?.();
                          }}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2 transition-colors",
                            active ? "bg-primary/10" : "hover:bg-muted/50"
                          )}
                        >
                          <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden shrink-0 border">
                            {p.image ? (
                              <img
                                src={p.image}
                                alt={p.name}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                <Package className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              <Highlight text={p.name} term={query} />
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-sm font-bold text-primary">{currency(price)}</span>
                              {hasDiscount && (
                                <span className="text-[11px] text-muted-foreground line-through">
                                  {currency(p.regular_price)}
                                </span>
                              )}
                              {p.rating_count > 0 && (
                                <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                                  <Star className="h-3 w-3 fill-warning text-warning" />
                                  {p.rating_average.toFixed(1)} ({p.rating_count})
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0",
                              inStock ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                            )}
                          >
                            {inStock ? "In stock" : "Out"}
                          </span>
                        </Link>
                      );
                    })}
                  </section>
                )}

                {(data?.categories?.length || 0) > 0 && (
                  <section className="py-2 border-t border-border/50">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-4 pb-1.5 flex items-center gap-1.5">
                      <Tag className="h-3 w-3" /> Categories
                    </h4>
                    {data!.categories.map((c, i) => {
                      const rowIdx = (data?.products.length || 0) + i;
                      const active = activeIdx === rowIdx;
                      return (
                        <Link
                          key={c.id}
                          to={`/category/${c.slug}`}
                          onMouseEnter={() => setActiveIdx(rowIdx)}
                          onClick={() => {
                            setOpen(false);
                            onNavigate?.();
                          }}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 text-sm transition-colors",
                            active ? "bg-primary/10" : "hover:bg-muted/50"
                          )}
                        >
                          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                          <Highlight text={c.name} term={query} />
                        </Link>
                      );
                    })}
                  </section>
                )}

                {(data?.brands?.length || 0) > 0 && (
                  <section className="py-2 border-t border-border/50">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-4 pb-1.5 flex items-center gap-1.5">
                      <Store className="h-3 w-3" /> Brands
                    </h4>
                    {data!.brands.map((b, i) => {
                      const rowIdx = (data?.products.length || 0) + (data?.categories.length || 0) + i;
                      const active = activeIdx === rowIdx;
                      return (
                        <Link
                          key={b.id}
                          to={`/products?brand=${encodeURIComponent(b.slug)}`}
                          onMouseEnter={() => setActiveIdx(rowIdx)}
                          onClick={() => {
                            setOpen(false);
                            onNavigate?.();
                          }}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 text-sm transition-colors",
                            active ? "bg-primary/10" : "hover:bg-muted/50"
                          )}
                        >
                          {b.logo_url ? (
                            <img src={b.logo_url} alt="" className="h-4 w-4 object-contain" />
                          ) : (
                            <Store className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <Highlight text={b.name} term={query} />
                        </Link>
                      );
                    })}
                  </section>
                )}

                {rows.length > 0 && (
                  <button
                    type="button"
                    onClick={() => submit(query)}
                    className="w-full py-2.5 text-xs font-semibold text-primary bg-muted/40 hover:bg-primary/10 border-t border-border/50 transition-colors"
                  >
                    See all results for "{query}" →
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
