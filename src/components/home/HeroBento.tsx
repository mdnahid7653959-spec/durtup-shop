import { memo, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cpu, Shirt, Home as HomeIcon, Sparkles as SparklesIcon } from "lucide-react";
import type { Product } from "@/components/products/ProductCard";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { useIsMobile } from "@/hooks/use-mobile";
import { titleStyle, subtitleStyle, type TextStyle } from "@/lib/bentoText";


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
    tag: "Gadgets",
    to: "/category/electronics",
    defaultImg: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&h=500&fit=crop",
    shadow: "shadow-blue-500/10",
    badgeColor: "bg-blue-500/30 text-blue-200 border-blue-400/40",
  },
  {
    id: "cat_lifestyle",
    name: "Fashion & Lifestyle",
    sub: "Trendy Styles",
    tag: "Fashion",
    to: "/category/fashion",
    defaultImg: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&h=500&fit=crop",
    shadow: "shadow-pink-500/10",
    badgeColor: "bg-pink-500/30 text-pink-200 border-pink-400/40",
  },
  {
    id: "cat_home",
    name: "Home & Living",
    sub: "Modern Decor",
    tag: "Living",
    to: "/category/home",
    defaultImg: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=600&h=500&fit=crop",
    shadow: "shadow-emerald-500/10",
    badgeColor: "bg-emerald-500/30 text-emerald-200 border-emerald-400/40",
  },
  {
    id: "cat_beauty",
    name: "Beauty & Care",
    sub: "Glow Essentials",
    tag: "Skincare",
    to: "/category/beauty",
    defaultImg: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&h=500&fit=crop",
    shadow: "shadow-purple-500/10",
    badgeColor: "bg-purple-500/30 text-purple-200 border-purple-400/40",
  },
];

