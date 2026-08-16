import { useState, useEffect, useCallback, TouchEvent } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Smartphone, Shirt, Home, Dumbbell, Gamepad2, Sparkles, Car, Gem, Gift, Percent, Crown, Truck, Star, ArrowRight, Zap, Tag, ShoppingBag, Heart, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/firebaseAdapter";
import { useSiteConfig } from "@/hooks/useSiteConfig";

const iconMap: Record<string, any> = {
  truck: Truck, percent: Percent, crown: Crown, gift: Gift, star: Star,
  zap: Zap, tag: Tag, "shopping-bag": ShoppingBag, heart: Heart, award: Award,
  sparkles: Sparkles, smartphone: Smartphone,
};
interface Banner {
  id: string;
  title: string;
  image_url: string;
  mobile_image_url: string | null;
  link_url: string | null;
  position: string;
  sort_order: number | null;
  is_active: boolean;
  image_fit: string;
  image_position: string;
}

// Fallback slides in case DB is empty
const fallbackSlides = [{
  id: "1",
  title: "Summer Sale",
  subtitle: "Up to 70% Off",
  description: "Shop the biggest deals on electronics & fashion",
  cta: "Shop Now",
  bgGradient: "from-primary via-orange-500 to-amber-500",
  image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&h=500&fit=crop"
}, {
  id: "2",
  title: "New Tech",
  subtitle: "Latest Gadgets",
  description: "Discover cutting-edge smartphones & laptops",
  cta: "Explore",
  bgGradient: "from-violet-600 via-purple-600 to-indigo-600",
  image: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800&h=500&fit=crop"
}, {
  id: "3",
  title: "Fashion",
  subtitle: "Trendy Styles",
  description: "Get the latest fashion at unbeatable prices",
  cta: "Shop Fashion",
  bgGradient: "from-rose-500 via-pink-500 to-fuchsia-500",
  image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=500&fit=crop"
}];
const sideCategories = [{
  name: "Electronics",
  icon: Smartphone,
  href: "/category/electronics",
  color: "group-hover:text-blue-500"
}, {
  name: "Fashion",
  icon: Shirt,
  href: "/category/fashion",
  color: "group-hover:text-pink-500"
}, {
  name: "Home & Garden",
  icon: Home,
  href: "/category/home-garden",
  color: "group-hover:text-emerald-500"
}, {
  name: "Sports",
  icon: Dumbbell,
  href: "/category/sports",
  color: "group-hover:text-orange-500"
}, {
  name: "Toys & Games",
  icon: Gamepad2,
  href: "/category/toys",
  color: "group-hover:text-purple-500"
}, {
  name: "Beauty",
  icon: Sparkles,
  href: "/category/beauty",
  color: "group-hover:text-rose-500"
}, {
  name: "Automotive",
  icon: Car,
  href: "/category/automotive",
  color: "group-hover:text-slate-500"
}, {
  name: "Jewelry",
  icon: Gem,
  href: "/category/jewelry",
  color: "group-hover:text-amber-500"
}];
const defaultQuickLinks = [
  { title: "Free Ship", subtitle: "৳999+", icon: "truck", color: "from-blue-500 to-indigo-600", href: "/products?filter=free-shipping" },
  { title: "Flash Sale", subtitle: "Limited", icon: "percent", color: "from-rose-500 to-pink-600", href: "/products?filter=flash-sale" },
  { title: "Premium", subtitle: "VIP", icon: "crown", color: "from-amber-500 to-orange-600", href: "/products?filter=featured" },
];

