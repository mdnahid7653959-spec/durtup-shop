import { Link } from "react-router-dom";
import { Percent, Gift, Crown, Truck, Shield, Zap, Star, ArrowRight, Copy, Headphones, CreditCard, Award, Heart, LucideIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSiteConfig } from "@/hooks/useSiteConfig";

const iconMap: Record<string, LucideIcon> = {
  gift: Gift, percent: Percent, crown: Crown, truck: Truck, shield: Shield,
  zap: Zap, star: Star, headphones: Headphones, "credit-card": CreditCard,
  award: Award, heart: Heart,
};

interface Promo {
  id: number | string;
  title: string;
  description: string;
  code?: string;
  icon: string;
  bgClass: string;
  href: string;
}

interface TrustBadge {
  icon: string;
  title: string;
  desc: string;
  colorClass: string;
}

interface PromosConfig {
  promos: Promo[];
  trust_badges: TrustBadge[];
}

const defaultConfig: PromosConfig = {
  promos: [
    { id: 1, title: "Welcome Offer", description: "New users get 15% off first order", code: "WELCOME15", icon: "gift", bgClass: "from-emerald-500 via-teal-500 to-cyan-500", href: "/register" },
    { id: 2, title: "Super Deals", description: "Up to 80% off selected items", icon: "percent", bgClass: "from-rose-500 via-pink-500 to-fuchsia-500", href: "/clearance" },
    { id: 3, title: "Premium Club", description: "Free shipping + VIP deals", icon: "crown", bgClass: "from-amber-500 via-orange-500 to-red-500", href: "/premium" },
  ],
  trust_badges: [
    { icon: "truck", title: "Free Shipping", desc: "On orders $25+", colorClass: "text-blue-500" },
    { icon: "shield", title: "Buyer Protection", desc: "100% secure", colorClass: "text-emerald-500" },
    { icon: "zap", title: "Fast Delivery", desc: "2-7 days", colorClass: "text-amber-500" },
    { icon: "star", title: "Top Quality", desc: "5-star rated", colorClass: "text-violet-500" },
  ],
};

export function PromoBanners() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { config } = useSiteConfig<PromosConfig>("home_promos", defaultConfig);

  const promos = config.promos?.length ? config.promos : defaultConfig.promos;
  const trustBadges = config.trust_badges?.length ? config.trust_badges : defaultConfig.trust_badges;

  const copyCode = (code: string, e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Code "${code}" copied!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <section className="py-4 sm:py-6 space-y-4 sm:space-y-6 overflow-x-hidden max-w-full">
      {/* Minimalist, Clean Trust Badges */}
      <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4">
        {trustBadges.map((badge) => {
          const Icon = iconMap[badge.icon] || Shield;
          return (
            <div key={badge.title} className="flex-shrink-0 w-[145px] sm:w-auto bg-card border rounded-xl p-3 sm:p-4 transition-all hover:border-muted-foreground/30">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${badge.colorClass || 'text-primary'} shrink-0`} />
                <div className="min-w-0">
                  <h4 className="font-semibold text-foreground text-xs sm:text-sm truncate">{badge.title}</h4>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{badge.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Premium Editorial Promos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {promos.map((promo) => {
          return (
            <Link
              key={promo.id}
              to={promo.href}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${promo.bgClass} p-4 sm:p-5 hover:scale-[1.01] transition-transform duration-200 shadow-md`}
            >
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHBhdGggZD0iTTAgMGgyMHYyMEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjEiIGN5PSIxIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjYSkiLz48L3N2Zz4=')] opacity-30" />

              <div className="relative z-10 flex flex-col justify-between h-full min-h-[90px] sm:min-h-[110px]">
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-0.5 sm:mb-1">{promo.title}</h3>
                  <p className="text-white/90 text-xs sm:text-sm mb-3 sm:mb-4 truncate">{promo.description}</p>
                </div>
                
                <div>
                  {promo.code ? (
                    <button
                      onClick={(e) => copyCode(promo.code!, e)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white font-mono text-xs font-semibold border border-white/10 hover:bg-white/30 transition-colors press-scale"
                    >
                      <span>{promo.code}</span>
                      <Copy className={`h-3 w-3 ${copiedCode === promo.code ? 'text-green-300' : 'opacity-70'}`} />
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-1 text-white text-xs sm:text-sm font-medium hover:underline">
                      Shop Now
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