function useCountdown(hours = 4) {
  const [t, setT] = useState(hours * 3600);
  useEffect(() => {
    const i = setInterval(() => setT((v) => (v > 0 ? v - 1 : hours * 3600)), 1000);
    return () => clearInterval(i);
  }, [hours]);
  const h = String(Math.floor(t / 3600)).padStart(2, "0");
  const m = String(Math.floor((t % 3600) / 60)).padStart(2, "0");
  const s = String(t % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function validUrl(url?: string, fallback = ""): string {
  if (!url || typeof url !== "string") return fallback;
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  return fallback;
}

function HeroBentoComponent({ forYou = [], flashSale = [], trending = [] }: HeroBentoProps) {
  const countdown = useCountdown(4);
  const isMobile = useIsMobile();
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


  const forYouItems = forYou.slice(0, 3);
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

        {/* Flash deals */}
        {isVisible("flash") && (
          <Link
            to={flashCfg.link || "/products?filter=flash-sale"}
            className="col-span-2 row-span-1 rounded-[1.25rem] md:rounded-[2rem] bg-card border border-border p-3 sm:p-4 md:p-6 flex items-center justify-between shadow-md md:shadow-xl shadow-black/5 hover:-translate-y-1 active:scale-[0.99] transition-transform overflow-hidden relative"
          >
            <img
              src={validUrl(flashCfg.imageUrl, "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&h=400&fit=crop")}
              alt="Flash Sale Banner"
              className="absolute inset-0 w-full h-full object-cover opacity-25"
              style={imgStyle(flashCfg)}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&h=400&fit=crop";
              }}
            />

            <div className="flex flex-col min-w-0 relative z-10">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 md:mb-2">
                <span className="w-2 h-2 rounded-full bg-[#e84393] animate-pulse" />
                <span className="text-[#e84393] font-bold text-[9px] md:text-[10px] uppercase tracking-widest tabular-nums">
                  Ends in {countdown}
                </span>
              </div>
              <h2 className="font-['Bebas_Neue'] text-2xl sm:text-3xl text-foreground leading-none" style={titleStyle("flash", flashCfg.textStyle)}>
                {flashCfg.title || "Flash Sale Deals"}
              </h2>
              <p className="text-muted-foreground font-bold uppercase tracking-wider text-xs mt-0.5" style={subtitleStyle("flash", flashCfg.textStyle)}>
                {flashCfg.subtitle || "Up to 70% Off"}
              </p>
            </div>
            <div className="flex gap-1.5 sm:gap-2 md:gap-3 shrink-0 relative z-10">
              <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-muted rounded-xl sm:rounded-2xl overflow-hidden shadow-md">
                <img src={flashItems[0]?.image || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop"} alt="Flash Item" className="w-full h-full object-cover" />
              </div>
              <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-muted rounded-xl sm:rounded-2xl overflow-hidden shadow-md hidden sm:block">
                <img src={flashItems[1]?.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop"} alt="Flash Item" className="w-full h-full object-cover" />
              </div>
            </div>
          </Link>
        )}

        {/* Category tiles */}
        {CATEGORIES.filter((c) => isVisible(c.id)).map(({ id, name, sub, to, defaultImg, shadow }) => {
          const c = cfg(id);
          const tileImg = validUrl(c.imageUrl, defaultImg);
          return (
            <Link
              key={id}
              to={c.link || to}
              className={`col-span-1 row-span-1 rounded-[1.25rem] md:rounded-[2rem] p-3 sm:p-4 md:p-5 text-white flex flex-col justify-between shadow-md md:shadow-lg ${shadow} group cursor-pointer overflow-hidden relative hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 border border-white/10`}
            >
              {/* Product Background Image */}
              <img
                src={tileImg}
                alt={c.title || name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                style={c.imageUrl ? imgStyle(c) : undefined}
              />
              
              {/* Dark Gradient Overlay for Maximum Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20 group-hover:via-black/35 transition-colors duration-300" />



              {/* Bottom Professional Typography */}
              <div className="relative z-10">
                <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-black text-white text-sm sm:text-base md:text-lg leading-tight tracking-tight drop-shadow-md group-hover:text-orange-300 transition-colors">
                  {c.title || name}
                </h3>
                <p className="text-[10px] sm:text-xs text-white/80 font-medium tracking-wide mt-0.5 line-clamp-1 drop-shadow">
                  {c.subtitle || sub}
                </p>
              </div>
            </Link>
          );
        })}

        {/* For You Section */}
        {isVisible("foryou") && (
          <div className="col-span-2 md:col-span-1 row-span-2 rounded-[1.5rem] md:rounded-[2.5rem] bg-card border border-border p-4 sm:p-5 md:p-6 shadow-md shadow-black/5">
            <h3 className="font-['Bebas_Neue'] text-2xl text-foreground mb-3 sm:mb-4" style={titleStyle("foryou", foryouCfg.textStyle)}>
              {foryouCfg.title || "FOR YOU"}
            </h3>
            <div className="space-y-3">
              {(forYouItems.length > 0
                ? forYouItems
                : [
                    { id: "fy1", name: "Men's Solid Colour Ban...", price: 350, image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=200&h=200&fit=crop", slug: "mens-shirt" },
                    { id: "fy2", name: "Wireless Bluetooth Speaker", price: 450, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop", slug: "speaker" },
                    { id: "fy3", name: "Smart Fitness Tracker Watch", price: 850, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop", slug: "watch" }
                  ]
              ).map((p) => (
                <Link
                  key={p.id}
                  to={`/product/${p.slug || p.id}`}
                  className="flex items-center gap-3 group active:opacity-70"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-border bg-muted">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground line-clamp-1 group-hover:text-orange-600">
                      {p.name}
                    </p>
                    <p className="text-xs font-black text-orange-600">
                      ৳ {p.price.toLocaleString("en-BD")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Trending product */}
        {isVisible("trending") && (
          <Link
            to={trendingCfg.link || (trend ? `/product/${trend.slug}` : "/products")}
            className="col-span-2 md:col-span-1 row-span-2 rounded-[1.5rem] md:rounded-[2.5rem] bg-neutral-900 overflow-hidden relative group shadow-lg active:scale-[0.99] transition-transform"
          >
            <img
              src={trendingCfg.imageUrl || trend?.image || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=1000&fit=crop"}
              alt="Trending Product"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              style={imgStyle(trendingCfg)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 md:p-6 text-white">
              <span className="inline-block font-bold bg-orange-600 text-white px-3 py-1 rounded-full uppercase tracking-wider text-[9px]">
                {trendingCfg.subtitle || "TRENDING"}
              </span>
              <h3 className="font-['Bebas_Neue'] text-2xl sm:text-3xl mt-2 leading-tight tracking-wider line-clamp-2" style={titleStyle("trending", trendingCfg.textStyle)}>
                {trendingCfg.title || trend?.name || "X1 WIRELESS SPEAKER"}
              </h3>
              <p className="text-base sm:text-lg font-black mt-1 text-orange-400">
                ৳ {(trend?.price || 450).toLocaleString("en-BD")}
              </p>
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