// Gradient colors to cycle through for banners
const bannerGradients = ["from-primary via-orange-500 to-amber-500", "from-violet-600 via-purple-600 to-indigo-600", "from-rose-500 via-pink-500 to-fuchsia-500", "from-emerald-600 via-teal-500 to-cyan-500", "from-blue-600 via-indigo-500 to-purple-500"];
export function HeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  const { config: quickLinksConfig } = useSiteConfig<any[]>("hero_quick_links", defaultQuickLinks);
  const quickLinks = (quickLinksConfig || defaultQuickLinks).map((link: any) => ({
    ...link,
    icon: iconMap[link.icon] || Truck,
  }));

  // Fetch banners from database
  useEffect(() => {
    async function fetchBanners() {
      try {
        const {
          data,
          error
        } = await supabase.from("cms_banners").select("*").eq("is_active", true).eq("position", "hero").order("sort_order", {
          ascending: true
        });
        if (error) {
          console.error("Error fetching banners:", error);
          return;
        }
        if (data && data.length > 0) {
          setBanners(data);
        }
      } catch (err) {
        console.error("Failed to fetch banners:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBanners();
  }, []);

  // Determine which slides to use
  const slides = banners.length > 0 ? banners.map((banner, index) => ({
    id: banner.id,
    title: banner.title,
    subtitle: "",
    description: "",
    cta: "Shop Now",
    bgGradient: bannerGradients[index % bannerGradients.length],
    image: banner.image_url,
    link: banner.link_url || "/products",
    imageFit: banner.image_fit || "cover",
    imagePosition: banner.image_position || "center"
  })) : fallbackSlides.map(s => ({
    ...s,
    link: "/products",
    imageFit: "cover" as string,
    imagePosition: "center" as string
  }));
  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);
  const goToSlide = (index: number) => setCurrentSlide(index);
  const prevSlide = () => setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);
  const nextSlide = () => setCurrentSlide(prev => (prev + 1) % slides.length);

  // Touch handlers for swipe
  const minSwipeDistance = 50;
  const onTouchStart = useCallback((e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);
  const onTouchMove = useCallback((e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);
  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) nextSlide();
    if (isRightSwipe) prevSlide();
  }, [touchStart, touchEnd]);
  return <div className="flex gap-4 lg:gap-5 px-2 sm:px-0">
      {/* Left sidebar - Categories (Desktop only) */}
      <div className="hidden lg:block w-56 xl:w-60 shrink-0">
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden h-full">
          <div className="p-3.5 bg-gradient-to-r from-primary to-orange-500 text-primary-foreground font-bold text-sm flex items-center gap-2">
            <span className="w-5 h-0.5 bg-white/50 rounded-full" />
            <span>All Categories</span>
          </div>
          <nav className="py-2">
            {sideCategories.map((cat, index) => <Link key={cat.name} to={cat.href} className="group flex items-center gap-3 px-4 py-3 transition-all duration-300 border-l-2 border-transparent hover:border-primary hover:bg-gradient-to-r hover:from-primary/10 hover:to-transparent relative overflow-hidden" style={{
            animationDelay: `${index * 30}ms`
          }}>
                {/* Hover glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Premium text with gradient on hover */}
                <span className="relative font-bold text-sm tracking-wide text-foreground/70 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-primary group-hover:via-orange-500 group-hover:to-amber-500 group-hover:bg-clip-text transition-all duration-300 group-hover:translate-x-1">
                  {cat.name}
                </span>
                
                {/* Arrow indicator */}
                <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground/40 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 group-hover:text-primary transition-all duration-300" />
              </Link>)}
          </nav>
          <div className="p-3.5 border-t bg-muted/30">
            <Link to="/categories" className="flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 font-semibold group">
              View All
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 min-w-0 space-y-2.5 sm:space-y-3">
        {/* Main carousel - Mobile-first swipeable */}
        {loading ? <Skeleton className="h-[240px] xs:h-[270px] sm:h-[320px] md:h-[360px] lg:h-[420px] rounded-3xl" /> : <div className="relative overflow-hidden rounded-3xl shadow-2xl ring-1 ring-black/5" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
            <div className="flex transition-transform duration-700 ease-out will-change-transform" style={{
          transform: `translateX(-${currentSlide * 100}%)`
        }}>
              {slides.map(slide => <Link key={slide.id} to={slide.link} className={`min-w-full h-[240px] xs:h-[270px] sm:h-[320px] md:h-[360px] lg:h-[420px] flex items-center relative overflow-hidden bg-black group`}>
                  {/* Background image */}
                  <div className="absolute inset-0">
                    <img src={slide.image} alt={slide.title} className="w-full h-full transition-transform duration-[7000ms] group-hover:scale-110" style={{ objectFit: slide.imageFit as any, objectPosition: slide.imagePosition }} loading="lazy" />
                  </div>

                  {/* Cinematic gradient overlays */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                  {/* Content */}
                  <div className="relative z-10 px-6 sm:px-8 lg:px-12 w-full">
                    <div className="max-w-[90%] sm:max-w-md lg:max-w-lg text-white">
                      {slide.subtitle && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-[11px] sm:text-xs font-bold mb-3 sm:mb-4 border border-white/30 shadow-lg">
                          <Star className="h-3 w-3 fill-white" />
                          {slide.subtitle}
                        </span>}

                      <h2 className="text-3xl xs:text-4xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-2 sm:mb-3 drop-shadow-2xl leading-[1.05] tracking-tight">
                        {slide.title}
                      </h2>

                      {slide.description && <p className="text-sm sm:text-base md:text-lg opacity-95 mb-4 sm:mb-5 line-clamp-2 max-w-xs sm:max-w-md drop-shadow-lg">
                          {slide.description}
                        </p>}

                      <Button size="sm" className="bg-white text-foreground hover:bg-white/95 font-bold shadow-2xl press-scale transition-all h-11 sm:h-12 px-6 sm:px-7 text-sm sm:text-base rounded-xl">
                        {slide.cta}
                        <ArrowRight className="h-4 w-4 ml-1.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="absolute -right-16 -bottom-16 w-48 h-48 sm:w-80 sm:h-80 bg-primary/20 rounded-full blur-3xl" />
                  <div className="absolute -left-20 -top-20 w-40 h-40 sm:w-64 sm:h-64 bg-white/10 rounded-full blur-3xl" />
                </Link>)}
            </div>

          </div>}



      </div>

      {/* Right sidebar - Promo cards (Desktop XL only) */}
      <div className="hidden xl:flex flex-col gap-3 w-60 shrink-0">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary via-orange-500 to-amber-500 rounded-2xl p-4 text-white flex-1 shadow-lg">
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">New User Offer</span>
            </div>
            <h3 className="text-lg font-bold mb-1">First Order?</h3>
            <p className="text-xs opacity-90 mb-3">Get 15% off with code</p>
            <div className="bg-white/20 backdrop-blur-md rounded-lg px-3 py-2 text-center font-mono font-bold text-lg border border-white/30">
              WELCOME15
            </div>
            <Link to="/register">
              <Button size="sm" variant="secondary" className="w-full mt-3 bg-white text-primary hover:bg-white/90 font-bold shadow-lg h-9 text-xs">
                Sign Up Now
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 rounded-2xl p-4 text-white flex-1 shadow-lg">
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Mobile App</span>
            </div>
            <h3 className="text-lg font-bold mb-1">Download App</h3>
            <p className="text-xs opacity-90 mb-3">Get ৳50 off your first app order</p>
            <div className="flex gap-2">
              <div className="flex-1 bg-white/20 backdrop-blur-md rounded-lg p-2 text-center border border-white/30 hover:bg-white/30 transition-colors cursor-pointer">
                <span className="text-[10px] font-semibold block">App Store</span>
              </div>
              <div className="flex-1 bg-white/20 backdrop-blur-md rounded-lg p-2 text-center border border-white/30 hover:bg-white/30 transition-colors cursor-pointer">
                <span className="text-[10px] font-semibold block">Play Store</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border-2 border-primary/20 rounded-2xl p-4 hover:border-primary/40 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Free Shipping</h3>
              <p className="text-xs text-muted-foreground">On orders over ৳999</p>
            </div>
          </div>
        </div>
      </div>
    </div>;
}
