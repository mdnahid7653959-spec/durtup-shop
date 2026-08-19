import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Search, Heart, User, Menu, X, ChevronDown, Truck, HelpCircle, Package, Store, ChevronRight, LogOut, Home, Zap, Smartphone, Shirt, Home as HomeIcon, Dumbbell, Gamepad2, Sparkles, Car, Gem, LucideIcon, MessageCircle, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/firebaseAdapter";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { SmartSearchBar } from "@/components/search/SmartSearchBar";
import { useCategories } from "@/hooks/useProductSearch";

interface CategoryItem {
  name: string;
  Icon: LucideIcon;
  gradient: string;
  subcategories: string[];
}

const defaultCategories: CategoryItem[] = [{
  name: "Electronics", Icon: Smartphone, gradient: "from-blue-500 to-cyan-400",
  subcategories: ["Smartphones", "Laptops", "Tablets", "Cameras", "Headphones"]
}, {
  name: "Fashion", Icon: Shirt, gradient: "from-pink-500 to-rose-400",
  subcategories: ["Men's Clothing", "Women's Clothing", "Shoes", "Bags", "Accessories"]
}, {
  name: "Home & Garden", Icon: HomeIcon, gradient: "from-green-500 to-emerald-400",
  subcategories: ["Furniture", "Kitchen", "Bedding", "Decor", "Garden Tools"]
}, {
  name: "Sports", Icon: Dumbbell, gradient: "from-orange-500 to-amber-400",
  subcategories: ["Fitness", "Outdoor", "Team Sports", "Water Sports", "Cycling"]
}, {
  name: "Toys & Hobbies", Icon: Gamepad2, gradient: "from-purple-500 to-violet-400",
  subcategories: ["Video Games", "Board Games", "Puzzles", "Drones", "RC Toys"]
}, {
  name: "Beauty & Health", Icon: Sparkles, gradient: "from-pink-400 to-fuchsia-400",
  subcategories: ["Skincare", "Makeup", "Hair Care", "Fragrances", "Personal Care"]
}, {
  name: "Automotive", Icon: Car, gradient: "from-slate-500 to-zinc-400",
  subcategories: ["Car Electronics", "Accessories", "Tools", "Parts", "Motorcycle"]
}, {
  name: "Jewelry", Icon: Gem, gradient: "from-amber-400 to-yellow-300",
  subcategories: ["Rings", "Necklaces", "Earrings", "Bracelets", "Watches"]
}];

const defaultTrendingSearches = ["Wireless earbuds", "Phone cases", "Smart watch", "LED lights", "Summer dress"];

interface TopBarConfig { text: string; visible: boolean; }
interface NavLinkConfig { label: string; href: string; highlight?: boolean; color?: string; }

interface HeaderConfig {
  logo_url: string;
  logo_text: string;
  show_search: boolean;
  show_categories_bar: boolean;
  top_bar: TopBarConfig;
  nav_links: NavLinkConfig[];
  trending_searches: string[];
}

