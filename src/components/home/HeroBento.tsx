import { memo, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cpu, Shirt, Home as HomeIcon, Sparkles as SparklesIcon, ShoppingCart, Zap } from "lucide-react";
import type { Product } from "@/components/products/ProductCard";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { useIsMobile } from "@/hooks/use-mobile";
import { titleStyle, subtitleStyle, type TextStyle } from "@/lib/bentoText";
import { getCachedMohasagorProducts, filterProductsByCategory } from "@/utils/mohasagorCache";


interface HeroBentoProps {
  forYou?: Product[];
  flashSale?: Product[];
  trending?: Product[];
}

interface BentoTileCfg {
  id: string;
  visible: boolean;
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  link?: string;
  objectFit?: "cover" | "contain" | "fill";
  focalX?: number;
  focalY?: number;
  overlay?: number;
  bgColor?: string;
  zoom?: number;
  textStyle?: TextStyle;
  badge?: string;
  badgeVisible?: boolean;
  ctaText?: string;
}


interface CustomSection {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  link?: string;
  layout: "full" | "split-left" | "split-right";
  bgColor?: string;
  overlay?: number;
  focalX?: number;
  focalY?: number;
  visible: boolean;
  textStyle?: TextStyle;
}

function imgStyle(t: Partial<BentoTileCfg>): React.CSSProperties {
  return {
    objectFit: (t.objectFit ?? "cover") as any,
    objectPosition: `${t.focalX ?? 50}% ${t.focalY ?? 50}%`,
    transform: `scale(${(t.zoom ?? 100) / 100})`,
    transformOrigin: `${t.focalX ?? 50}% ${t.focalY ?? 50}%`,
  };
}



const CATEGORIES = [
  {
    id: "cat_tech",
    name: "Tech & Gadgets",
    sub: "Smart Devices",
    tag: "⚡ 40% OFF",
    to: "/category/electronics",
    defaultImg: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=85",
    shadow: "shadow-blue-500/15",
    badgeColor: "bg-blue-600/90 text-white border-blue-400/50",
  },
  {
    id: "cat_lifestyle",
    name: "Fashion & Lifestyle",
    sub: "Trendy Styles",
    tag: "🔥 TRENDING",
    to: "/category/fashion",
    defaultImg: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format&fit=crop&q=85",
    shadow: "shadow-pink-500/15",
    badgeColor: "bg-pink-600/90 text-white border-pink-400/50",
  },
  {
    id: "cat_home",
    name: "Home & Living",
    sub: "Modern Decor",
    tag: "🏡 LUXURY DECOR",
    to: "/category/home",
    defaultImg: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&auto=format&fit=crop&q=85",
    shadow: "shadow-amber-500/15",
    badgeColor: "bg-amber-600/90 text-white border-amber-400/50",
  },
  {
    id: "cat_beauty",
    name: "Beauty & Care",
    sub: "Glow Essentials",
    tag: "💄 GLOW ESSENTIALS",
    to: "/category/beauty",
    defaultImg: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&auto=format&fit=crop&q=85",
    shadow: "shadow-purple-500/15",
    badgeColor: "bg-purple-600/90 text-white border-purple-400/50",
  },
];

function useCountdown(days = 30) {
  const STORAGE_KEY = "flash_sale_target_end_time";
  const [timeLeft, setTimeLeft] = useState(() => {
    const now = Date.now();
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const target = parseInt(stored, 10);
          if (target > now) {
            return Math.floor((target - now) / 1000);
          }
        }
        const newTarget = now + days * 24 * 3600 * 1000;
        localStorage.setItem(STORAGE_KEY, String(newTarget));
      } catch {}
    }
    return days * 24 * 3600;
  });

  useEffect(() => {
    const i = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : days * 24 * 3600));
    }, 1000);
    return () => clearInterval(i);
  }, [days]);

  const d = String(Math.floor(timeLeft / (3600 * 24))).padStart(2, "0");
  const h = String(Math.floor((timeLeft % (3600 * 24)) / 3600)).padStart(2, "0");
  const m = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, "0");
  const s = String(timeLeft % 60).padStart(2, "0");
  return { d, h, m, s, formatted: `${d}d ${h}:${m}:${s}` };
}

function validUrl(url?: string, fallback = ""): string {
  if (!url || typeof url !== "string") return fallback;
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  return fallback;
}

