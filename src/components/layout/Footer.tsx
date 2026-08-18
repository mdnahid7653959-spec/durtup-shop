import { Link } from "react-router-dom";
import { 
  Facebook, Twitter, Instagram, Youtube,
  CreditCard, Shield, Truck, Headphones,
  LucideIcon
} from "lucide-react";
import { useSiteConfig } from "@/hooks/useSiteConfig";

const iconMap: Record<string, LucideIcon> = {
  truck: Truck, shield: Shield, headphones: Headphones, "credit-card": CreditCard,
  facebook: Facebook, twitter: Twitter, instagram: Instagram, youtube: Youtube,
};

interface FooterLink { name: string; href: string; }
interface FooterColumn { title: string; links: FooterLink[]; }
interface TrustBadge { icon: string; title: string; desc: string; }
interface SocialLink { platform: string; url: string; }

interface FooterConfig {
  columns: FooterColumn[];
  trust_badges: TrustBadge[];
  social_links: SocialLink[];
  copyright: string;
  brand_description: string;
  logo_url: string;
  payment_methods: string[];
}

const defaultFooterConfig: FooterConfig = {
  columns: [
    { title: "Customer Service", links: [
      { name: "Help Center", href: "/help" }, { name: "Returns", href: "/returns" },
      { name: "Shipping", href: "/shipping" }, { name: "Track Order", href: "/track" },
      { name: "Contact", href: "/contact" },
    ]},
    { title: "About Us", links: [
      { name: "About", href: "/about" }, { name: "Careers", href: "/careers" },
      { name: "Press", href: "/press" }, { name: "Affiliate", href: "/affiliate" },
      { name: "Seller Center", href: "/seller/register" },
    ]},
    { title: "Policies", links: [
      { name: "Privacy", href: "/privacy" }, { name: "Terms", href: "/terms" },
      { name: "Cookies", href: "/cookies" }, { name: "IP Rights", href: "/ip" },
    ]},
  ],
  trust_badges: [
    { icon: "truck", title: "Free Shipping", desc: "$35+ orders" },
    { icon: "shield", title: "Secure Pay", desc: "100% safe" },
    { icon: "headphones", title: "24/7 Support", desc: "Always here" },
    { icon: "credit-card", title: "Easy Returns", desc: "30 days" },
  ],
  social_links: [
    { platform: "facebook", url: "#" }, { platform: "twitter", url: "#" },
    { platform: "instagram", url: "#" }, { platform: "youtube", url: "#" },
  ],
  copyright: "© 2026 Durtup.shop. All rights reserved.",
  brand_description: "Your one-stop destination for millions of products at unbeatable prices. Shop with confidence worldwide.",
  logo_url: "/durtup-logo.svg",
  payment_methods: ["Visa", "MC", "bKash", "Nagad"],
};

export function Footer() {
  const { config } = useSiteConfig<FooterConfig>("footer", defaultFooterConfig);

  const columns = config.columns?.length ? config.columns : defaultFooterConfig.columns;
  const trustBadges = config.trust_badges?.length ? config.trust_badges : defaultFooterConfig.trust_badges;
  const socialLinks = config.social_links?.length ? config.social_links : defaultFooterConfig.social_links;
  const copyright = config.copyright || defaultFooterConfig.copyright;
  const brandDesc = config.brand_description || defaultFooterConfig.brand_description;
  const logoUrl = config.logo_url || defaultFooterConfig.logo_url;
  const paymentMethods = config.payment_methods?.length ? config.payment_methods : defaultFooterConfig.payment_methods;

  return (
    <footer className="bg-secondary border-t hidden md:block">
      {/* Features bar */}
      <div className="border-b overflow-x-auto scrollbar-hide">
        <div className="container py-4 sm:py-6">
          <div className="flex sm:grid sm:grid-cols-4 gap-4 sm:gap-6 min-w-max sm:min-w-0">
            {trustBadges.map((badge) => {
              const Icon = iconMap[badge.icon] || Shield;
              return (
                <div key={badge.title} className="flex items-center gap-2.5 shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-xs sm:text-sm">{badge.title}</h4>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{badge.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="container py-6 sm:py-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 sm:gap-8">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <img 
                src={(logoUrl && !logoUrl.endsWith(".png")) ? logoUrl : "/durtup-logo.svg"} 
                alt="Durtup.shop" 
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/durtup-logo.svg";
                }}
              />
            </Link>
            <p className="text-muted-foreground mb-4 text-xs leading-relaxed max-w-xs">{brandDesc}</p>
            <div className="flex items-center gap-2">
              {socialLinks.map((social, idx) => {
                const Icon = iconMap[social.platform] || Facebook;
                return (
                  <a key={idx} href={social.url} className="w-10 h-10 rounded-full bg-card border flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors touch-manipulation press-scale">
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Links */}
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="font-bold text-foreground mb-3 text-xs sm:text-sm">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.name}>
                    <Link to={link.href} className="text-muted-foreground hover:text-primary transition-colors text-[11px] sm:text-xs touch-manipulation compact-link">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t">
        <div className="container py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[10px] sm:text-xs text-muted-foreground text-center sm:text-left">{copyright}</p>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] sm:text-xs text-muted-foreground mr-1">We accept:</span>
            {paymentMethods.map((card) => (
              <div key={card} className="h-6 px-2 rounded bg-card border flex items-center justify-center text-[9px] font-medium text-muted-foreground">
                {card}
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