const defaultHeaderConfig: HeaderConfig = {
  logo_url: "/durtup-logo.svg",
  logo_text: "Durtup.shop",
  show_search: true,
  show_categories_bar: true,
  top_bar: { text: "Free Shipping on ৳999+", visible: true },
  nav_links: [
    { label: "Home", href: "/", highlight: false },
  ],
  trending_searches: defaultTrendingSearches,
};

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCategories, setShowCategories] = useState(false);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const rawCatParam = searchParams.get("category");
  const currentCategory = (rawCatParam || "").toLowerCase().trim();

  const isHomeActive = location.pathname === "/" && !currentCategory;
  const isAllProductsActive = (location.pathname === "/products" || location.pathname.startsWith("/product/")) && !currentCategory;
  const { user, profile, signOut } = useAuth();
  const { itemCount: cartCount } = useCart();
  const { itemCount: wishlistCount } = useWishlist();
  const { toast } = useToast();
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const { data: categoriesData } = useCategories();
  const { config: headerConfig } = useSiteConfig<HeaderConfig>("header", defaultHeaderConfig);

  const logoUrl = headerConfig.logo_url || defaultHeaderConfig.logo_url;
  const showSearch = headerConfig.show_search !== false;
  const showCategoriesBar = headerConfig.show_categories_bar !== false;
  const topBar = headerConfig.top_bar || defaultHeaderConfig.top_bar;
  const navLinks = headerConfig.nav_links?.length ? headerConfig.nav_links : defaultHeaderConfig.nav_links;
  const trendingSearches = headerConfig.trending_searches?.length ? headerConfig.trending_searches : defaultTrendingSearches;

  useEffect(() => {
    if (!user) { setHasUnreadMessages(false); return; }

    const checkUnread = async () => {
      const { data: buyerConvs } = await supabase
        .from("conversations").select("buyer_unread_count")
        .eq("buyer_id", user.id).gt("buyer_unread_count", 0).limit(1);

      if (buyerConvs && buyerConvs.length > 0) { setHasUnreadMessages(true); return; }

      const { data: sellerData } = await supabase
        .from("sellers").select("id")
        .eq("user_id", user.id).eq("status", "approved").limit(1);

      if (sellerData && sellerData.length > 0) {
        const { data: sellerConvs } = await supabase
          .from("conversations").select("seller_unread_count")
          .eq("seller_id", sellerData[0].id).gt("seller_unread_count", 0).limit(1);
        if (sellerConvs && sellerConvs.length > 0) { setHasUnreadMessages(true); return; }
      }
      setHasUnreadMessages(false);
    };

    checkUnread();
    const channel = supabase
      .channel("unread-messages-indicator")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => checkUnread())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations" }, () => checkUnread())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast({ title: "Logged out", description: "You've been successfully logged out." });
      navigate("/");
    } catch (error) { console.error("Logout error:", error); }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
  };

  const categories = defaultCategories;

  return (
    <header className="sticky top-0 z-50 w-full max-w-[100vw] overflow-x-clip shadow-lg" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>

      {/* Main header */}
      <div className="bg-primary text-primary-foreground">
        <div className="px-2.5 sm:container py-1.5 sm:py-2">
          <div className="flex items-center justify-between gap-1 sm:gap-6 relative">
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <Link 
                to="/categories" 
                className="p-1.5 hover:bg-white/10 active:scale-95 rounded-lg transition-all flex items-center justify-center text-white"
                aria-label="Open Categories"
                title="Browse Categories"
              >
                <Menu className="h-5 w-5" />
              </Link>

              <Link 
                to="/" 
                className="flex items-center shrink-0 group py-0.5 z-10"
              >
                <img 
                  alt="Durtup.shop" 
                  className="h-10 sm:h-12 md:h-13 lg:h-14 w-auto object-contain transition-transform group-hover:scale-105 filter drop-shadow-md" 
                  src={(logoUrl && !logoUrl.includes("durtup-logo.svg")) ? logoUrl : "/durtup-logo-transparent.png?v=7"} 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/durtup-logo-transparent.png";
                  }}
                />
              </Link>
            </div>

            {/* Search bar - Perfectly Centered */}
            {showSearch && (
              <div className="flex-1 max-w-2xl mx-4 hidden md:block">
                <SmartSearchBar variant="desktop" trendingSearches={trendingSearches} />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 flex flex-col items-center h-auto py-1 px-1.5 sm:px-2 rounded-md">
                    <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="text-[8px] sm:text-[9px] leading-none mt-0.5 font-medium">
                      {user ? profile?.full_name?.split(' ')[0] || 'Account' : 'Account'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover">
                  {user ? (
                    <>
                      <div className="p-3 border-b">
                        <p className="text-sm font-medium">{profile?.full_name || 'Welcome!'}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <DropdownMenuItem asChild><Link to="/orders" className="cursor-pointer">My Orders</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link to="/wishlist" className="cursor-pointer">Wishlist</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link to="/account" className="cursor-pointer">Account Settings</Link></DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                        <LogOut className="h-4 w-4 mr-2" /> Logout
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <div className="p-3 border-b">
                        <p className="text-sm font-medium">Welcome to Durtup.shop!</p>
                        <div className="flex gap-2 mt-2">
                          <Button asChild size="sm" className="flex-1"><Link to="/login">Sign In</Link></Button>
                          <Button asChild variant="outline" size="sm" className="flex-1"><Link to="/register">Register</Link></Button>
                        </div>
                      </div>
                      <DropdownMenuItem asChild><Link to="/orders" className="cursor-pointer">My Orders</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link to="/wishlist" className="cursor-pointer">Wishlist</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link to="/account" className="cursor-pointer">Account Settings</Link></DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Link to="/messages">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 flex flex-col items-center h-auto py-1 px-1.5 sm:px-2 rounded-md relative">
                  <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-[8px] sm:text-[9px] leading-none mt-0.5 font-medium">Messages</span>
                  {hasUnreadMessages && <span className="absolute top-0 right-0.5 h-2 w-2 rounded-full bg-green-400 border border-primary animate-pulse" />}
                </Button>
              </Link>

              <Link to="/wishlist">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 flex flex-col items-center h-auto py-1 px-1.5 sm:px-2 rounded-md relative">
                  <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-[8px] sm:text-[9px] leading-none mt-0.5 font-medium">Wishlist</span>
                  {wishlistCount > 0 && <span className="absolute -top-0.5 right-0 h-3.5 w-3.5 rounded-full bg-warning text-[8px] font-bold text-warning-foreground flex items-center justify-center">{wishlistCount > 99 ? "99+" : wishlistCount}</span>}
                </Button>
              </Link>

              <Link to="/cart" className="hidden sm:block">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 flex flex-col items-center h-auto py-1 px-1.5 sm:px-2 rounded-md relative">
                  <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-[8px] sm:text-[9px] leading-none mt-0.5 font-medium">Cart</span>
                  {cartCount > 0 && <span className="absolute -top-0.5 right-0 h-3.5 w-3.5 rounded-full bg-warning text-[8px] font-bold text-warning-foreground flex items-center justify-center">{cartCount > 99 ? "99+" : cartCount}</span>}
                </Button>
              </Link>
            </div>
          </div>

          {/* Mobile search */}
          {showSearch && (
            <div className="mt-1.5 md:hidden">
              <SmartSearchBar variant="mobile" trendingSearches={trendingSearches} />
            </div>
          )}

        </div>
      </div>

      {/* Categories nav - desktop */}
      {showCategoriesBar && (
        <nav className="border-t border-border/40 bg-card/95 backdrop-blur-md hidden lg:block shadow-xs sticky top-0 z-40">
          <div className="container">
            <ul className="flex items-center gap-2 py-2 text-sm overflow-x-auto scrollbar-none">
              <li>
                <Link
                  to="/"
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all duration-200 whitespace-nowrap flex items-center justify-center h-9 shadow-2xs hover:shadow-sm active:scale-95 ${
                    isHomeActive
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 bg-muted/40 text-foreground/85 hover:text-primary hover:bg-primary/10 hover:border-primary/40"
                  }`}
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/products"
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all duration-200 whitespace-nowrap flex items-center justify-center h-9 shadow-2xs hover:shadow-sm active:scale-95 ${
                    isAllProductsActive
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 bg-muted/40 text-foreground/85 hover:text-primary hover:bg-primary/10 hover:border-primary/40"
                  }`}
                >
                  All Products
                </Link>
              </li>
              {[
                { name: "Electronics & Gadgets", slug: "electronics" },
                { name: "Home & Kitchen", slug: "home" },
                { name: "Fashion & Clothing", slug: "fashion" },
                { name: "Health & Beauty", slug: "beauty" },
                { name: "Watches & Accessories", slug: "watches" },
                { name: "Toys & Baby Care", slug: "kids" }
              ].map((cat) => {
                const catSlug = cat.slug.toLowerCase();
                const catName = cat.name.toLowerCase();
                const isActive = currentCategory === catSlug || currentCategory === catName;
                return (
                  <li key={cat.slug}>
                    <Link
                      to={`/products?category=${encodeURIComponent(cat.slug)}`}
                      className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all duration-200 whitespace-nowrap flex items-center justify-center h-9 shadow-2xs hover:shadow-sm active:scale-95 ${
                        isActive
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/60 bg-muted/40 text-foreground/85 hover:text-primary hover:bg-primary/10 hover:border-primary/40"
                      }`}
                    >
                      {cat.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      )}

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="lg:hidden border-t glass-strong animate-slide-down max-h-[70vh] overflow-y-auto overscroll-contain scrollbar-hide">
          <nav className="container py-3 px-3">
            <div className="space-y-1">
              <Link to="/" className="flex items-center gap-3 py-3 px-4 rounded-xl bg-primary/10 text-primary font-bold touch-manipulation press-scale" onClick={() => setIsMenuOpen(false)}>
                <Home className="h-5 w-5" /> Home
              </Link>
              <Link to="/flash-sale" className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-muted active:bg-muted/80 transition-colors text-sale font-bold touch-manipulation press-scale" onClick={() => setIsMenuOpen(false)}>
                <Zap className="h-5 w-5" /> Flash Sale
              </Link>
              <Link to="/products" className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-muted active:bg-muted/80 transition-colors font-semibold touch-manipulation press-scale" onClick={() => setIsMenuOpen(false)}>
                <Package className="h-5 w-5" /> All Products
              </Link>

              <div className="border-t my-2"></div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold px-4 py-1.5">Categories</p>

              <div className="grid grid-cols-2 gap-1.5">
                {categories.map((category) => (
                  <Link key={category.name} to={`/category/${category.name.toLowerCase().replace(/ & /g, '-')}`}
                    className="group flex items-center gap-2.5 py-3 px-3 rounded-xl hover:bg-gradient-to-r hover:from-primary/10 hover:to-transparent active:bg-muted/80 transition-all duration-300 touch-manipulation press-scale border border-transparent hover:border-primary/20"
                    onClick={() => setIsMenuOpen(false)}>
                    <span className="font-semibold text-xs text-foreground/80 group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-300 truncate">
                      {category.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
