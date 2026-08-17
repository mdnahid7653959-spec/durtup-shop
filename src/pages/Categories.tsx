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

const defaultMohasagorCats: Category[] = [
  { id: "cat-electronics", name: "Electronics & Gadgets", slug: "electronics", image_url: "https://mohasagor.com.bd/public/storage/images/products/eLWq6za5bthOuiTD40ZvFOjinbTfMEnbRIaCJkP3.png", parent_id: null },
  { id: "cat-fashion", name: "Fashion & Clothing", slug: "fashion", image_url: "https://mohasagor.com.bd/public/storage/images/products/mgiwhl1BwLXSNkjjGmle1UBdV68gFeTAM89wbC7j.png", parent_id: null },
  { id: "cat-home", name: "Home & Kitchen", slug: "home", image_url: "https://mohasagor.com.bd/public/storage/images/products/8zdCA2XuHO7IB9dH6Ezm6jJub4AePatuDvhSKFPV.jpg", parent_id: null },
  { id: "cat-beauty", name: "Health & Beauty", slug: "beauty", image_url: "https://mohasagor.com.bd/public/storage/images/products/Z5cO12U9EbUwsd52tjuZwRL2QFaIalS47wpkxNfV.jpg", parent_id: null },
  { id: "cat-watches", name: "Watches & Accessories", slug: "watches", image_url: "https://mohasagor.com.bd/public/storage/images/products/oOyfIL7udV4sQxq1Sz9uVFX5iGiQ8DWfKa6QhegT.png", parent_id: null },
  { id: "cat-kids", name: "Toys & Baby Care", slug: "kids", image_url: "https://mohasagor.com.bd/public/storage/images/products/UpG8zJxrUofDm6wzCVE1WUVWvoxz7nNdIiFk8xoK.jpg", parent_id: null },
];

const Categories = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>(defaultMohasagorCats);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(defaultMohasagorCats[0]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("id, name, slug, image_url, parent_id")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (!error && data && data.length > 0) {
          const parentCategories = data.filter(c => !c.parent_id);
          const childCategories = data.filter(c => c.parent_id);

          const categoriesWithChildren = parentCategories.map(parent => ({
            ...parent,
            children: childCategories.filter(child => child.parent_id === parent.id),
          }));

          if (categoriesWithChildren.length > 0) {
            setCategories(categoriesWithChildren);
            setSelectedCategory(categoriesWithChildren[0]);
          }
        }
      } catch (error) {
        console.warn("Category fetch notice:", error);
      }
    };

    fetchCategories();
  }, []);

  // Fetch products when category changes
  useEffect(() => {
    let isMounted = true;
    const fetchProducts = async () => {
      if (!selectedCategory) return;
      setProductsLoading(true);

      try {
        // 1. Get cached / live Mohasagor API products
        const allMohasagor = await getCachedMohasagorProducts();
        let instantFiltered: Product[] = [];
        if (allMohasagor && allMohasagor.length > 0) {
          instantFiltered = filterProductsByCategory(allMohasagor, selectedCategory.slug, selectedCategory.name);
          if (isMounted && instantFiltered.length > 0) {
            setProducts(instantFiltered);
            setProductsLoading(false);
          }
        }

        // 2. Query DB products if available
        let mappedDbProducts: Product[] = [];
        try {
          const { data: prodData } = await supabase
            .from("products")
            .select(`
              *,
              product_images(image_url, is_primary)
            `)
            .or(`category_id.eq.${selectedCategory.id},category.ilike.%${selectedCategory.slug}%`)
            .limit(30);

          if (prodData && prodData.length > 0) {
            mappedDbProducts = prodData.map((p: any) => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              image: p.product_images?.find((img: any) => img.is_primary)?.image_url || p.product_images?.[0]?.image_url || "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop",
              price: p.discount_price || p.regular_price || 0,
              originalPrice: p.discount_price ? p.regular_price : undefined,
              rating: Number(p.rating_average) || 4.8,
              reviews: p.rating_count || 18,
              sold: p.sold_count || 40,
              freeShipping: p.free_shipping ?? true,
              isNew: p.is_new_arrival ?? true,
              isBestSeller: p.is_best_seller ?? false,
            }));
          }
        } catch {}

        // Combine DB + Supplier products
        const merged = [...mappedDbProducts, ...instantFiltered];
        const unique = new Map<string, Product>();
        merged.forEach(p => {
          if (!unique.has(p.id)) unique.set(p.id, p);
        });

        if (isMounted) {
          setProducts(Array.from(unique.values()));
        }
      } catch (err) {
        console.warn("Categories fetchProducts error:", err);
      } finally {
        if (isMounted) setProductsLoading(false);
      }
    };

    fetchProducts();
    return () => { isMounted = false; };
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