function normalizeKeyword(str: string): string {
  const s = str.toLowerCase();
  if (s.includes("bra") || s.includes("panties") || s.includes("underwear") || s.includes("lingerie") || s.includes("inner")) return "underwear";
  if (s.includes("watch") || s.includes("smartwatch") || s.includes("ghori")) return "watch";
  if (s.includes("shirt") || s.includes("t-shirt") || s.includes("panjabi") || s.includes("polo") || s.includes("jersey") || s.includes("pant") || s.includes("gabardine") || s.includes("trouser") || s.includes("khimar") || s.includes("palazzo") || s.includes("dress") || s.includes("clothing") || s.includes("fashion")) return "fashion";
  if (s.includes("earbud") || s.includes("headphone") || s.includes("earphone") || s.includes("speaker") || s.includes("audio") || s.includes("sound")) return "audio";
  if (s.includes("lamp") || s.includes("light") || s.includes("fan") || s.includes("projector") || s.includes("mouse") || s.includes("keyboard") || s.includes("router") || s.includes("cable") || s.includes("charger") || s.includes("dispenser") || s.includes("gadget") || s.includes("electronic")) return "gadgets";
  if (s.includes("cream") || s.includes("oil") || s.includes("serum") || s.includes("lotion") || s.includes("soap") || s.includes("shampoo") || s.includes("skincare") || s.includes("beauty")) return "beauty";
  if (s.includes("pillow") || s.includes("decor") || s.includes("mug") || s.includes("bottle") || s.includes("kitchen") || s.includes("home") || s.includes("living")) return "home";
  return s.replace(/[^a-z0-9]/g, "").slice(0, 8);
}

function getSmartPersonalizedForYou(candidates: Product[]): Product[] {
  if (!candidates || candidates.length === 0) return [];

  // Read user preference categories and browsing history from localStorage
  let userInterests: string[] = [];
  try {
    if (typeof window !== "undefined") {
      const viewedCats = localStorage.getItem("user_viewed_categories");
      if (viewedCats) {
        const arr = JSON.parse(viewedCats);
        if (Array.isArray(arr)) {
          userInterests.push(...arr.map((c: string) => normalizeKeyword(String(c))));
        }
      }
      const viewedProds = localStorage.getItem("recently_viewed_products");
      if (viewedProds) {
        const arr = JSON.parse(viewedProds);
        if (Array.isArray(arr)) {
          userInterests.push(...arr.map((p: any) => normalizeKeyword(p.name || p.title || p.category || "")));
        }
      }
    }
  } catch {}

  const seenIds = new Set<string>();
  const seenTypes = new Set<string>();
  const selected: Product[] = [];

  // 1. First priority: Pick unique, distinct products matching user's top viewed categories
  if (userInterests.length > 0) {
    for (const p of candidates) {
      if (selected.length >= 3) break;
      const type = normalizeKeyword(p.name + " " + ((p as any).category || ""));
      if (!seenIds.has(p.id) && !seenTypes.has(type)) {
        if (userInterests.some((ui) => ui && (type.includes(ui) || ui.includes(type)))) {
          seenIds.add(p.id);
          seenTypes.add(type);
          selected.push(p);
        }
      }
    }
  }

  // 2. Second priority: Fill remaining slots with completely unique products from DIFFERENT categories
  for (const p of candidates) {
    if (selected.length >= 3) break;
    const type = normalizeKeyword(p.name + " " + ((p as any).category || ""));
    if (!seenIds.has(p.id) && !seenTypes.has(type)) {
      seenIds.add(p.id);
      seenTypes.add(type);
      selected.push(p);
    }
  }

  // 3. Fallback: If still not enough, pick by ID deduplication
  for (const p of candidates) {
    if (selected.length >= 3) break;
    if (!seenIds.has(p.id)) {
      seenIds.add(p.id);
      selected.push(p);
    }
  }

  return selected;
}

