import { useState } from "react";
import { Filter, ChevronDown, ChevronUp, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export interface FilterState {
  priceRange: [number, number];
  ratings: number[];
  brands: string[];
  freeShipping: boolean;
  onSale: boolean;
}

interface ProductFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableBrands?: { id: string; name: string }[];
  maxPrice?: number;
  className?: string;
}

const defaultFilters: FilterState = {
  priceRange: [0, 100000],
  ratings: [],
  brands: [],
  freeShipping: false,
  onSale: false,
};

export function ProductFilters({
  filters,
  onFiltersChange,
  availableBrands = [],
  maxPrice = 100000,
  className,
}: ProductFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const [expandedSections, setExpandedSections] = useState({
    price: true,
    rating: true,
    brand: false,
    shipping: true,
  });

  const activeFilterCount = [
    filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice,
    filters.ratings.length > 0,
    filters.brands.length > 0,
    filters.freeShipping,
    filters.onSale,
  ].filter(Boolean).length;

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const resetFilters = { ...defaultFilters, priceRange: [0, maxPrice] as [number, number] };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  const handleRatingToggle = (rating: number) => {
    setLocalFilters((prev) => ({
      ...prev,
      ratings: prev.ratings.includes(rating)
        ? prev.ratings.filter((r) => r !== rating)
        : [...prev.ratings, rating],
    }));
  };

  const handleBrandToggle = (brand: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      brands: prev.brands.includes(brand)
        ? prev.brands.filter((b) => b !== brand)
        : [...prev.brands, brand],
    }));
  };

  const FilterContent = () => (
    <div className="space-y-4">
      {/* Price Range */}
      <Collapsible open={expandedSections.price} onOpenChange={() => toggleSection("price")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-medium">
          <span>Price Range</span>
          {expandedSections.price ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 pb-4">
          <div className="px-2">
            <Slider
              value={localFilters.priceRange}
              onValueChange={(value) =>
                setLocalFilters((prev) => ({ ...prev, priceRange: value as [number, number] }))
              }
              max={maxPrice}
              step={100}
              className="mb-4"
            />
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">৳{localFilters.priceRange[0].toLocaleString()}</span>
              <span className="text-muted-foreground">to</span>
              <span className="font-medium">৳{localFilters.priceRange[1].toLocaleString()}</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Rating */}
      <Collapsible open={expandedSections.rating} onOpenChange={() => toggleSection("rating")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-medium border-t pt-4">
          <span>Rating</span>
          {expandedSections.rating ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 pb-4 space-y-2">
          {[4, 3, 2, 1].map((rating) => (
            <button
              key={rating}
              onClick={() => handleRatingToggle(rating)}
              className={cn(
                "flex items-center gap-2 w-full p-2 rounded-lg transition-colors",
                localFilters.ratings.includes(rating)
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
              <span className="text-sm">& Up</span>
            </button>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Brands */}
      {availableBrands.length > 0 && (
        <Collapsible open={expandedSections.brand} onOpenChange={() => toggleSection("brand")}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-medium border-t pt-4">
            <span>Brand</span>
            {expandedSections.brand ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 pb-4 space-y-2 max-h-48 overflow-y-auto">
            {availableBrands.map((brand) => (
              <label
                key={brand.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer"
              >
                <Checkbox
                  checked={localFilters.brands.includes(brand.id)}
                  onCheckedChange={() => handleBrandToggle(brand.id)}
                />
                <span className="text-sm">{brand.name}</span>
              </label>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Shipping & Sale */}
      <Collapsible open={expandedSections.shipping} onOpenChange={() => toggleSection("shipping")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-medium border-t pt-4">
          <span>Other Filters</span>
          {expandedSections.shipping ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 pb-4 space-y-2">
          <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer">
            <Checkbox
              checked={localFilters.freeShipping}
              onCheckedChange={(checked) =>
                setLocalFilters((prev) => ({ ...prev, freeShipping: !!checked }))
              }
            />
            <span className="text-sm">Free Shipping</span>
          </label>
          <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer">
            <Checkbox
              checked={localFilters.onSale}
              onCheckedChange={(checked) =>
                setLocalFilters((prev) => ({ ...prev, onSale: !!checked }))
              }
            />
            <span className="text-sm">On Sale</span>
          </label>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  return (
    <div className={className}>
      {/* Mobile: Sheet trigger */}
      <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
            <SheetHeader className="pb-4 border-b">
              <SheetTitle className="flex items-center justify-between">
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    Reset All
                  </Button>
                )}
              </SheetTitle>
            </SheetHeader>
            <div className="py-4 overflow-y-auto max-h-[calc(80vh-140px)]">
              <FilterContent />
            </div>
            <SheetFooter className="border-t pt-4">
              <Button onClick={handleApply} className="w-full">
                Apply Filters
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Sidebar */}
      <div className="hidden md:block bg-card border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </h3>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 text-xs">
              Reset
            </Button>
          )}
        </div>
        <FilterContent />
        <Button onClick={handleApply} className="w-full mt-4">
          Apply Filters
        </Button>
      </div>

      {/* Active filter badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {(filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice) && (
            <Badge variant="secondary" className="gap-1">
              ৳{filters.priceRange[0].toLocaleString()} - ৳{filters.priceRange[1].toLocaleString()}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() =>
                  onFiltersChange({ ...filters, priceRange: [0, maxPrice] })
                }
              />
            </Badge>
          )}
          {filters.ratings.map((rating) => (
            <Badge key={rating} variant="secondary" className="gap-1">
              {rating}+ Stars
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    ratings: filters.ratings.filter((r) => r !== rating),
                  })
                }
              />
            </Badge>
          ))}
          {filters.freeShipping && (
            <Badge variant="secondary" className="gap-1">
              Free Shipping
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFiltersChange({ ...filters, freeShipping: false })}
              />
            </Badge>
          )}
          {filters.onSale && (
            <Badge variant="secondary" className="gap-1">
              On Sale
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFiltersChange({ ...filters, onSale: false })}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
