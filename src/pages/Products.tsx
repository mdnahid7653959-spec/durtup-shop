import { useState } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/products/ProductCard";
import { CombinedProductCard } from "@/components/products/CombinedProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter, ChevronRight, Globe, X, SlidersHorizontal, ArrowUpDown, Tag, Sparkles } from "lucide-react";
import { useCombinedSearch } from "@/hooks/useCombinedSearch";
import { useCategories } from "@/hooks/useProductSearch";
import { useCJSettings } from "@/hooks/useCJSettings";
import { SEOHead } from "@/components/SEOHead";

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [showFilters, setShowFilters] = useState(false);

  const pathFilter = location.pathname.includes("flash-sale") ? "flash-sale"
    : location.pathname.includes("new-arrivals") ? "new"
    : location.pathname.includes("free-shipping") ? "free-shipping"
    : undefined;

  const currentCategory = searchParams.get("category") || undefined;
  const currentSort = searchParams.get("sort") || "newest";
  const currentFilter = searchParams.get("filter") || pathFilter || "all";
  const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
  const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;

  const [minPriceInput, setMinPriceInput] = useState<string>(searchParams.get("minPrice") || "");
  const [maxPriceInput, setMaxPriceInput] = useState<string>(searchParams.get("maxPrice") || "");

  const params = {
    search: searchParams.get("search") || undefined,
    category: currentCategory,
    sort: currentSort,
    filter: currentFilter !== "all" ? currentFilter : undefined,
    minPrice,
    maxPrice,
  };

  const { data: searchResults, isLoading } = useCombinedSearch(params);
  const { data: categories } = useCategories();
  const { data: cjSettings } = useCJSettings();

  const updateFilter = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== "all") {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const applyPriceRange = () => {
    const newParams = new URLSearchParams(searchParams);
    if (minPriceInput && !isNaN(Number(minPriceInput))) {
      newParams.set("minPrice", minPriceInput);
    } else {
      newParams.delete("minPrice");
    }
    if (maxPriceInput && !isNaN(Number(maxPriceInput))) {
      newParams.set("maxPrice", maxPriceInput);
    } else {
      newParams.delete("maxPrice");
    }
    setSearchParams(newParams);
  };

  const clearPriceRange = () => {
    setMinPriceInput("");
    setMaxPriceInput("");
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("minPrice");
    newParams.delete("maxPrice");
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setMinPriceInput("");
    setMaxPriceInput("");
    setSearchParams({});
  };

  const hasFilters = searchParams.toString().length > 0;
  const localProducts = searchResults?.local || [];
  const cjProducts = searchResults?.cj || [];
  const totalCount = localProducts.length + cjProducts.length;

  const activeCategoryObj = categories?.find(c => 
    c.slug === currentCategory || 
    c.id === currentCategory || 
    c.name.toLowerCase() === (currentCategory || "").toLowerCase() ||
    c.slug === (currentCategory || "").toLowerCase()
  );

  const fallbackCategoryName = currentCategory
    ? currentCategory.toLowerCase() === "home"
      ? "Home & Kitchen"
      : currentCategory.toLowerCase() === "electronics"
      ? "Electronics & Gadgets"
      : currentCategory.toLowerCase() === "fashion"
      ? "Fashion & Clothing"
      : currentCategory.toLowerCase() === "beauty"
      ? "Health & Beauty"
      : currentCategory.toLowerCase() === "watches"
      ? "Watches & Accessories"
      : currentCategory.toLowerCase() === "kids"
      ? "Toys & Baby Care"
      : currentCategory.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    : null;

  const pageHeading = params.search 
    ? `Results for "${params.search}"`
    : activeCategoryObj 
    ? activeCategoryObj.name 
    : fallbackCategoryName
    ? fallbackCategoryName
    : currentFilter === "flash-sale"
    ? "Flash Sale & Deals"
    : currentFilter === "new"
    ? "New Arrivals"
    : currentFilter === "free-shipping"
    ? "Free Shipping Products"
    : "All Products";

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-hidden">
      <SEOHead 
        title={`${pageHeading} - MegaMart`}
        description="Browse our wide selection of products at the best prices."
      />
      <Header />
      <main className="flex-1 max-w-full overflow-hidden">
        <div className="container py-4 sm:py-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar Filters */}
            <aside className={`lg:w-64 shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
              <div className="bg-card border rounded-xl p-4 sticky top-24 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3 border-b">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <SlidersHorizontal className="h-4 w-4 text-orange-500" />
                    Filters
                  </div>
                  {hasFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7 px-2 text-muted-foreground hover:text-destructive">
                      Clear all
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Category Filter */}
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                      Category
                    </label>
                    <Select 
                      value={currentCategory || "all"} 
                      onValueChange={(v) => updateFilter("category", v === "all" ? null : v)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort By Filter */}
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      Sort By
                    </label>
                    <Select 
                      value={currentSort} 
                      onValueChange={(v) => updateFilter("sort", v)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="price-low">Price: Low to High (৳)</SelectItem>
                        <SelectItem value="price-high">Price: High to Low (৳)</SelectItem>
                        <SelectItem value="trending">Most Popular</SelectItem>
                        <SelectItem value="rating">Top Rated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Special Filter Option */}
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                      Offers & Badges
                    </label>
                    <Select 
                      value={currentFilter} 
                      onValueChange={(v) => updateFilter("filter", v === "all" ? null : v)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="All Products" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="all">All Products</SelectItem>
                        <SelectItem value="flash-sale">Flash Sale & Deals</SelectItem>
                        <SelectItem value="new">New Arrivals</SelectItem>
                        <SelectItem value="free-shipping">Free Shipping</SelectItem>
                        <SelectItem value="featured">Featured Picks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price Range Filter */}
                  <div className="pt-2 border-t space-y-2">
                    <label className="text-xs font-semibold text-foreground block">
                      Price Range (৳)
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={minPriceInput}
                        onChange={(e) => setMinPriceInput(e.target.value)}
                        className="h-8 text-xs px-2"
                      />
                      <span className="text-xs text-muted-foreground">-</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={maxPriceInput}
                        onChange={(e) => setMaxPriceInput(e.target.value)}
                        className="h-8 text-xs px-2"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={applyPriceRange} className="flex-1 h-7 text-xs bg-orange-600 hover:bg-orange-500 text-white">
                        Apply
                      </Button>
                      {(minPrice !== undefined || maxPrice !== undefined) && (
                        <Button size="sm" variant="outline" onClick={clearPriceRange} className="h-7 text-xs px-2">
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {/* Quick Price Range Presets */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setMinPriceInput("");
                          setMaxPriceInput("500");
                          const p = new URLSearchParams(searchParams);
                          p.delete("minPrice");
                          p.set("maxPrice", "500");
                          setSearchParams(p);
                        }}
                        className="text-[11px] py-1 px-2 rounded border bg-muted/30 hover:bg-muted text-center transition-colors truncate"
                      >
                        Under ৳500
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMinPriceInput("500");
                          setMaxPriceInput("1000");
                          const p = new URLSearchParams(searchParams);
                          p.set("minPrice", "500");
                          p.set("maxPrice", "1000");
                          setSearchParams(p);
                        }}
                        className="text-[11px] py-1 px-2 rounded border bg-muted/30 hover:bg-muted text-center transition-colors truncate"
                      >
                        ৳500 - ৳1K
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMinPriceInput("1000");
                          setMaxPriceInput("2500");
                          const p = new URLSearchParams(searchParams);
                          p.set("minPrice", "1000");
                          p.set("maxPrice", "2500");
                          setSearchParams(p);
                        }}
                        className="text-[11px] py-1 px-2 rounded border bg-muted/30 hover:bg-muted text-center transition-colors truncate"
                      >
                        ৳1K - ৳2.5K
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMinPriceInput("2500");
                          setMaxPriceInput("");
                          const p = new URLSearchParams(searchParams);
                          p.set("minPrice", "2500");
                          p.delete("maxPrice");
                          setSearchParams(p);
                        }}
                        className="text-[11px] py-1 px-2 rounded border bg-muted/30 hover:bg-muted text-center transition-colors truncate"
                      >
                        ৳2,500+
                      </button>
                    </div>
                  </div>

                  {/* CJ Products Info */}
                  {cjSettings?.is_enabled && (
                    <div className="pt-3 border-t">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Globe className="h-3.5 w-3.5 text-blue-500" />
                        <span>International products included</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground min-w-0 truncate">
                    {pageHeading}
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Showing <span className="font-semibold text-foreground">{totalCount}</span> products found
                  </p>
                </div>
                
                <Button variant="outline" className="lg:hidden" onClick={() => setShowFilters(!showFilters)}>
                  <Filter className="h-4 w-4 mr-2" />
                  Filters {hasFilters && `(${Array.from(searchParams.keys()).length})`}
                </Button>
              </div>

              {/* Active Filter Badges */}
              {hasFilters && (
                <div className="flex flex-wrap items-center gap-2 mb-4 p-2.5 rounded-xl bg-muted/30 border">
                  <span className="text-xs text-muted-foreground font-medium mr-1">Active:</span>
                  {currentCategory && (
                    <Badge variant="secondary" className="gap-1 text-xs font-normal">
                      Category: {activeCategoryObj?.name || currentCategory}
                      <button onClick={() => updateFilter("category", null)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {currentSort && currentSort !== "newest" && (
                    <Badge variant="secondary" className="gap-1 text-xs font-normal">
                      Sort: {currentSort}
                      <button onClick={() => updateFilter("sort", "newest")} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {currentFilter && currentFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1 text-xs font-normal">
                      Filter: {currentFilter}
                      <button onClick={() => updateFilter("filter", null)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {(minPrice !== undefined || maxPrice !== undefined) && (
                    <Badge variant="secondary" className="gap-1 text-xs font-normal">
                      Price: ৳{minPrice || 0} - {maxPrice ? `৳${maxPrice}` : "Any"}
                      <button onClick={clearPriceRange} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  <button onClick={clearFilters} className="text-xs text-orange-600 hover:underline font-medium ml-auto">
                    Reset all
                  </button>
                </div>
              )}

              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-square bg-muted rounded-xl mb-3" />
                      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : totalCount > 0 ? (
                <>
                  {cjProducts.length > 0 && (
                    <div className="flex items-center gap-4 mb-4">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {cjProducts.length} International
                      </Badge>
                    </div>
                  )}

                  {/* Local Products Grid */}
                  {localProducts.length > 0 && (
                    <div className="space-y-4 mb-8">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {localProducts.map((product) => (
                          <ProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CJ Products Section */}
                  {cjProducts.length > 0 && (
                    <>
                      {localProducts.length > 0 && (
                        <div className="flex items-center gap-3 my-6">
                          <div className="h-px flex-1 bg-border" />
                          <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1">
                            <Globe className="h-3.5 w-3.5" />
                            International Products
                          </Badge>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {cjProducts.map(product => (
                          <CombinedProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-16">
                  <p className="text-muted-foreground mb-4">No products found.</p>
                  <Button onClick={clearFilters}>Clear Filters</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