function HeroBentoComponent({ forYou = [], flashSale = [], trending = [] }: HeroBentoProps) {
  const countdown = useCountdown(30);
  const isMobile = useIsMobile();
  const [categoryImgs, setCategoryImgs] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;
    async function loadCategoryImages() {
      try {
        const all = await getCachedMohasagorProducts();
        if (all && all.length > 0 && isMounted) {
          const techList = filterProductsByCategory(all, "electronics");
          const fashionList = filterProductsByCategory(all, "fashion");
          const homeList = filterProductsByCategory(all, "home");
          const beautyList = filterProductsByCategory(all, "beauty");

          setCategoryImgs({
            cat_tech: techList[0]?.image || "",
            cat_lifestyle: fashionList[0]?.image || "",
            cat_home: homeList[0]?.image || "",
            cat_beauty: beautyList[0]?.image || "",
          });
        }
      } catch (e) {
        console.warn("Failed to load category images", e);
      }
    }
    loadCategoryImages();
    return () => { isMounted = false; };
  }, []);

  const { config } = useSiteConfig<{
    tiles?: BentoTileCfg[];
    sections?: CustomSection[];
    mobile?: { tiles?: BentoTileCfg[]; sections?: CustomSection[] } | null;
  }>("home_bento", {});

  const activeTiles = (isMobile && config?.mobile?.tiles?.length ? config.mobile.tiles : config?.tiles) ?? [];
  const activeSections = (isMobile && config?.mobile?.sections ? config.mobile.sections : config?.sections) ?? [];

  const tileMap: Record<string, BentoTileCfg> = {};
  activeTiles.forEach((t) => (tileMap[t.id] = t));
  const customSections = activeSections.filter((s) => s.visible !== false);

  const isVisible = (id: string) => tileMap[id]?.visible !== false;
  const cfg = (id: string): BentoTileCfg => tileMap[id] ?? { id, visible: true };

  const forYouItems = getSmartPersonalizedForYou(forYou);
  const flashItems = flashSale.slice(0, 2);
  const trend = trending[0];

  const heroCfg = cfg("hero");
  const flashCfg = cfg("flash");
  const foryouCfg = cfg("foryou");
  const trendingCfg = cfg("trending");
  const vendorsCfg = cfg("vendors");

  const heroBgFallback = "/hero-banner-durtu-perfect.png";

  return (
    <div className="w-full font-['Barlow',sans-serif]">
      <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[128px] sm:auto-rows-[150px] md:auto-rows-[200px] gap-2.5 sm:gap-3 md:gap-5">
        {/* Hero brand moment */}
        {isVisible("hero") && (
          <Link
            to={heroCfg.link || "/products"}
            className="col-span-2 row-span-2 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden relative group shadow-[0_20px_60px_-15px_rgba(243,129,24,0.4)] md:shadow-2xl md:shadow-orange-500/25 active:scale-[0.99] transition-transform ring-1 ring-white/10 md:ring-0 bg-[#f7901e]"
          >
            {/* Main sharp banner image */}
            <img
              src={validUrl(heroCfg.imageUrl, heroBgFallback)}
              alt="Durtu Shop Banner"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              style={imgStyle(heroCfg)}
              onError={(e) => {
                (e.target as HTMLImageElement).src = heroBgFallback;
              }}
            />
            {/* Show overlay & text if admin configured custom title */}
            {heroCfg.title ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="relative z-10 h-full flex flex-col justify-end p-4 sm:p-6 md:p-12 text-white">
                  {heroCfg.badgeVisible !== false && heroCfg.badge && (
                    <span className="inline-flex w-fit items-center gap-1.5 sm:gap-2 bg-white/20 backdrop-blur-md border border-white/30 px-3 py-1 rounded-full text-[9px] sm:text-[10px] md:text-xs font-bold tracking-widest uppercase mb-2 sm:mb-3 md:mb-6 shadow-lg">
                      <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                      {heroCfg.badge}
                    </span>
                  )}
                  <h1
                    className="font-['Bebas_Neue'] leading-[0.85] tracking-tight uppercase mb-2 sm:mb-3 md:mb-4 text-3xl sm:text-5xl md:text-6xl font-black drop-shadow-lg"
                    style={titleStyle("hero", heroCfg.textStyle)}
                  >
                    {heroCfg.title}
                  </h1>
                  {heroCfg.subtitle && (
                    <p className="font-medium text-slate-100 opacity-90 max-w-sm mb-3 sm:mb-4 md:mb-6 text-xs sm:text-sm line-clamp-2" style={subtitleStyle("hero", heroCfg.textStyle)}>
                      {heroCfg.subtitle}
                    </p>
                  )}
                  {heroCfg.ctaText && (
                    <span className="w-fit inline-flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-full font-bold text-[10px] md:text-xs tracking-wider uppercase group-hover:scale-105 transition-transform shadow-xl">
                      {heroCfg.ctaText}
                      <span>→</span>
                    </span>
                  )}
                </div>
              </>
            ) : null}

            {/* Mobile-only sheen sweep across hero */}
            <div className="md:hidden m-hero-sheen" />
          </Link>
        )}

        {/* Flash deals - Luxury Gold Framed Banner */}
        {isVisible("flash") && (
          <Link
            to={flashCfg.link || "/products?filter=flash-sale"}
            className="col-span-2 row-span-1 rounded-[1.25rem] md:rounded-[2rem] bg-gradient-to-r from-[#fefdfa] via-[#f7f2e8] to-[#f0e7d8] border-2 border-[#d5b577] p-3 sm:p-4 md:p-6 flex items-center justify-between shadow-md md:shadow-xl shadow-[#cbb07a]/15 hover:-translate-y-0.5 active:scale-[0.99] transition-all overflow-hidden relative group"
          >
            {/* Inner Gold Inset Border */}
            <div className="absolute inset-1 sm:inset-1.5 md:inset-2 rounded-[1rem] md:rounded-[1.6rem] border border-[#d5b577]/70 pointer-events-none z-10" />

            {/* Geometric Gold Diamond Decorative Lines on Left */}
            <svg className="absolute -left-4 -top-6 w-44 h-44 sm:w-56 sm:h-56 text-[#d5b577]/30 pointer-events-none z-0" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
              <polygon points="50,5 95,50 50,95 5,50" />
              <polygon points="50,15 85,50 50,85 15,50" />
              <circle cx="50" cy="50" r="42" strokeDasharray="2,3" />
            </svg>

            {/* Subtle Tech Circuit / Wave Watermark on Right */}
            <svg className="absolute right-12 top-0 w-64 h-full text-[#d5b577]/20 pointer-events-none z-0" viewBox="0 0 200 100" fill="none" stroke="currentColor" strokeWidth="0.8">
              <path d="M0,80 Q50,20 100,70 T200,40" />
              <path d="M20,90 Q70,30 120,80 T200,60" />
              <line x1="80" y1="10" x2="80" y2="40" strokeDasharray="2,2" />
              <line x1="120" y1="15" x2="120" y2="55" strokeDasharray="2,2" />
            </svg>

            {/* Top Timer Plaque / Tab (1-Month Persistent Countdown) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:left-[26%] md:left-[30%] z-20 bg-gradient-to-b from-[#f3e8d2] to-[#e8d7b5] border-b border-x border-[#d5b577] px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-b-xl sm:rounded-b-2xl flex items-center gap-1 sm:gap-1.5 shadow-sm">
              <span className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#0d1f4d] text-[8px] sm:text-[10px] md:text-xs tracking-wider uppercase">
                ENDS IN
              </span>
              <div className="flex items-center gap-0.5 sm:gap-1 text-white font-mono text-[8px] sm:text-[10px] md:text-xs font-black">
                <span className="bg-[#1f242d] px-1 py-0.5 rounded-[3px] shadow-sm leading-tight">{countdown.d[0]}</span>
                <span className="bg-[#1f242d] px-1 py-0.5 rounded-[3px] shadow-sm leading-tight">{countdown.d[1]}</span>
                <span className="text-[#0d1f4d] text-[7px] sm:text-[9px] font-black uppercase mx-0.5">D</span>
                <span className="bg-[#1f242d] px-1 py-0.5 rounded-[3px] shadow-sm leading-tight">{countdown.h[0]}</span>
                <span className="bg-[#1f242d] px-1 py-0.5 rounded-[3px] shadow-sm leading-tight">{countdown.h[1]}</span>
                <span className="text-[#0d1f4d] font-black leading-tight">:</span>
                <span className="bg-[#1f242d] px-1 py-0.5 rounded-[3px] shadow-sm leading-tight">{countdown.m[0]}</span>
                <span className="bg-[#1f242d] px-1 py-0.5 rounded-[3px] shadow-sm leading-tight">{countdown.m[1]}</span>
                <span className="text-[#0d1f4d] font-black leading-tight">:</span>
                <span className="bg-[#1f242d] px-1 py-0.5 rounded-[3px] shadow-sm leading-tight">{countdown.s[0]}</span>
                <span className="bg-[#1f242d] px-1 py-0.5 rounded-[3px] shadow-sm leading-tight">{countdown.s[1]}</span>
              </div>
            </div>

            {/* Left Main Title */}
            <div className="flex flex-col min-w-0 relative z-10 pt-2 sm:pt-3">
              <h2
                className="font-['Bebas_Neue'] text-3xl sm:text-4xl md:text-5xl lg:text-[3.35rem] text-[#0d1f4d] leading-[0.9] tracking-tight drop-shadow-sm group-hover:text-orange-600 transition-colors"
                style={titleStyle("flash", flashCfg.textStyle)}
              >
                {flashCfg.title || "FLASH SALE DEALS"}
              </h2>
            </div>

            {/* Right Product Thumbnails & Bottom CTA */}
            <div className="flex flex-col items-end shrink-0 relative z-10">
              <div className="flex gap-1.5 sm:gap-2.5 md:gap-3 mb-1">
                <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-md border border-[#decab0] p-0.5 group-hover:scale-105 transition-transform duration-300">
                  <img
                    src={flashItems[0]?.image || "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=200&h=200&fit=crop"}
                    alt="Flash Item 1"
                    className="w-full h-full object-cover rounded-[10px] sm:rounded-[14px]"
                  />
                </div>
                <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-md border border-[#decab0] p-0.5 group-hover:scale-105 transition-transform duration-300 hidden sm:block">
                  <img
                    src={flashItems[1]?.image || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop"}
                    alt="Flash Item 2"
                    className="w-full h-full object-cover rounded-[10px] sm:rounded-[14px]"
                  />
                </div>
              </div>

              {/* Glowing CTA Button */}
              <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#ff8a00] via-[#ff6a00] to-[#f24e00] text-white px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-full shadow-lg shadow-orange-500/25 border border-white/50 group-hover:scale-105 transition-transform">
                <div className="flex flex-col text-left leading-none">
                  <span className="text-[7px] sm:text-[8px] font-black italic text-amber-200 uppercase tracking-wider">
                    FLASH SALE
                  </span>
                  <span className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-wider">
                    SHOP NOW
                  </span>
                </div>
                <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-300 fill-cyan-300/30" />
              </div>
            </div>
          </Link>
        )}

        {/* Category tiles - Ultra-Attractive High-Converting Design */}
        {CATEGORIES.filter((c) => isVisible(c.id)).map(({ id, name, sub, tag, to, defaultImg, shadow, badgeColor }) => {
          const c = cfg(id);
          const tileImg = validUrl(c.imageUrl, defaultImg);
          return (
            <Link
              key={id}
              to={c.link || to}
              className={`col-span-1 row-span-1 rounded-[1.25rem] md:rounded-[2rem] p-3 sm:p-4 md:p-5 text-white flex flex-col justify-between shadow-md md:shadow-lg ${shadow} group cursor-pointer overflow-hidden relative hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 border border-white/15`}
            >
              {/* Ultra Attractive Product Image */}
              <img
                src={tileImg}
                alt={c.title || name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                style={c.imageUrl ? imgStyle(c) : { objectFit: "cover", objectPosition: "center" }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = defaultImg;
                }}
              />
              
              {/* Dark Gradient Overlay for Maximum Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10 group-hover:via-black/20 transition-colors duration-300 pointer-events-none" />

              {/* Top Accent Badge */}
              <div className="relative z-10 flex justify-start">
                <span className={`inline-flex items-center text-[7px] sm:text-[9px] font-black px-2 py-0.5 rounded-full border shadow-sm backdrop-blur-md ${badgeColor}`}>
                  {c.badge || tag}
                </span>
              </div>

              {/* Bottom Professional Typography */}
              <div className="relative z-10">
                <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-white text-sm sm:text-base md:text-lg leading-tight tracking-tight drop-shadow-md group-hover:text-orange-300 transition-colors">
                  {c.title || name}
                </h3>
                <p className="text-[10px] sm:text-xs text-white/90 font-medium tracking-wide mt-0.5 line-clamp-1 drop-shadow">
                  {c.subtitle || sub}
                </p>
              </div>
            </Link>
          );
        })}

        {/* For You Section - Big Clear Product Photos */}
        {isVisible("foryou") && (
          <div className="col-span-2 md:col-span-1 row-span-2 rounded-[1.5rem] md:rounded-[2.5rem] bg-card border border-border p-3.5 sm:p-5 md:p-6 shadow-md shadow-black/5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2.5 sm:mb-4">
              <h3 className="font-['Bebas_Neue'] text-2xl sm:text-3xl text-foreground leading-none tracking-wide" style={titleStyle("foryou", foryouCfg.textStyle)}>
                {foryouCfg.title || "FOR YOU"}
              </h3>
              <span className="text-[10px] md:text-xs font-bold text-orange-600 uppercase tracking-wider">
                Top Picks
              </span>
            </div>

            {/* Responsive Grid: 3-column with big product photos on mobile, vertical list on desktop */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-1 md:space-y-3 md:gap-0">
              {(forYouItems.length > 0
                ? forYouItems
                : [
                    { id: "fy1", name: "Men's Solid Colour Ban...", price: 350, image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=300&h=300&fit=crop", slug: "mens-shirt" },
                    { id: "fy2", name: "Wireless Bluetooth Speaker", price: 450, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop", slug: "speaker" },
                    { id: "fy3", name: "Smart Fitness Tracker Watch", price: 850, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop", slug: "watch" }
                  ]
              ).map((p) => (
                <Link
                  key={p.id}
                  to={`/product/${p.slug || p.id}`}
                  className="group flex flex-col md:flex-row items-center gap-2 md:gap-3 p-1.5 sm:p-2 md:p-1.5 rounded-xl sm:rounded-2xl hover:bg-muted/60 transition-all border border-border/60 md:border-transparent bg-muted/20 md:bg-transparent active:scale-[0.98]"
                >
                  <div className="w-full aspect-square md:w-14 md:h-14 rounded-lg sm:rounded-xl overflow-hidden shrink-0 border border-border/80 bg-white shadow-sm flex items-center justify-center">
                    <img
                      src={p.image || "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=300&h=300&fit=crop"}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=300&h=300&fit=crop";
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-center md:text-left w-full">
                    <p className="text-[11px] sm:text-xs font-bold text-foreground line-clamp-1 group-hover:text-orange-600 transition-colors">
                      {p.name}
                    </p>
                    <p className="text-xs sm:text-sm font-black text-orange-600 mt-0.5">
                      ৳ {p.price.toLocaleString("en-BD")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Trending product - Clear, High-Visibility Full Bleed Product Card */}
        {isVisible("trending") && (
          <Link
            to={trendingCfg.link || (trend ? `/product/${trend.slug}` : "/products")}
            className="col-span-2 md:col-span-1 row-span-2 rounded-[1.5rem] md:rounded-[2.5rem] bg-[#0f0f14] overflow-hidden relative group shadow-lg active:scale-[0.99] transition-all flex flex-col justify-between border border-white/10"
          >
            {/* Background product photo */}
            <img
              src={trendingCfg.imageUrl || trend?.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=1000&fit=crop"}
              alt={trendingCfg.title || trend?.name || "Trending Product"}
              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
              style={{ objectFit: "cover", objectPosition: "center" }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=1000&fit=crop";
              }}
            />

            {/* Subtle Dark Gradient Overlay for Maximum Photo Clarity & Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/10 pointer-events-none" />

            {/* Top Badge */}
            <div className="relative z-10 p-3 sm:p-4 flex justify-between items-center">
              <span className="inline-flex items-center gap-1 font-black bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[9px] sm:text-[10px] shadow-md">
                <Zap className="w-3 h-3 fill-white" />
                {trendingCfg.subtitle || "TRENDING"}
              </span>
            </div>

            {/* Bottom Info */}
            <div className="relative z-10 p-3 sm:p-4 md:p-5 pt-8">
              <h3 className="font-['Bebas_Neue'] text-xl sm:text-2xl md:text-3xl text-white leading-tight tracking-wide line-clamp-1 drop-shadow-md group-hover:text-orange-300 transition-colors" style={titleStyle("trending", trendingCfg.textStyle)}>
                {trendingCfg.title || trend?.name || "X1 WIRELESS SPEAKER"}
              </h3>
              <div className="flex items-center justify-between mt-1">
                <p className="text-sm sm:text-base md:text-lg font-black text-orange-400 drop-shadow">
                  ৳ {(trend?.price || 450).toLocaleString("en-BD")}
                </p>
                <span className="text-[10px] font-bold text-white/90 bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full">
                  View →
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* Marketplace trust */}
        {isVisible("vendors") && (
          <div className="col-span-2 row-span-1 rounded-[1.25rem] md:rounded-[2.5rem] bg-gradient-to-br from-[#0f0f1a] via-[#1a1830] to-[#2a1533] md:bg-muted/50 border border-white/10 md:border-border p-3.5 sm:p-5 md:p-8 flex flex-row items-center gap-3 sm:gap-4 md:gap-8 justify-between overflow-hidden relative">
            {vendorsCfg.imageUrl && (
              <img src={vendorsCfg.imageUrl} alt="" className="absolute inset-0 w-full h-full opacity-40" style={imgStyle(vendorsCfg)} />
            )}
            {/* Mobile-only aurora accent */}
            <div className="md:hidden absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#ff6b35]/30 blur-3xl" />
            <div className="md:hidden absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-[#6c5ce7]/30 blur-3xl" />

            <div className="flex flex-col text-left relative z-10 min-w-0 flex-1">
              <h4 className="font-['Bebas_Neue'] text-white md:text-foreground leading-none mb-1 sm:mb-1.5 md:mb-2 line-clamp-1" style={titleStyle("vendors", vendorsCfg.textStyle)}>
                {vendorsCfg.title || "Multi-Vendor Power"}
              </h4>
              <p className="text-white/70 md:text-muted-foreground font-medium line-clamp-2" style={subtitleStyle("vendors", vendorsCfg.textStyle)}>
                {vendorsCfg.subtitle || "Supporting 1,200+ local artisans and premium global brands across Bangladesh."}
              </p>
            </div>
            <div className="flex -space-x-2 sm:-space-x-3 md:-space-x-4 shrink-0 relative z-10">
              <div className="w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full border-2 sm:border-4 border-[#1a1830] md:border-background bg-white shadow-sm flex items-center justify-center font-bold text-[#6c5ce7] italic text-sm sm:text-base m-float">D</div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full border-2 sm:border-4 border-[#1a1830] md:border-background bg-[#6c5ce7] shadow-sm flex items-center justify-center font-bold text-white text-sm sm:text-base m-float" style={{ animationDelay: "0.6s" }}>Z</div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full border-2 sm:border-4 border-[#1a1830] md:border-background bg-[#e84393] shadow-sm flex items-center justify-center font-bold text-white italic text-sm sm:text-base m-float" style={{ animationDelay: "1.2s" }}>A</div>
            </div>
          </div>
        )}

      </div>

      {/* Admin-defined custom sections */}
      {customSections.length > 0 && (
        <div className="mt-6 md:mt-8 space-y-4 md:space-y-6">
          {customSections.map((s) => {
            const inner = (
              <div className="relative w-full overflow-hidden rounded-[1.75rem] md:rounded-[2.5rem] shadow-lg" style={{ minHeight: 180 }}>
                {s.imageUrl
                  ? <img src={s.imageUrl} alt="" className="absolute inset-0 w-full h-full" style={imgStyle(s)} />
                  : <div className="absolute inset-0" style={{ background: s.bgColor || "linear-gradient(135deg,#6c5ce7,#e84393)" }} />}
                <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${(s.overlay ?? 40)/100})` }} />
                <div className="relative z-10 p-6 md:p-10 text-white min-h-[180px] md:min-h-[240px] flex flex-col justify-center">
                  <h3 className="font-['Bebas_Neue'] leading-none" style={titleStyle("section", s.textStyle)}>{s.title}</h3>
                  {s.subtitle && <p className="mt-2 opacity-90 max-w-xl" style={subtitleStyle("section", s.textStyle)}>{s.subtitle}</p>}
                </div>
              </div>
            );
            return s.link
              ? <Link key={s.id} to={s.link} className="block hover:-translate-y-1 transition-transform">{inner}</Link>
              : <div key={s.id}>{inner}</div>;
          })}
        </div>
      )}
    </div>
  );
}


export const HeroBento = memo(HeroBentoComponent);
