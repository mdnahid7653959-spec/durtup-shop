import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/firebaseAdapter";
import { useThemeConfig, defaultTheme, themePresets, applyThemeToDOM, ThemeConfig } from "@/hooks/useThemeConfig";
import { 
  Palette, 
  Image as ImageIcon, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Save, 
  RotateCcw, 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  Check, 
  Sun, 
  Moon, 
  Type, 
  Sliders, 
  LayoutGrid, 
  ExternalLink, 
  Megaphone, 
  ChevronLeft, 
  ChevronRight, 
  ShoppingBag, 
  Search, 
  Heart, 
  User, 
  ShoppingCart,
  Truck,
  Percent,
  Crown,
  Upload,
  Layers,
  ArrowRight
} from "lucide-react";

// --- Color Helpers ---
function hexToHsl(hex: string): string {
  if (!hex || !hex.startsWith("#")) return "16 90% 55%";
  let c = hex.replace("#", "");
  if (c.length === 3) {
    c = c.split("").map(char => char + char).join("");
  }
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hslToHex(hslStr: string): string {
  if (!hslStr) return "#ea580c";
  const clean = hslStr.replace(/%/g, "").trim();
  const parts = clean.split(/\s+/).map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return "#ea580c";

  let [h, s, l] = parts;
  h = (h % 360) / 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Preset Theme Color Swatches
const PRESETS_LIST = [
  { id: "default", name: "Darzo Orange (Default)", primary: "#ea580c", bg: "#f8fafc", accent: "#ea580c", dark: false },
  { id: "dark", name: "Dark Luxury", primary: "#10b981", bg: "#0f172a", accent: "#f59e0b", dark: true },
  { id: "modern", name: "Modern Purple", primary: "#8b5cf6", bg: "#f3f4f6", accent: "#8b5cf6", dark: false },
  { id: "ocean", name: "Ocean Cyan", primary: "#06b6d4", bg: "#f0f9ff", accent: "#0284c7", dark: false },
  { id: "emerald", name: "Eco Emerald", primary: "#059669", bg: "#f0fdf4", accent: "#10b981", dark: false },
  { id: "rose", name: "Rose Passion", primary: "#e11d48", bg: "#fff1f2", accent: "#f43f5e", dark: false },
  { id: "gold", name: "Gold Premium", primary: "#d97706", bg: "#1e1b4b", accent: "#fbbf24", dark: true },
  { id: "minimal", name: "Minimal Noir", primary: "#18181b", bg: "#ffffff", accent: "#27272a", dark: false },
];

// Banner Types
interface VisualBanner {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  link_url?: string;
  position: string;
  sort_order: number;
  is_active: boolean;
  badge?: string;
  cta_text?: string;
  bg_gradient?: string;
}

const UNSPLASH_PRESETS = [
  { label: "Electronics & Tech", url: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=1200&h=500&fit=crop" },
  { label: "Fashion & Lifestyle", url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&h=500&fit=crop" },
  { label: "Mega Shopping Sale", url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=500&fit=crop" },
  { label: "Smartphones & Devices", url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&h=500&fit=crop" },
  { label: "Cosmetics & Beauty", url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&h=500&fit=crop" },
  { label: "Home & Gadgets", url: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&h=500&fit=crop" },
];

export default function AdminVisualEditor() {
  const { toast } = useToast();
  const { data: dbTheme, isLoading: themeLoading } = useThemeConfig();

  // Local state for theme config
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [activePreset, setActivePreset] = useState<string>("default");

  // Local state for Banners
  const [heroBanners, setHeroBanners] = useState<VisualBanner[]>([]);
  const [promoBanners, setPromoBanners] = useState<VisualBanner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);

  // Announcement Bar & Header State
  const [announcementBar, setAnnouncementBar] = useState({
    enabled: true,
    text: "⚡ Special Offer: Free Delivery on orders over ৳999! Code: FREESHIP",
    bgColor: "#ea580c",
    textColor: "#ffffff",
    linkText: "Shop Deals",
    linkUrl: "/products"
  });

  const [headerConfig, setHeaderConfig] = useState({
    storeName: "Darzo.com",
    logoUrl: "/darzo-logo.png",
    showCategories: true,
    showSearch: true
  });

  // Editor View Controls
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [activeTab, setActiveTab] = useState<"theme" | "banners" | "announcement" | "header">("theme");
  const [saving, setSaving] = useState(false);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);

  // Banner Dialog State
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<VisualBanner | null>(null);
  const [bannerForm, setBannerForm] = useState<Partial<VisualBanner>>({
    title: "",
    subtitle: "",
    image_url: "",
    link_url: "/products",
    position: "hero",
    sort_order: 0,
    is_active: true,
    badge: "SPECIAL DEAL",
    cta_text: "Shop Now",
    bg_gradient: "from-primary via-orange-500 to-amber-500"
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  // Sync theme when DB theme loads
  useEffect(() => {
    if (dbTheme) {
      setTheme(dbTheme);
    }
  }, [dbTheme]);

  // Fetch Banners & Site Config from Supabase
  useEffect(() => {
    fetchBannersAndConfig();
  }, []);

  const fetchBannersAndConfig = async () => {
    setBannersLoading(true);
    try {
      // 1. Banners
      const { data: bData } = await supabase
        .from("cms_banners")
        .select("*")
        .order("sort_order", { ascending: true });

      if (bData && bData.length > 0) {
        const heroes = bData.filter((b: any) => b.position === "hero" || !b.position);
        const promos = bData.filter((b: any) => b.position === "promo" || b.position === "side");
        
        if (heroes.length > 0) setHeroBanners(heroes);
        else setHeroBanners(getDefaultHeroBanners());

        if (promos.length > 0) setPromoBanners(promos);
        else setPromoBanners(getDefaultPromoBanners());
      } else {
        setHeroBanners(getDefaultHeroBanners());
        setPromoBanners(getDefaultPromoBanners());
      }

      // 2. Announcement & Header Config from site_config
      const { data: scData } = await (supabase as any)
        .from("site_config")
        .select("*")
        .in("key", ["announcement_bar", "site_header"]);

      if (scData) {
        const ann = scData.find((row: any) => row.key === "announcement_bar");
        if (ann?.value) setAnnouncementBar(prev => ({ ...prev, ...ann.value }));

        const hdr = scData.find((row: any) => row.key === "site_header");
        if (hdr?.value) setHeaderConfig(prev => ({ ...prev, ...hdr.value }));
      }
    } catch (err) {
      console.error("Error loading visual editor data:", err);
    } finally {
      setBannersLoading(false);
    }
  };

  function getDefaultHeroBanners(): VisualBanner[] {
    return [
      {
        id: "hero-1",
        title: "Summer Tech Mega Sale",
        subtitle: "Up to 70% Off on Top Smartphones & Laptops",
        image_url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=500&fit=crop",
        link_url: "/products",
        position: "hero",
        sort_order: 1,
        is_active: true,
        badge: "🔥 HOT DEAL",
        cta_text: "Shop Now",
        bg_gradient: "from-primary via-orange-500 to-amber-500"
      },
      {
        id: "hero-2",
        title: "Trending Fashion & Style",
        subtitle: "Exclusive Collection for Men & Women",
        image_url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&h=500&fit=crop",
        link_url: "/category/fashion",
        position: "hero",
        sort_order: 2,
        is_active: true,
        badge: "NEW ARRIVAL",
        cta_text: "Explore Collection",
        bg_gradient: "from-purple-600 via-pink-600 to-indigo-600"
      }
    ];
  }

  function getDefaultPromoBanners(): VisualBanner[] {
    return [
      {
        id: "promo-1",
        title: "Smartphones 5G",
        subtitle: "Starting from ৳14,999",
        image_url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&h=300&fit=crop",
        link_url: "/category/electronics",
        position: "promo",
        sort_order: 1,
        is_active: true,
        badge: "BESTSELLER"
      },
      {
        id: "promo-2",
        title: "Luxury Watches",
        subtitle: "Up to 40% Off",
        image_url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=300&fit=crop",
        link_url: "/category/jewelry",
        position: "promo",
        sort_order: 2,
        is_active: true,
        badge: "DISCOUNT"
      }
    ];
  }

  // Update real DOM preview in realtime as theme changes
  const handleThemeColorChange = (key: keyof ThemeConfig, hslValue: string) => {
    const updated = { ...theme, [key]: hslValue };
    setTheme(updated);
    applyThemeToDOM(updated);
  };

  const handleApplyPreset = (presetId: string) => {
    setActivePreset(presetId);
    let selectedTheme = defaultTheme;

    if (presetId === "dark") {
      selectedTheme = {
        ...defaultTheme,
        background: "220 20% 8%",
        foreground: "0 0% 95%",
        card: "220 20% 12%",
        cardForeground: "0 0% 95%",
        muted: "220 15% 18%",
        mutedForeground: "220 10% 60%",
        secondary: "220 15% 18%",
        secondaryForeground: "0 0% 90%",
        border: "220 15% 22%",
        darkMode: true,
      };
    } else if (presetId === "modern") {
      selectedTheme = {
        ...defaultTheme,
        primary: "250 80% 60%",
        accent: "250 80% 60%",
        background: "240 5% 96%",
        card: "0 0% 100%",
        radius: "1rem",
        fontFamily: "Poppins",
      };
    } else if (presetId === "ocean") {
      selectedTheme = {
        ...defaultTheme,
        primary: "192 95% 42%",
        accent: "201 96% 32%",
        background: "204 100% 98%",
        card: "0 0% 100%",
        radius: "0.75rem",
      };
    } else if (presetId === "emerald") {
      selectedTheme = {
        ...defaultTheme,
        primary: "160 84% 39%",
        accent: "158 64% 52%",
        background: "144 60% 98%",
        card: "0 0% 100%",
        radius: "0.75rem",
      };
    } else if (presetId === "rose") {
      selectedTheme = {
        ...defaultTheme,
        primary: "343 81% 50%",
        accent: "347 89% 60%",
        background: "355 100% 98%",
        card: "0 0% 100%",
        radius: "0.75rem",
      };
    } else if (presetId === "gold") {
      selectedTheme = {
        ...defaultTheme,
        primary: "38 92% 50%",
        accent: "43 96% 56%",
        background: "240 45% 11%",
        card: "240 40% 16%",
        foreground: "45 100% 96%",
        cardForeground: "45 100% 96%",
        darkMode: true,
        radius: "0.5rem",
      };
    } else if (presetId === "minimal") {
      selectedTheme = {
        ...defaultTheme,
        primary: "240 10% 10%",
        accent: "240 6% 20%",
        background: "0 0% 100%",
        card: "0 0% 98%",
        radius: "0.25rem",
      };
    }

    setTheme(selectedTheme);
    applyThemeToDOM(selectedTheme);
    toast({
      title: "Preset Applied",
      description: `Switched to "${PRESETS_LIST.find(p => p.id === presetId)?.name}" preset.`,
    });
  };

  // Image File Upload for Banner
  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `banner-${Date.now()}.${ext}`;
      const filePath = `banners/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from("product-media")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: publicUrlData } = supabase.storage
        .from("product-media")
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        setBannerForm(prev => ({ ...prev, image_url: publicUrlData.publicUrl }));
        toast({ title: "Image Uploaded", description: "Banner image uploaded successfully!" });
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      toast({ title: "Upload Failed", description: err.message || "Failed to upload image.", variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  // Open Banner Edit Modal
  const handleOpenAddBanner = (position: "hero" | "promo" = "hero") => {
    setEditingBanner(null);
    setBannerForm({
      title: "",
      subtitle: "",
      image_url: UNSPLASH_PRESETS[0].url,
      link_url: "/products",
      position: position,
      sort_order: (position === "hero" ? heroBanners.length : promoBanners.length) + 1,
      is_active: true,
      badge: "EXCLUSIVE",
      cta_text: "Shop Now",
      bg_gradient: "from-primary via-orange-500 to-amber-500"
    });
    setBannerDialogOpen(true);
  };

  const handleEditBanner = (banner: VisualBanner) => {
    setEditingBanner(banner);
    setBannerForm({ ...banner });
    setBannerDialogOpen(true);
  };

  const handleSaveBannerModal = () => {
    if (!bannerForm.title || !bannerForm.image_url) {
      toast({ title: "Missing Fields", description: "Please enter a banner title and image URL.", variant: "destructive" });
      return;
    }

    const isHero = bannerForm.position === "hero" || !bannerForm.position;
    const newBanner: VisualBanner = {
      id: editingBanner ? editingBanner.id : `banner-${Date.now()}`,
      title: bannerForm.title || "Banner Title",
      subtitle: bannerForm.subtitle || "",
      image_url: bannerForm.image_url || "",
      link_url: bannerForm.link_url || "/products",
      position: bannerForm.position || "hero",
      sort_order: bannerForm.sort_order || 1,
      is_active: bannerForm.is_active ?? true,
      badge: bannerForm.badge || "",
      cta_text: bannerForm.cta_text || "Shop Now",
      bg_gradient: bannerForm.bg_gradient || "from-primary via-orange-500 to-amber-500"
    };

    if (isHero) {
      if (editingBanner) {
        setHeroBanners(prev => prev.map(b => b.id === editingBanner.id ? newBanner : b));
      } else {
        setHeroBanners(prev => [...prev, newBanner]);
      }
    } else {
      if (editingBanner) {
        setPromoBanners(prev => prev.map(b => b.id === editingBanner.id ? newBanner : b));
      } else {
        setPromoBanners(prev => [...prev, newBanner]);
      }
    }

    setBannerDialogOpen(false);
    toast({ title: "Banner Saved", description: "Banner added to draft. Click 'Save & Publish' to push live." });
  };

  const handleDeleteBanner = (id: string, isHero: boolean) => {
    if (isHero) {
      setHeroBanners(prev => prev.filter(b => b.id !== id));
    } else {
      setPromoBanners(prev => prev.filter(b => b.id !== id));
    }
    toast({ title: "Banner Removed", description: "Banner removed from list." });
  };

  const handleToggleBannerActive = (id: string, isHero: boolean) => {
    if (isHero) {
      setHeroBanners(prev => prev.map(b => b.id === id ? { ...b, is_active: !b.is_active } : b));
    } else {
      setPromoBanners(prev => prev.map(b => b.id === id ? { ...b, is_active: !b.is_active } : b));
    }
  };

  // Save All (Theme, Banners, Announcement Bar) to Supabase Database
  const handleSaveAndPublish = async () => {
    setSaving(true);
    try {
      // 1. Save Theme Config to `theme_config`
      const { data: existingTheme } = await supabase
        .from("theme_config")
        .select("id")
        .eq("is_active", true)
        .maybeSingle();

      if (existingTheme?.id) {
        await supabase
          .from("theme_config")
          .update({
            config: theme as any,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingTheme.id);
      } else {
        await supabase
          .from("theme_config")
          .insert({
            name: "Main Published Theme",
            config: theme as any,
            is_active: true
          });
      }

      // 2. Save Hero & Promo Banners to `cms_banners`
      const allBanners = [...heroBanners, ...promoBanners];
      for (const banner of allBanners) {
        if (banner.id.startsWith("hero-") || banner.id.startsWith("promo-") || banner.id.startsWith("banner-")) {
          // New insert
          await supabase.from("cms_banners").insert({
            title: banner.title,
            image_url: banner.image_url,
            link_url: banner.link_url || "/products",
            position: banner.position,
            sort_order: banner.sort_order,
            is_active: banner.is_active
          });
        } else {
          // Existing update
          await supabase.from("cms_banners").update({
            title: banner.title,
            image_url: banner.image_url,
            link_url: banner.link_url,
            position: banner.position,
            sort_order: banner.sort_order,
            is_active: banner.is_active
          }).eq("id", banner.id);
        }
      }

      // 3. Save Announcement & Header Config to `site_config`
      await (supabase as any).from("site_config").upsert([
        { key: "announcement_bar", value: announcementBar, updated_at: new Date().toISOString() },
        { key: "site_header", value: headerConfig, updated_at: new Date().toISOString() }
      ], { onConflict: "key" });

      // Apply changes to DOM
      applyThemeToDOM(theme);

      toast({
        title: "🎉 Published Successfully!",
        description: "Your storefront theme, live banners, and top announcements are now live for all users!",
      });
    } catch (err: any) {
      console.error("Save error:", err);
      toast({
        title: "Save Failed",
        description: err.message || "Failed to publish settings to database.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const activeHeroSlides = heroBanners.filter(b => b.is_active);

  return (
    <AdminLayout title="Visual Theme & Banner Editor">
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Palette className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  Storefront Visual Editor
                </h1>
                <p className="text-xs text-muted-foreground">
                  Customize your user page theme colors, hero banners, top announcements, and brand layout in real-time.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleApplyPreset("default")}
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Reset Theme
            </Button>

            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md"
              onClick={handleSaveAndPublish}
              disabled={saving}
            >
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save & Publish Live
            </Button>
          </div>
        </div>

        {/* Main Editor Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Editor Controls Column */}
          <div className="lg:col-span-5 space-y-6">
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
              <TabsList className="grid grid-cols-4 w-full bg-muted/60 p-1 rounded-xl">
                <TabsTrigger value="theme" className="text-xs py-2 flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5" />
                  <span>Theme</span>
                </TabsTrigger>
                <TabsTrigger value="banners" className="text-xs py-2 flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span>Banners</span>
                </TabsTrigger>
                <TabsTrigger value="announcement" className="text-xs py-2 flex items-center gap-1.5">
                  <Megaphone className="h-3.5 w-3.5" />
                  <span>Notice</span>
                </TabsTrigger>
                <TabsTrigger value="header" className="text-xs py-2 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Header</span>
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: Theme & Color Customizer */}
              <TabsContent value="theme" className="mt-4 space-y-4">
                {/* Theme Presets */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Instant Theme Presets
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Pick a pre-configured harmonious color palette with 1-click.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      {PRESETS_LIST.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => handleApplyPreset(preset.id)}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition-all ${
                            activePreset === preset.id
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20 font-semibold"
                              : "hover:bg-muted/50 border-border"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-4 h-4 rounded-full border border-black/10 shadow-sm"
                              style={{ backgroundColor: preset.primary }}
                            />
                            <span className="truncate">{preset.name}</span>
                          </div>
                          {activePreset === preset.id && (
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Color Customizer */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Palette className="h-4 w-4 text-primary" />
                      Color Palette & Branding
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-medium">Primary Brand Color</Label>
                        <div className="flex items-center gap-2 mt-1.5">
                          <input
                            type="color"
                            value={hslToHex(theme.primary)}
                            onChange={(e) => handleThemeColorChange("primary", hexToHsl(e.target.value))}
                            className="w-9 h-9 rounded-lg border border-input cursor-pointer shrink-0"
                          />
                          <Input
                            size={1}
                            value={theme.primary}
                            onChange={(e) => handleThemeColorChange("primary", e.target.value)}
                            className="text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs font-medium">Accent Color</Label>
                        <div className="flex items-center gap-2 mt-1.5">
                          <input
                            type="color"
                            value={hslToHex(theme.accent)}
                            onChange={(e) => handleThemeColorChange("accent", hexToHsl(e.target.value))}
                            className="w-9 h-9 rounded-lg border border-input cursor-pointer shrink-0"
                          />
                          <Input
                            size={1}
                            value={theme.accent}
                            onChange={(e) => handleThemeColorChange("accent", e.target.value)}
                            className="text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs font-medium">Page Background</Label>
                        <div className="flex items-center gap-2 mt-1.5">
                          <input
                            type="color"
                            value={hslToHex(theme.background)}
                            onChange={(e) => handleThemeColorChange("background", hexToHsl(e.target.value))}
                            className="w-9 h-9 rounded-lg border border-input cursor-pointer shrink-0"
                          />
                          <Input
                            size={1}
                            value={theme.background}
                            onChange={(e) => handleThemeColorChange("background", e.target.value)}
                            className="text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs font-medium">Card Background</Label>
                        <div className="flex items-center gap-2 mt-1.5">
                          <input
                            type="color"
                            value={hslToHex(theme.card)}
                            onChange={(e) => handleThemeColorChange("card", hexToHsl(e.target.value))}
                            className="w-9 h-9 rounded-lg border border-input cursor-pointer shrink-0"
                          />
                          <Input
                            size={1}
                            value={theme.card}
                            onChange={(e) => handleThemeColorChange("card", e.target.value)}
                            className="text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs font-medium">Dark Mode Default</Label>
                          <p className="text-[11px] text-muted-foreground">Force dark background by default</p>
                        </div>
                        <Switch
                          checked={theme.darkMode}
                          onCheckedChange={(checked) => {
                            const updated = {
                              ...theme,
                              darkMode: checked,
                              background: checked ? "220 20% 8%" : "0 0% 97%",
                              foreground: checked ? "0 0% 95%" : "220 20% 10%",
                              card: checked ? "220 20% 12%" : "0 0% 100%",
                              cardForeground: checked ? "0 0% 95%" : "220 20% 10%",
                            };
                            setTheme(updated);
                            applyThemeToDOM(updated);
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Typography & Shapes */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Type className="h-4 w-4 text-primary" />
                      Typography & Radius
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-xs font-medium">Font Family</Label>
                      <Select
                        value={theme.fontFamily || "Inter"}
                        onValueChange={(val) => {
                          const updated = { ...theme, fontFamily: val };
                          setTheme(updated);
                          applyThemeToDOM(updated);
                        }}
                      >
                        <SelectTrigger className="mt-1.5 text-xs">
                          <SelectValue placeholder="Select font" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Inter">Inter (Clean Modern)</SelectItem>
                          <SelectItem value="Poppins">Poppins (Geometric Round)</SelectItem>
                          <SelectItem value="Roboto">Roboto (Classic)</SelectItem>
                          <SelectItem value="Outfit">Outfit (Bold Modern)</SelectItem>
                          <SelectItem value="Plus Jakarta Sans">Plus Jakarta Sans (Sleek)</SelectItem>
                          <SelectItem value="Nunito">Nunito (Friendly Round)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-medium">Corner Radius (Roundness)</Label>
                      <div className="grid grid-cols-4 gap-2 mt-1.5">
                        {[
                          { label: "Square", val: "0rem" },
                          { label: "Slight", val: "0.375rem" },
                          { label: "Standard", val: "0.75rem" },
                          { label: "Rounded", val: "1.25rem" },
                        ].map((r) => (
                          <button
                            key={r.val}
                            onClick={() => {
                              const updated = { ...theme, radius: r.val };
                              setTheme(updated);
                              applyThemeToDOM(updated);
                            }}
                            className={`p-2 border text-[11px] text-center transition-all ${
                              theme.radius === r.val
                                ? "border-primary bg-primary/10 text-primary font-bold"
                                : "hover:bg-muted"
                            }`}
                            style={{ borderRadius: r.val }}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB 2: Hero & Promo Banners */}
              <TabsContent value="banners" className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-primary" />
                        Hero Banner Carousel
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Main top banner slides visible on the storefront index page.
                      </CardDescription>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleOpenAddBanner("hero")}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Banner
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {heroBanners.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No hero banners created yet.</p>
                    ) : (
                      heroBanners.map((banner, index) => (
                        <div
                          key={banner.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:border-primary/50 transition-all gap-3"
                        >
                          <img
                            src={banner.image_url}
                            alt={banner.title}
                            className="w-16 h-10 object-cover rounded border shrink-0 bg-muted"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold truncate">{banner.title}</p>
                              {banner.badge && (
                                <Badge variant="secondary" className="text-[10px] py-0 h-4">
                                  {banner.badge}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">{banner.subtitle || banner.link_url}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Switch
                              checked={banner.is_active}
                              onCheckedChange={() => handleToggleBannerActive(banner.id, true)}
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditBanner(banner)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteBanner(banner.id, true)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Promo Side Banners */}
                <Card>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4 text-primary" />
                        Promo & Category Banners
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Secondary promotional banners displayed below the main carousel.
                      </CardDescription>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleOpenAddBanner("promo")}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Promo
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {promoBanners.map((banner) => (
                      <div
                        key={banner.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:border-primary/50 transition-all gap-3"
                      >
                        <img
                          src={banner.image_url}
                          alt={banner.title}
                          className="w-14 h-10 object-cover rounded border shrink-0 bg-muted"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{banner.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{banner.subtitle}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Switch
                            checked={banner.is_active}
                            onCheckedChange={() => handleToggleBannerActive(banner.id, false)}
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditBanner(banner)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteBanner(banner.id, false)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB 3: Top Announcement Bar */}
              <TabsContent value="announcement" className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Megaphone className="h-4 w-4 text-primary" />
                      Top Announcement Bar
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Sticky offer banner displayed at the very top of all user pages.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Enable Announcement Bar</Label>
                      <Switch
                        checked={announcementBar.enabled}
                        onCheckedChange={(val) => setAnnouncementBar(prev => ({ ...prev, enabled: val }))}
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-medium">Announcement Message</Label>
                      <Textarea
                        rows={2}
                        value={announcementBar.text}
                        onChange={(e) => setAnnouncementBar(prev => ({ ...prev, text: e.target.value }))}
                        placeholder="e.g. ⚡ Mega Sale: Up to 50% discount on all electronics!"
                        className="text-xs mt-1.5"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-medium">Bar Background Color</Label>
                        <div className="flex items-center gap-2 mt-1.5">
                          <input
                            type="color"
                            value={announcementBar.bgColor}
                            onChange={(e) => setAnnouncementBar(prev => ({ ...prev, bgColor: e.target.value }))}
                            className="w-8 h-8 rounded border shrink-0 cursor-pointer"
                          />
                          <Input
                            size={1}
                            value={announcementBar.bgColor}
                            onChange={(e) => setAnnouncementBar(prev => ({ ...prev, bgColor: e.target.value }))}
                            className="text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs font-medium">CTA Link Text</Label>
                        <Input
                          value={announcementBar.linkText}
                          onChange={(e) => setAnnouncementBar(prev => ({ ...prev, linkText: e.target.value }))}
                          className="text-xs mt-1.5"
                          placeholder="Shop Now"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB 4: Header & Branding */}
              <TabsContent value="header" className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-primary" />
                      Storefront Header & Brand
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-xs font-medium">Store Brand Name</Label>
                      <Input
                        value={headerConfig.storeName}
                        onChange={(e) => setHeaderConfig(prev => ({ ...prev, storeName: e.target.value }))}
                        className="text-xs mt-1.5"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-medium">Store Logo Image URL</Label>
                      <Input
                        value={headerConfig.logoUrl}
                        onChange={(e) => setHeaderConfig(prev => ({ ...prev, logoUrl: e.target.value }))}
                        className="text-xs mt-1.5"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <Label className="text-xs font-medium">Show Category Navigation Bar</Label>
                      <Switch
                        checked={headerConfig.showCategories}
                        onCheckedChange={(val) => setHeaderConfig(prev => ({ ...prev, showCategories: val }))}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Live Interactive Preview Column */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <Card className="flex-1 flex flex-col overflow-hidden border-2 border-primary/20 shadow-lg">
              {/* Preview Header & Controls */}
              <div className="p-3 bg-muted/70 border-b flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground ml-2">Live Storefront Preview</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Device Switcher */}
                  <div className="flex items-center bg-card border rounded-lg p-0.5">
                    <Button
                      size="icon"
                      variant={previewDevice === "desktop" ? "secondary" : "ghost"}
                      className="h-7 w-7"
                      onClick={() => setPreviewDevice("desktop")}
                      title="Desktop View"
                    >
                      <Monitor className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant={previewDevice === "tablet" ? "secondary" : "ghost"}
                      className="h-7 w-7"
                      onClick={() => setPreviewDevice("tablet")}
                      title="Tablet View"
                    >
                      <Tablet className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant={previewDevice === "mobile" ? "secondary" : "ghost"}
                      className="h-7 w-7"
                      onClick={() => setPreviewDevice("mobile")}
                      title="Mobile View"
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <a
                    href="/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-xs text-primary hover:underline font-medium"
                  >
                    View Live <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              </div>

              {/* Rendered Simulated Storefront Window */}
              <div className="flex-1 bg-muted/30 p-4 overflow-y-auto flex justify-center">
                <div
                  className={`bg-background border shadow-2xl transition-all duration-300 overflow-hidden flex flex-col ${
                    previewDevice === "mobile"
                      ? "w-[375px] min-h-[667px] rounded-[32px] border-4 border-slate-800"
                      : previewDevice === "tablet"
                      ? "w-[768px] min-h-[600px] rounded-xl"
                      : "w-full min-h-[600px] rounded-xl"
                  }`}
                  style={{
                    fontFamily: theme.fontFamily ? `'${theme.fontFamily}', sans-serif` : 'inherit',
                    borderRadius: previewDevice === "mobile" ? "32px" : theme.radius
                  }}
                >
                  {/* 1. Top Announcement Bar Preview */}
                  {announcementBar.enabled && (
                    <div
                      className="px-3 py-1.5 text-xs text-center font-medium flex items-center justify-between"
                      style={{ backgroundColor: announcementBar.bgColor, color: announcementBar.textColor }}
                    >
                      <span className="truncate mx-auto">{announcementBar.text}</span>
                      {announcementBar.linkText && (
                        <span className="underline ml-2 shrink-0 font-bold cursor-pointer text-[11px]">
                          {announcementBar.linkText} →
                        </span>
                      )}
                    </div>
                  )}

                  {/* 2. Store Header Preview */}
                  <header className="p-3 border-b bg-card flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2">
                      <img
                        src={headerConfig.logoUrl}
                        alt="Logo"
                        className="h-7 w-auto object-contain"
                        onError={(e: any) => { e.target.style.display = "none"; }}
                      />
                      <span className="font-bold text-sm text-foreground">{headerConfig.storeName}</span>
                    </div>

                    {headerConfig.showSearch && (
                      <div className="flex-1 max-w-xs relative hidden sm:block">
                        <Input
                          placeholder="Search 50,000+ products..."
                          className="h-8 text-xs pl-8 rounded-full bg-muted/50"
                          readOnly
                        />
                        <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                      </div>
                    )}

                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7">
                        <Heart className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 relative">
                        <ShoppingCart className="h-4 w-4" />
                        <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                          3
                        </span>
                      </Button>
                    </div>
                  </header>

                  {/* Category Nav Bar */}
                  {headerConfig.showCategories && (
                    <div className="px-4 py-2 border-b bg-card text-xs flex gap-4 overflow-x-auto text-muted-foreground whitespace-nowrap">
                      <span className="font-semibold text-primary">All Categories</span>
                      <span>Electronics</span>
                      <span>Fashion</span>
                      <span>Gadgets</span>
                      <span>Beauty</span>
                      <span>Home</span>
                      <span>Flash Deals</span>
                    </div>
                  )}

                  {/* Storefront Main Hero Banner Preview */}
                  <main className="p-3 sm:p-4 space-y-4 flex-1">
                    {activeHeroSlides.length > 0 ? (
                      <div className="relative rounded-xl overflow-hidden border shadow-sm group min-h-[180px] sm:min-h-[220px] bg-card">
                        {/* Slide Image Background */}
                        <div className="absolute inset-0">
                          <img
                            src={activeHeroSlides[previewSlideIndex % activeHeroSlides.length]?.image_url}
                            alt="Banner"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                        </div>

                        {/* Slide Content Overlay */}
                        <div className="relative z-10 p-4 sm:p-6 text-white max-w-sm flex flex-col justify-center h-full min-h-[180px] sm:min-h-[220px]">
                          {activeHeroSlides[previewSlideIndex % activeHeroSlides.length]?.badge && (
                            <Badge className="bg-primary text-primary-foreground border-none text-[10px] w-fit mb-2 font-bold">
                              {activeHeroSlides[previewSlideIndex % activeHeroSlides.length]?.badge}
                            </Badge>
                          )}
                          <h2 className="text-lg sm:text-2xl font-extrabold leading-tight">
                            {activeHeroSlides[previewSlideIndex % activeHeroSlides.length]?.title}
                          </h2>
                          <p className="text-xs text-white/90 mt-1 line-clamp-2">
                            {activeHeroSlides[previewSlideIndex % activeHeroSlides.length]?.subtitle}
                          </p>
                          <Button
                            size="sm"
                            className="mt-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold w-fit text-xs h-8"
                          >
                            {activeHeroSlides[previewSlideIndex % activeHeroSlides.length]?.cta_text || "Shop Now"}
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>

                        {/* Slide Nav Arrows */}
                        {activeHeroSlides.length > 1 && (
                          <div className="absolute bottom-2 right-2 flex gap-1 z-20">
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-6 w-6 rounded-full bg-black/40 text-white hover:bg-black/60"
                              onClick={() => setPreviewSlideIndex(prev => (prev - 1 + activeHeroSlides.length) % activeHeroSlides.length)}
                            >
                              <ChevronLeft className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-6 w-6 rounded-full bg-black/40 text-white hover:bg-black/60"
                              onClick={() => setPreviewSlideIndex(prev => (prev + 1) % activeHeroSlides.length)}
                            >
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-8 text-center border border-dashed rounded-xl bg-card">
                        <p className="text-xs text-muted-foreground">No active hero banners to preview.</p>
                      </div>
                    )}

                    {/* Promo Cards Grid Preview */}
                    <div className="grid grid-cols-2 gap-3">
                      {promoBanners.filter(p => p.is_active).slice(0, 2).map((promo) => (
                        <div key={promo.id} className="relative rounded-xl overflow-hidden border h-24 bg-card group">
                          <img src={promo.image_url} alt={promo.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2.5 flex flex-col justify-end text-white">
                            <p className="text-xs font-bold truncate">{promo.title}</p>
                            <p className="text-[10px] text-white/80 truncate">{promo.subtitle}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Simulated Product Card Grid (showing applied theme styling) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold text-foreground">Featured Products</h3>
                        <span className="text-[11px] text-primary hover:underline cursor-pointer">View All →</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { title: "Wireless ANC Earbuds", price: "৳1,850", oldPrice: "৳2,500", img: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300&h=300&fit=crop" },
                          { title: "Smart Watch Series 9", price: "৳3,490", oldPrice: "৳4,990", img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop" },
                          { title: "Ultra Running Shoes", price: "৳2,190", oldPrice: "৳3,200", img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop" },
                        ].map((prod, idx) => (
                          <div
                            key={idx}
                            className="bg-card border rounded-xl overflow-hidden p-2 flex flex-col justify-between hover:shadow-md transition-all"
                            style={{ borderRadius: theme.radius }}
                          >
                            <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-2 relative">
                              <img src={prod.img} alt={prod.title} className="w-full h-full object-cover" />
                              <Badge className="absolute top-1 left-1 bg-primary text-primary-foreground text-[9px] py-0">
                                SALE
                              </Badge>
                            </div>
                            <p className="text-xs font-medium truncate text-foreground">{prod.title}</p>
                            <div className="flex items-center justify-between mt-1">
                              <div>
                                <span className="text-xs font-bold text-primary">{prod.price}</span>
                                <span className="text-[10px] text-muted-foreground line-through ml-1">{prod.oldPrice}</span>
                              </div>
                              <Button size="icon" className="h-6 w-6 rounded-full bg-primary text-primary-foreground">
                                <ShoppingCart className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </main>

                  {/* Simulated Footer */}
                  <footer className="p-3 border-t bg-card text-center text-[10px] text-muted-foreground">
                    <p>© 2026 {headerConfig.storeName} — Live Theme Preview Active</p>
                  </footer>
                </div>
              </div>
            </Card>
          </div>

        </div>
      </div>

      {/* Banner Add/Edit Modal */}
      <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              {editingBanner ? "Edit Banner" : "Add New Banner"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium">Banner Title *</Label>
              <Input
                value={bannerForm.title}
                onChange={(e) => setBannerForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Mega Electronics Discount"
                className="text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-medium">Subtitle / Offer Description</Label>
              <Input
                value={bannerForm.subtitle}
                onChange={(e) => setBannerForm(prev => ({ ...prev, subtitle: e.target.value }))}
                placeholder="e.g. Up to 50% Off on top brands"
                className="text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-medium">Banner Image URL *</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={bannerForm.image_url}
                  onChange={(e) => setBannerForm(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://..."
                  className="text-xs"
                />
                <label className="cursor-pointer shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileUpload}
                    className="hidden"
                  />
                  <Button variant="outline" size="sm" type="button" disabled={uploadingImage}>
                    {uploadingImage ? <div className="h-3 w-3 animate-spin border-2 border-primary border-t-transparent rounded-full" /> : <Upload className="h-3.5 w-3.5" />}
                  </Button>
                </label>
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <Label className="text-[11px] text-muted-foreground">Or pick sample image:</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {UNSPLASH_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setBannerForm(prev => ({ ...prev, image_url: p.url }))}
                    className="text-[10px] bg-muted hover:bg-primary/10 hover:text-primary px-2 py-1 rounded border"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Badge Tag Overlay</Label>
                <Input
                  value={bannerForm.badge}
                  onChange={(e) => setBannerForm(prev => ({ ...prev, badge: e.target.value }))}
                  placeholder="HOT DEAL"
                  className="text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-medium">CTA Button Text</Label>
                <Input
                  value={bannerForm.cta_text}
                  onChange={(e) => setBannerForm(prev => ({ ...prev, cta_text: e.target.value }))}
                  placeholder="Shop Now"
                  className="text-xs mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">Click Destination URL</Label>
              <Input
                value={bannerForm.link_url}
                onChange={(e) => setBannerForm(prev => ({ ...prev, link_url: e.target.value }))}
                placeholder="/products"
                className="text-xs mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBannerDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveBannerModal}>
              Save Banner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
