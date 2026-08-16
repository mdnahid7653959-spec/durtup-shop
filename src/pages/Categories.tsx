import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getCachedMohasagorProducts, filterProductsByCategory } from "@/utils/mohasagorCache";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ProductCard, type Product } from "@/components/products/ProductCard";
import { supabase } from "@/lib/firebaseAdapter";
import { 
  ChevronRight, Loader2, Package, 
  Smartphone, Shirt, Home, Dumbbell, Gamepad2, 
  Sparkles, Car, Gem, Baby, Watch, Headphones, 
  Wrench, ShoppingBag, Gift, LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Category icon mapping
const categoryIcons: Record<string, LucideIcon> = {
  "electronics": Smartphone,
  "fashion": Shirt,
  "home-garden": Home,
  "sports": Dumbbell,
  "toys-hobbies": Gamepad2,
  "toys": Gamepad2,
  "beauty-health": Sparkles,
  "beauty": Sparkles,
  "automotive": Car,
  "jewelry": Gem,
  "baby-kids": Baby,
  "watches": Watch,
  "audio": Headphones,
  "tools": Wrench,
  "accessories": ShoppingBag,
  "gifts": Gift,
};

const getCategoryIcon = (slug: string): LucideIcon => {
  return categoryIcons[slug] || ShoppingBag;
};

interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  parent_id: string | null;
  children?: Category[];
}

const Categories = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("id, name, slug, image_url, parent_id")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (error) throw error;

        // Build category tree
        const parentCategories = (data || []).filter(c => !c.parent_id);
        const childCategories = (data || []).filter(c => c.parent_id);

        const categoriesWithChildren = parentCategories.map(parent => ({
          ...parent,
          children: childCategories.filter(child => child.parent_id === parent.id),
        }));

        const defaultMohasagorCats: Category[] = [
          { id: "cat-electronics", name: "Electronics & Gadgets", slug: "electronics", image_url: null, parent_id: null },
          { id: "cat-fashion", name: "Fashion & Clothing", slug: "fashion", image_url: null, parent_id: null },
          { id: "cat-home", name: "Home & Kitchen", slug: "home", image_url: null, parent_id: null },
          { id: "cat-beauty", name: "Health & Beauty", slug: "beauty", image_url: null, parent_id: null },
          { id: "cat-watches", name: "Watches & Accessories", slug: "watches", image_url: null, parent_id: null },
          { id: "cat-kids", name: "Toys & Baby Care", slug: "kids", image_url: null, parent_id: null },
        ];

        const finalCats = categoriesWithChildren.length > 0 ? categoriesWithChildren : defaultMohasagorCats;
        setCategories(finalCats);
        if (finalCats.length > 0) {
          setSelectedCategory(finalCats[0]);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Fetch products when category changes
  useEffect(() => {
    const fetchProducts = async () => {
      if (!selectedCategory) return;
      
      // Fast Path: Check cached Mohasagor products first (0ms)
      const cachedMohasagor = await getCachedMohasagorProducts();
      if (cachedMohasagor.length > 0) {
        const instantFiltered = filterProductsByCategory(cachedMohasagor, selectedCategory.slug, selectedCategory.name);
        setProducts(instantFiltered);
        setProductsLoading(false); // 0ms Instant render!
      } else {
        setProductsLoading(true);
      }

      try {
        let mappedProducts: Product[] = [];
        if (!selectedCategory.id.startsWith("cat-")) {
          const { data, error } = await supabase
            .from("products")
            .select(`
              *,
              product_images(image_url, is_primary)
            `)
            .eq("category_id", selectedCategory.id)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(20);

          if (!error && data && data.length > 0) {
            mappedProducts = data.map(p => {
              const primaryImage = p.product_images?.find((img: any) => img.is_primary)?.image_url;
              const firstImage = p.product_images?.[0]?.image_url;
              const fallbackImage = "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop";
              
              return {
                id: p.id,
                name: p.name,
                slug: p.slug,
                image: primaryImage || firstImage || fallbackImage,
                price: p.discount_price || p.regular_price,
                originalPrice: p.discount_price ? p.regular_price : undefined,
                rating: Number(p.rating_average) || 0,
                reviews: p.rating_count || 0,
                sold: p.sold_count || 0,
                freeShipping: p.free_shipping || false,
                isNew: p.is_new_arrival || false,
                isBestSeller: p.is_best_seller || false,
              };
            });
            setProducts(mappedProducts);
          }
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, [selectedCategory]);

  const handleCategoryClick = (category: Category) => {
    navigate(`/category/${category.slug}`);
  };

  const handleParentClick = (category: Category) => {
    setSelectedCategory(category);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center pb-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 pb-20 md:pb-0">
        {/* Mobile: Two-column layout */}
        <div className="md:hidden flex h-[calc(100vh-60px-60px)]">
          {/* Left sidebar - Parent categories */}
          <div className="w-24 bg-muted/30 border-r overflow-y-auto">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleParentClick(category)}
                className={cn(
                  "w-full p-3 flex flex-col items-center gap-1.5 text-center transition-colors border-l-2",
                  selectedCategory?.id === category.id
                    ? "bg-background border-l-primary text-primary"
                    : "border-l-transparent text-muted-foreground hover:bg-background/50"
                )}
              >
                {category.image_url ? (
                  <img
                    src={category.image_url}
                    alt={category.name}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  (() => {
                    const IconComponent = getCategoryIcon(category.slug);
                    return (
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <IconComponent className="h-5 w-5" />
                      </div>
                    );
                  })()
                )}
                <span className="text-[10px] font-medium line-clamp-2 leading-tight">
                  {category.name}
                </span>
              </button>
            ))}
          </div>

          {/* Right content - Products */}
          <div className="flex-1 overflow-y-auto p-2">
            {selectedCategory && (
              <>
                {/* Category Header */}
                <div className="flex items-center justify-between p-2 mb-2 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl">
                  <div className="flex items-center gap-2">
                    {selectedCategory.image_url ? (
                      <img
                        src={selectedCategory.image_url}
                        alt={selectedCategory.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      (() => {
                        const IconComponent = getCategoryIcon(selectedCategory.slug);
                        return (
                          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                            <IconComponent className="h-5 w-5 text-primary" />
                          </div>
                        );
                      })()
                    )}
                    <div className="text-left">
                      <h2 className="font-semibold text-sm">{selectedCategory.name}</h2>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {products.length} Products
                      </Badge>
                    </div>
                  </div>
                  <Link 
                    to={`/category/${selectedCategory.slug}`}
                    className="text-xs text-primary font-medium flex items-center gap-0.5"
                  >
                    All <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>

                {/* Products Grid */}
                {productsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : products.length > 0 ? (
                  <div className="grid grid-cols-2 gap-1.5">
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground text-xs">No products yet</p>
                    <p className="text-muted-foreground/70 text-[10px] mt-1">
                      Products will appear here when added
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Desktop: Grid layout */}
        <div className="hidden md:block max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold mb-6">All Categories</h1>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((category) => (
              <div key={category.id} className="bg-card rounded-xl border p-4">
                <button
                  onClick={() => handleCategoryClick(category)}
                  className="flex items-center gap-3 mb-4 w-full hover:text-primary transition-colors"
                >
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt={category.name}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                  ) : (
                    (() => {
                      const IconComponent = getCategoryIcon(category.slug);
                      return (
                        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                          <IconComponent className="h-6 w-6" />
                        </div>
                      );
                    })()
                  )}
                  <div className="text-left flex-1">
                    <h3 className="font-semibold">{category.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {category.children?.length || 0} subcategories
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>

                {category.children && category.children.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {category.children.slice(0, 4).map((child) => (
                      <button
                        key={child.id}
                        onClick={() => handleCategoryClick(child)}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                      >
                        {child.image_url ? (
                          <img
                            src={child.image_url}
                            alt={child.name}
                            className="w-8 h-8 rounded object-cover"
                          />
                        ) : (
                          (() => {
                            const IconComponent = getCategoryIcon(child.slug);
                            return (
                              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                <IconComponent className="h-4 w-4" />
                              </div>
                            );
                          })()
                        )}
                        <span className="text-xs line-clamp-1">{child.name}</span>
                      </button>
                    ))}
                    {category.children.length > 4 && (
                      <button
                        onClick={() => handleCategoryClick(category)}
                        className="flex items-center justify-center p-2 rounded-lg bg-muted/30 text-xs text-primary"
                      >
                        +{category.children.length - 4} more
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Categories;
