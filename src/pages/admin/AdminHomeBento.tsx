import { useEffect, useRef, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/firebaseAdapter";
import {
  Loader2, Upload, Pencil, Eye, EyeOff, Trash2, RotateCcw, Save, Check, Cpu, Shirt,
  Home as HomeIcon, Sparkles, ImagePlus, Plus, Move, Maximize2, Palette, Type,
  AlignLeft, AlignCenter, AlignRight,
} from "lucide-react";
import { titleStyle, subtitleStyle, TEXT_TEMPLATES, FONT_OPTIONS, type TextStyle, type TileKind } from "@/lib/bentoText";

type FitMode = "cover" | "contain" | "fill";

interface BentoTile {
  id: string;
  label: string;
  visible: boolean;
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  link?: string;
  objectFit?: FitMode;
  focalX?: number;
  focalY?: number;
  overlay?: number;
  bgColor?: string;
  zoom?: number;
  textStyle?: TextStyle;
  kind?: TileKind;
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

const DEFAULT_TILES: BentoTile[] = [
  { id: "hero", kind: "hero", label: "Main Hero", visible: true, title: "The New Standard", subtitle: "Bangladesh's curated multi-vendor destination for the bold.", link: "/products", objectFit: "cover", focalX: 50, focalY: 50, overlay: 50, zoom: 100, badge: "Darzo Marketplace", badgeVisible: true, ctaText: "Explore Darzo" },
  { id: "flash", kind: "flash", label: "Flash Deals", visible: true, title: "Flash Deals", subtitle: "Up to 70% Off", link: "/products?filter=flash-sale", objectFit: "cover", focalX: 50, focalY: 50, overlay: 20, zoom: 100 },
  { id: "cat_tech", kind: "category", label: "Tech", visible: true, title: "Tech", subtitle: "Gadgets", link: "/categories?c=electronics", objectFit: "cover", focalX: 50, focalY: 50, overlay: 40, zoom: 100 },
  { id: "cat_lifestyle", kind: "category", label: "Lifestyle", visible: true, title: "Lifestyle", subtitle: "Fashion", link: "/categories?c=fashion", objectFit: "cover", focalX: 50, focalY: 50, overlay: 40, zoom: 100 },
  { id: "cat_home", kind: "category", label: "Home", visible: true, title: "Home", subtitle: "Living", link: "/categories?c=home", objectFit: "cover", focalX: 50, focalY: 50, overlay: 40, zoom: 100 },
  { id: "cat_beauty", kind: "category", label: "Beauty", visible: true, title: "Beauty", subtitle: "Skincare", link: "/categories?c=beauty", objectFit: "cover", focalX: 50, focalY: 50, overlay: 40, zoom: 100 },
  { id: "foryou", kind: "foryou", label: "For You", visible: true, title: "For You", subtitle: "Personalize Feed", objectFit: "cover", focalX: 50, focalY: 50, overlay: 0, zoom: 100 },
  { id: "trending", kind: "trending", label: "Trending", visible: true, objectFit: "cover", focalX: 50, focalY: 50, overlay: 60, zoom: 100 },
  { id: "vendors", kind: "vendors", label: "Vendors Banner", visible: true, title: "Multi-Vendor Power", subtitle: "Supporting 1,200+ local artisans and premium global brands across Bangladesh.", objectFit: "cover", focalX: 50, focalY: 50, overlay: 30, zoom: 100 },
];

const CATEGORY_META: Record<string, { bg: string; icon: any }> = {
  cat_tech: { bg: "bg-[#f7931e]", icon: Cpu },
  cat_lifestyle: { bg: "bg-neutral-900", icon: Shirt },
  cat_home: { bg: "bg-[#e84393]", icon: HomeIcon },
  cat_beauty: { bg: "bg-[#6c5ce7]", icon: Sparkles },
};

function getAdminToken() {
  try { return JSON.parse(localStorage.getItem("megamart_admin_session") || "{}").token || null; } catch { return null; }
}
function getAdminId() {
  try { return JSON.parse(localStorage.getItem("megamart_admin_session") || "{}").admin?.id || null; } catch { return null; }
}

interface BentoPayload {
  tiles: BentoTile[];
  sections: CustomSection[];
  mobile?: { tiles: BentoTile[]; sections: CustomSection[] } | null;
}

// Reject javascript:/data:/vbscript: URLs before persisting.
const UNSAFE_URL_RE = /^\s*(javascript|data|vbscript|file):/i;
function sanitizeUrl(u?: string): string | undefined {
  if (!u) return u;
  return UNSAFE_URL_RE.test(u) ? undefined : u;
}
function sanitizeTile<T extends { link?: string; imageUrl?: string }>(t: T): T {
  return { ...t, link: sanitizeUrl(t.link), imageUrl: sanitizeUrl(t.imageUrl) };
}
function sanitizePayload(p: BentoPayload): BentoPayload {
  return {
    tiles: p.tiles.map(sanitizeTile),
    sections: p.sections.map(sanitizeTile),
    mobile: p.mobile
      ? { tiles: p.mobile.tiles.map(sanitizeTile), sections: p.mobile.sections.map(sanitizeTile) }
      : p.mobile,
  };
}

async function saveConfig(payload: BentoPayload) {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-theme?action=save-site-config`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": getAdminToken() || "",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ key: "home_bento", value: sanitizePayload(payload) }),
    }
  );
  if (!res.ok) throw new Error((await res.json()).error || "Save failed");
}

async function loadConfig(): Promise<Partial<BentoPayload> | null> {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-theme?action=site-config&key=home_bento`,
    { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data?.value ?? null;
}

async function uploadImage(file: File): Promise<string> {
  const adminId = getAdminId();
  if (!adminId) throw new Error("Not authenticated");
  const fd = new FormData();
  fd.append("action", "upload");
  fd.append("adminId", adminId);
  fd.append("file", file);
  const { data, error } = await supabase.functions.invoke("admin-banners", { body: fd });
  if (error) throw error;
  if (!data?.url) throw new Error(data?.error || "Upload failed");
  return data.url as string;
}

/* ---------- Shared image style helper ---------- */
function imgStyle(t: Partial<BentoTile>): React.CSSProperties {
  return {
    objectFit: (t.objectFit ?? "cover") as any,
    objectPosition: `${t.focalX ?? 50}% ${t.focalY ?? 50}%`,
    transform: `scale(${(t.zoom ?? 100) / 100})`,
    transformOrigin: `${t.focalX ?? 50}% ${t.focalY ?? 50}%`,
  };
}

/* ---------- Visual editor tile ---------- */

interface TileProps {
  tile: BentoTile;
  className: string;
  onEdit: () => void;
  onUpload: (file: File) => void;
  onToggleVisible: () => void;
  onRemoveImage: () => void;
  uploading: boolean;
  children: React.ReactNode;
}

function EditableTile({ tile, className, onEdit, onUpload, onToggleVisible, onRemoveImage, uploading, children }: TileProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const hidden = !tile.visible;

  return (
    <div className={`group relative ${className} ${hidden ? "opacity-30 grayscale" : ""}`}>
      {children}
      <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 rounded-[inherit] z-30 p-2">
        <div className="flex flex-wrap gap-1.5 justify-center">
          <Button size="sm" variant="secondary" className="h-8 gap-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            <span className="text-[11px]">Image</span>
          </Button>
          <Button size="sm" variant="secondary" className="h-8 gap-1" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
            <span className="text-[11px]">Edit</span>
          </Button>
          <Button size="sm" variant={hidden ? "default" : "destructive"} className="h-8 gap-1" onClick={onToggleVisible}>
            {hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span className="text-[11px]">{hidden ? "Show" : "Hide"}</span>
          </Button>
        </div>
        {tile.imageUrl && (
          <Button size="sm" variant="ghost" className="h-7 text-white/90 hover:text-white hover:bg-white/10 gap-1" onClick={onRemoveImage}>
            <Trash2 className="h-3 w-3" /><span className="text-[10px]">Remove banner</span>
          </Button>
        )}
        <span className="text-[10px] text-white/70 mt-1">{tile.label}</span>
      </div>
      {hidden && (
        <div className="absolute top-2 right-2 z-20 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
          <EyeOff className="h-2.5 w-2.5" /> Hidden
        </div>
      )}
      {tile.imageUrl && !hidden && (
        <div className="absolute top-2 right-2 z-20 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
          <Check className="h-2.5 w-2.5" /> Banner
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
    </div>
  );
}

/* ---------- Focal point picker ---------- */
function FocalPicker({ imageUrl, x, y, onChange }: { imageUrl?: string; x: number; y: number; onChange: (x: number, y: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const handle = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const nx = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
    const ny = Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100));
    onChange(Math.round(nx), Math.round(ny));
  };
  return (
    <div
      ref={ref}
      onClick={handle}
      className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden cursor-crosshair border"
      style={imageUrl ? { backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: `${x}% ${y}%` } : undefined}
    >
      {!imageUrl && <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Upload an image first</div>}
      {imageUrl && (
        <div
          className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg bg-primary/60 pointer-events-none"
          style={{ left: `${x}%`, top: `${y}%` }}
        />
      )}
    </div>
  );
}

/* ---------- Text style editor ---------- */
function TextStyleEditor({ value, onChange }: { value?: TextStyle; onChange: (ts: TextStyle) => void }) {
  const ts = value || {};
  const set = (patch: Partial<TextStyle>) => onChange({ ...ts, ...patch });
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1"><Sparkles className="h-3 w-3" /> Templates</Label>
        <div className="grid grid-cols-2 gap-2">
          {TEXT_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onChange(tpl.style)}
              className="text-left border rounded-lg p-2 hover:border-primary hover:bg-muted/40 transition-colors"
            >
              <div style={{ fontFamily: tpl.style.fontFamily, fontWeight: tpl.style.titleWeight, letterSpacing: tpl.style.letterSpacing != null ? `${tpl.style.letterSpacing/100}em` : undefined, textTransform: tpl.style.uppercase ? "uppercase" : "none", fontStyle: tpl.style.italic ? "italic" : undefined }} className="text-base leading-none truncate">
                {tpl.name}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 truncate">{tpl.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Font family</Label>
        <select
          value={ts.fontFamily ?? ""}
          onChange={(e) => set({ fontFamily: e.target.value || undefined })}
          className="w-full h-9 rounded-md border bg-background px-2 text-xs"
        >
          <option value="">Default</option>
          {FONT_OPTIONS.map((f) => <option key={f.label} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Title size ({ts.titleScale ?? 100}%)</Label>
          <Slider value={[ts.titleScale ?? 100]} min={50} max={250} step={5} onValueChange={([v]) => set({ titleScale: v })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Subtitle size ({ts.subtitleScale ?? 100}%)</Label>
          <Slider value={[ts.subtitleScale ?? 100]} min={50} max={250} step={5} onValueChange={([v]) => set({ subtitleScale: v })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Title color</Label>
          <Input type="color" value={ts.titleColor ?? "#ffffff"} onChange={(e) => set({ titleColor: e.target.value })} className="h-9 w-full" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Subtitle color</Label>
          <Input type="color" value={ts.subtitleColor ?? "#ffffff"} onChange={(e) => set({ subtitleColor: e.target.value })} className="h-9 w-full" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Weight ({ts.titleWeight ?? 700})</Label>
          <Slider value={[ts.titleWeight ?? 700]} min={300} max={900} step={100} onValueChange={([v]) => set({ titleWeight: v })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Letter spacing ({(ts.letterSpacing ?? 0) / 100}em)</Label>
          <Slider value={[ts.letterSpacing ?? 0]} min={-5} max={30} step={1} onValueChange={([v]) => set({ letterSpacing: v })} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs mr-2">Align</Label>
        {([{v:"left",I:AlignLeft},{v:"center",I:AlignCenter},{v:"right",I:AlignRight}] as const).map(({v,I}) => (
          <Button key={v} type="button" size="sm" variant={ts.align === v ? "default" : "outline"} onClick={() => set({ align: v })}><I className="h-3.5 w-3.5" /></Button>
        ))}
        <div className="flex-1" />
        <Button type="button" size="sm" variant={ts.uppercase ? "default" : "outline"} onClick={() => set({ uppercase: !ts.uppercase })}>AA</Button>
        <Button type="button" size="sm" variant={ts.italic ? "default" : "outline"} onClick={() => set({ italic: !ts.italic })} className="italic">I</Button>
      </div>

      <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => onChange({})}>
        <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset text style
      </Button>
    </div>
  );
}

/* ---------- Main page ---------- */

export default function AdminHomeBento() {
  const [desktopTiles, setDesktopTiles] = useState<BentoTile[]>(DEFAULT_TILES);
  const [desktopSections, setDesktopSections] = useState<CustomSection[]>([]);
  // null = mobile inherits desktop (no separate config yet)
  const [mobileTiles, setMobileTiles] = useState<BentoTile[] | null>(null);
  const [mobileSections, setMobileSections] = useState<CustomSection[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<BentoTile | null>(null);
  const [editingSection, setEditingSection] = useState<CustomSection | null>(null);
  const [dirty, setDirty] = useState(false);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [mobileFrameKey, setMobileFrameKey] = useState(0);

  // Active state — what the editor writes to based on device mode
  const isMobile = viewMode === "mobile";
  const tiles: BentoTile[] = isMobile ? (mobileTiles ?? desktopTiles) : desktopTiles;
  const sections: CustomSection[] = isMobile ? (mobileSections ?? desktopSections) : desktopSections;

  useEffect(() => {
    loadConfig()
      .then((saved) => {
        // Compute desktop tiles first so mobile can inherit accurately.
        const desktopMerged = saved?.tiles?.length
          ? DEFAULT_TILES.map((d) => ({ ...d, ...(saved.tiles!.find((s) => s.id === d.id) ?? {}) }))
          : DEFAULT_TILES;
        if (saved?.tiles?.length) setDesktopTiles(desktopMerged);
        if (saved?.sections?.length) setDesktopSections(saved.sections);
        if (saved?.mobile?.tiles?.length) {
          // Mobile overrides layer on top of desktop, not DEFAULT_TILES,
          // so unmodified mobile tiles reflect the current desktop config.
          setMobileTiles(
            desktopMerged.map((d) => ({ ...d, ...(saved.mobile!.tiles.find((s) => s.id === d.id) ?? {}) }))
          );
        }
        if (saved?.mobile?.sections) setMobileSections(saved.mobile.sections);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Warn before unloading with unsaved changes (data-loss guard).
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const get = (id: string) => tiles.find((t) => t.id === id)!;

  const update = (id: string, patch: Partial<BentoTile>) => {
    if (isMobile) {
      setMobileTiles((prev) => {
        const base = prev ?? desktopTiles.map((t) => ({ ...t }));
        return base.map((t) => (t.id === id ? { ...t, ...patch } : t));
      });
    } else {
      setDesktopTiles((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    }
    setDirty(true);
  };

  const handleUpload = async (id: string, file: File) => {
    setUploadingId(id);
    try {
      const url = await uploadImage(file);
      update(id, { imageUrl: url });
      toast({ title: `Banner uploaded — ${isMobile ? "mobile" : "desktop"} only` });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally { setUploadingId(null); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveConfig({
        tiles: desktopTiles,
        sections: desktopSections,
        mobile: mobileTiles || mobileSections
          ? { tiles: mobileTiles ?? desktopTiles, sections: mobileSections ?? desktopSections }
          : null,
      });
      setDirty(false);
      toast({ title: "Saved", description: "Desktop & mobile layouts updated." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const resetAll = () => {
    if (isMobile) {
      setMobileTiles(null); setMobileSections(null);
      toast({ title: "Mobile reset", description: "Mobile now inherits desktop." });
    } else {
      setDesktopTiles(DEFAULT_TILES); setDesktopSections([]);
      toast({ title: "Desktop reset to defaults" });
    }
    setDirty(true);
  };

  const setSectionsActive = (updater: (prev: CustomSection[]) => CustomSection[]) => {
    if (isMobile) {
      setMobileSections((prev) => updater(prev ?? desktopSections.map((s) => ({ ...s }))));
    } else {
      setDesktopSections((prev) => updater(prev));
    }
    setDirty(true);
  };

  const addSection = () => {
    const s: CustomSection = {
      id: `sec_${Date.now()}`,
      title: "New Section",
      subtitle: "Describe this banner",
      layout: "full",
      visible: true,
      overlay: 40, focalX: 50, focalY: 50,
    };
    setSectionsActive((p) => [...p, s]);
    setEditingSection(s);
  };
  const updateSection = (id: string, patch: Partial<CustomSection>) => {
    setSectionsActive((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };
  const removeSection = (id: string) => {
    setSectionsActive((p) => p.filter((s) => s.id !== id));
  };
  const uploadSectionImage = async (id: string, file: File) => {
    try { const url = await uploadImage(file); updateSection(id, { imageUrl: url }); toast({ title: "Section image uploaded" }); }
    catch (e: any) { toast({ title: "Upload failed", description: e.message, variant: "destructive" }); }
  };


  if (loading) {
    return <AdminLayout title="Home Bento Manager"><div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AdminLayout>;
  }

  const hero = get("hero"), flash = get("flash"), foryou = get("foryou"), trending = get("trending"), vendors = get("vendors");

  const renderImg = (t: BentoTile, className = "absolute inset-0 w-full h-full") =>
    t.imageUrl ? <img src={t.imageUrl} alt="" className={className} style={imgStyle(t)} /> : null;

  return (
    <AdminLayout title="Home Bento Manager">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card border rounded-2xl p-4 sticky top-0 z-40">
          <div>
            <h1 className="text-xl font-bold">Visual Site Editor</h1>
            <p className="text-xs text-muted-foreground">Edits apply only to the selected device. Switch <b>Desktop / Mobile</b> to edit each independently.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Device toggle */}
            <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("desktop")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${viewMode === "desktop" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >
                Desktop
              </button>
              <button
                type="button"
                onClick={() => { setViewMode("mobile"); setMobileFrameKey((k) => k + 1); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${viewMode === "mobile" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >
                Mobile
              </button>
            </div>
            {dirty && <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>}
            <Button variant="outline" size="sm" onClick={resetAll}><RotateCcw className="h-4 w-4 mr-1.5" />Reset</Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />} Save Changes
            </Button>
          </div>

        </div>

        {/* Bento preview — mirrors HeroBento exactly */}
        <div className={`bg-muted/30 border rounded-3xl p-4 md:p-6 ${viewMode === "desktop" ? "" : "hidden"}`}>

          <div className="w-full font-['Barlow',sans-serif]">
            <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[150px] md:auto-rows-[200px] gap-3 md:gap-5">

              {/* Hero */}
              <EditableTile tile={hero}
                className="col-span-2 row-span-2 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl shadow-[#6c5ce7]/30"
                onEdit={() => setEditing(hero)} onUpload={(f) => handleUpload("hero", f)}
                onToggleVisible={() => update("hero", { visible: !hero.visible })}
                onRemoveImage={() => update("hero", { imageUrl: undefined })} uploading={uploadingId === "hero"}>
                {hero.imageUrl ? (
                  <>
                    <img src={hero.imageUrl} alt="" className="absolute inset-0 w-full h-full" style={imgStyle(hero)} />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(0,0,0,${Math.max((hero.overlay ?? 50)/100, 0.35)}), transparent)` }} />
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-[#6c5ce7] via-[#e84393] to-[#ff6b35]" />
                    <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-[#f7931e]/30 rounded-full blur-3xl" />
                  </>
                )}
                <div className="relative z-10 h-full flex flex-col justify-end p-6 md:p-12 text-white">
                  {hero.badgeVisible !== false && (
                    <span className="inline-flex w-fit items-center gap-2 bg-white/15 backdrop-blur px-3 py-1 rounded-full text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase mb-3 md:mb-6">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      {hero.badge || "Darzo Marketplace"}
                    </span>
                  )}
                  <h1 className="font-['Bebas_Neue'] leading-[0.85] tracking-tight uppercase mb-3 md:mb-4" style={titleStyle("hero", hero.textStyle)}>
                    {hero.title || "The New Standard"}
                  </h1>
                  <p className="font-medium opacity-90 max-w-sm mb-4 md:mb-6" style={subtitleStyle("hero", hero.textStyle)}>
                    {hero.subtitle || "Bangladesh's curated multi-vendor destination for the bold."}
                  </p>
                  {hero.ctaText !== "" && (
                    <span className="w-fit bg-white text-[#6c5ce7] px-5 py-3 md:px-8 md:py-4 rounded-full font-bold text-[10px] md:text-xs tracking-[0.2em] uppercase shadow-xl">
                      {hero.ctaText || "Explore Darzo"}
                    </span>
                  )}
                </div>

              </EditableTile>

              {/* Flash */}
              <EditableTile tile={flash}
                className="col-span-2 row-span-1 rounded-[1.75rem] md:rounded-[2rem] bg-card border border-border overflow-hidden shadow-xl shadow-black/5"
                onEdit={() => setEditing(flash)} onUpload={(f) => handleUpload("flash", f)}
                onToggleVisible={() => update("flash", { visible: !flash.visible })}
                onRemoveImage={() => update("flash", { imageUrl: undefined })} uploading={uploadingId === "flash"}>
                {flash.imageUrl && (
                  <img src={flash.imageUrl} alt="" className="absolute inset-0 w-full h-full opacity-30" style={imgStyle(flash)} />
                )}
                <div className="relative z-10 h-full flex items-center justify-between p-4 md:p-6">
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 mb-1 md:mb-2">
                      <span className="w-2 h-2 rounded-full bg-[#e84393] animate-pulse" />
                      <span className="text-[#e84393] font-bold text-[9px] md:text-[10px] uppercase tracking-[0.2em] tabular-nums">Ends in 03:59:58</span>
                    </div>
                    <h2 className="font-['Bebas_Neue'] text-foreground leading-none" style={titleStyle("flash", flash.textStyle)}>{flash.title || "Flash Deals"}</h2>
                    <p className="text-muted-foreground font-bold uppercase tracking-widest mt-1" style={subtitleStyle("flash", flash.textStyle)}>{flash.subtitle || "Up to 70% Off"}</p>
                  </div>
                  <div className="flex gap-2 md:gap-3 shrink-0">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-[#ff6b35] to-[#e84393] rounded-2xl shadow-lg" />
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-[#6c5ce7] to-[#e84393] rounded-2xl shadow-lg -rotate-2 hidden sm:block" />
                  </div>
                </div>
              </EditableTile>

              {/* Categories */}
              {(["cat_tech","cat_lifestyle","cat_home","cat_beauty"] as const).map((id) => {
                const t = get(id); const meta = CATEGORY_META[id]; const Icon = meta.icon;
                return (
                  <EditableTile key={id} tile={t}
                    className={`col-span-1 row-span-1 rounded-[1.75rem] md:rounded-[2rem] ${t.imageUrl ? "" : meta.bg} overflow-hidden shadow-lg`}
                    onEdit={() => setEditing(t)} onUpload={(f) => handleUpload(id, f)}
                    onToggleVisible={() => update(id, { visible: !t.visible })}
                    onRemoveImage={() => update(id, { imageUrl: undefined })} uploading={uploadingId === id}>
                    {t.imageUrl && (
                      <>
                        <img src={t.imageUrl} alt="" className="absolute inset-0 w-full h-full" style={imgStyle(t)} />
                        <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${(t.overlay ?? 40)/100})` }} />
                      </>
                    )}
                    <div className="relative z-10 h-full flex flex-col justify-between p-4 md:p-6 text-white">
                      <div className="h-9 w-9 md:h-10 md:w-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                      </div>
                      <h3 className="font-['Bebas_Neue'] leading-none tracking-wide" style={titleStyle("category", t.textStyle)}>
                        {t.title}<br /><span style={subtitleStyle("category", t.textStyle)}>{t.subtitle}</span>
                      </h3>
                    </div>
                    {!t.imageUrl && (
                      <div className="absolute -bottom-4 -right-4 opacity-15 pointer-events-none">
                        <Icon className="w-20 h-20 md:w-24 md:h-24 text-white" />
                      </div>
                    )}
                  </EditableTile>
                );
              })}

              {/* For You */}
              <EditableTile tile={foryou}
                className="col-span-2 md:col-span-1 row-span-2 rounded-[2rem] md:rounded-[2.5rem] bg-card border border-border overflow-hidden shadow-xl shadow-black/5"
                onEdit={() => setEditing(foryou)} onUpload={(f) => handleUpload("foryou", f)}
                onToggleVisible={() => update("foryou", { visible: !foryou.visible })}
                onRemoveImage={() => update("foryou", { imageUrl: undefined })} uploading={uploadingId === "foryou"}>
                {renderImg(foryou)}
                <div className="relative z-10 h-full p-5 md:p-8 flex flex-col">
                  <h3 className="font-['Bebas_Neue'] text-foreground mb-4 md:mb-6" style={titleStyle("foryou", foryou.textStyle)}>{foryou.title || "For You"}</h3>
                  <div className="space-y-4 md:space-y-6 flex-1">
                    {[1,2,3].map((i) => (
                      <div key={i} className="flex items-center gap-3 md:gap-4">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-muted rounded-xl shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 bg-muted rounded w-3/4" />
                          <div className="h-2.5 bg-muted rounded w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 md:mt-6 w-full border border-border py-2.5 md:py-3 rounded-2xl text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] flex items-center justify-center">
                    {foryou.subtitle || "Personalize Feed"}
                  </div>
                </div>
              </EditableTile>

              {/* Trending */}
              <EditableTile tile={trending}
                className="col-span-2 md:col-span-1 row-span-2 rounded-[2rem] md:rounded-[2.5rem] bg-neutral-200 overflow-hidden shadow-lg"
                onEdit={() => setEditing(trending)} onUpload={(f) => handleUpload("trending", f)}
                onToggleVisible={() => update("trending", { visible: !trending.visible })}
                onRemoveImage={() => update("trending", { imageUrl: undefined })} uploading={uploadingId === "trending"}>
                {trending.imageUrl ? (
                  <img src={trending.imageUrl} alt="" className="absolute inset-0 w-full h-full" style={imgStyle(trending)} />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#ff6b35] via-[#e84393] to-[#6c5ce7]" />
                )}
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(0,0,0,${Math.max((trending.overlay ?? 60)/100, 0.4)}), transparent)` }} />
                <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 text-white">
                  <span className="font-bold bg-[#ff6b35] px-3 py-1 rounded-full uppercase tracking-widest" style={subtitleStyle("trending", trending.textStyle)}>
                    {trending.subtitle || "Trending"}
                  </span>
                  <h3 className="font-['Bebas_Neue'] mt-2 md:mt-3 leading-none tracking-wider line-clamp-2" style={titleStyle("trending", trending.textStyle)}>
                    {trending.title || "Capture Purity"}
                  </h3>
                </div>
              </EditableTile>

              {/* Vendors */}
              <EditableTile tile={vendors}
                className="col-span-2 row-span-1 rounded-[2rem] md:rounded-[2.5rem] bg-muted/50 border border-border overflow-hidden"
                onEdit={() => setEditing(vendors)} onUpload={(f) => handleUpload("vendors", f)}
                onToggleVisible={() => update("vendors", { visible: !vendors.visible })}
                onRemoveImage={() => update("vendors", { imageUrl: undefined })} uploading={uploadingId === "vendors"}>
                {vendors.imageUrl && (
                  <img src={vendors.imageUrl} alt="" className="absolute inset-0 w-full h-full opacity-40" style={imgStyle(vendors)} />
                )}
                <div className="relative z-10 h-full p-5 md:p-8 flex flex-col md:flex-row items-center gap-4 md:gap-8 justify-between">
                  <div className="flex flex-col text-center md:text-left">
                    <h4 className="font-['Bebas_Neue'] text-foreground leading-none mb-1.5 md:mb-2" style={titleStyle("vendors", vendors.textStyle)}>
                      {vendors.title || "Multi-Vendor Power"}
                    </h4>
                    <p className="text-muted-foreground font-medium" style={subtitleStyle("vendors", vendors.textStyle)}>
                      {vendors.subtitle || "Supporting 1,200+ local artisans and premium global brands across Bangladesh."}
                    </p>
                  </div>
                  <div className="flex -space-x-3 md:-space-x-4 shrink-0">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-4 border-background bg-card shadow-sm flex items-center justify-center font-bold text-muted-foreground italic">D</div>
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-4 border-background bg-[#6c5ce7] shadow-sm flex items-center justify-center font-bold text-white">Z</div>
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-4 border-background bg-[#e84393] shadow-sm flex items-center justify-center font-bold text-white italic">A</div>
                  </div>
                </div>
              </EditableTile>
            </div>
          </div>
        </div>


        {/* Mobile visual editor — interactive, full editing on a phone-sized canvas */}
        {viewMode === "mobile" && (
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border rounded-3xl p-4 md:p-8 flex flex-col items-center gap-4">
            <div className="flex items-center justify-between w-full max-w-[430px]">
              <div>
                <p className="text-xs font-semibold text-white">Mobile Visual Editor (390px)</p>
                <p className="text-[10px] text-white/60">Edits here apply to <b>mobile only</b>. Desktop stays untouched.</p>
              </div>
              <span className="text-[10px] text-white/60">Live · no reload needed</span>
            </div>

            {/* Phone frame — inner scrollable, outer page scrolls too */}
            <div className="relative rounded-[2.5rem] bg-black p-3 shadow-2xl mx-auto" style={{ width: 414 }}>
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-10 pointer-events-none" />
              <div className="rounded-[1.75rem] bg-background overflow-y-scroll overscroll-contain" style={{ width: 390, height: "70vh", WebkitOverflowScrolling: "touch" }}>
                <div className="p-3 pt-10 pb-6 font-['Barlow',sans-serif]">
                  <div className="grid grid-cols-2 grid-rows-[repeat(6,128px)] gap-2.5">

                    {/* Hero */}
                    <EditableTile tile={hero}
                      className="col-span-2 row-span-2 rounded-[1.5rem] overflow-hidden shadow-[0_20px_60px_-15px_rgba(108,92,231,0.55)] ring-1 ring-white/10"
                      onEdit={() => setEditing(hero)} onUpload={(f) => handleUpload("hero", f)}
                      onToggleVisible={() => update("hero", { visible: !hero.visible })}
                      onRemoveImage={() => update("hero", { imageUrl: undefined })} uploading={uploadingId === "hero"}>
                      {hero.imageUrl ? (
                        <>
                          <img src={hero.imageUrl} alt="" className="absolute inset-0 w-full h-full" style={imgStyle(hero)} />
                          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(0,0,0,${Math.max((hero.overlay ?? 50)/100, 0.35)}), transparent)` }} />
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#6c5ce7] via-[#e84393] to-[#ff6b35]" />
                      )}
                      <div className="relative z-10 h-full flex flex-col justify-end p-4 text-white">
                        {hero.badgeVisible !== false && (
                          <span className="inline-flex w-fit items-center gap-1.5 bg-white/15 backdrop-blur px-2.5 py-1 rounded-full text-[9px] font-bold tracking-[0.18em] uppercase mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            {hero.badge || "Darzo Marketplace"}
                          </span>
                        )}
                        <h1 className="font-['Bebas_Neue'] leading-[0.85] tracking-tight uppercase mb-2 line-clamp-2" style={titleStyle("hero", hero.textStyle)}>
                          {hero.title || "The New Standard"}
                        </h1>
                        <p className="font-medium opacity-90 mb-3 text-[11px] line-clamp-2" style={subtitleStyle("hero", hero.textStyle)}>
                          {hero.subtitle || "Bangladesh's curated multi-vendor destination."}
                        </p>
                        {hero.ctaText !== "" && (
                          <span className="w-fit bg-white text-[#6c5ce7] px-4 py-2 rounded-full font-bold text-[9px] tracking-[0.18em] uppercase">
                            {hero.ctaText || "Explore Darzo"} →
                          </span>
                        )}
                      </div>
                    </EditableTile>

                    {/* Flash */}
                    <EditableTile tile={flash}
                      className="col-span-2 row-span-1 rounded-[1.25rem] bg-card border border-border overflow-hidden shadow-md"
                      onEdit={() => setEditing(flash)} onUpload={(f) => handleUpload("flash", f)}
                      onToggleVisible={() => update("flash", { visible: !flash.visible })}
                      onRemoveImage={() => update("flash", { imageUrl: undefined })} uploading={uploadingId === "flash"}>
                      {flash.imageUrl && <img src={flash.imageUrl} alt="" className="absolute inset-0 w-full h-full opacity-30" style={imgStyle(flash)} />}
                      <div className="relative z-10 h-full flex items-center justify-between p-3">
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#e84393] animate-pulse" />
                            <span className="text-[#e84393] font-bold text-[8px] uppercase tracking-[0.18em]">Ends in 03:59:58</span>
                          </div>
                          <h2 className="font-['Bebas_Neue'] text-foreground leading-none" style={titleStyle("flash", flash.textStyle)}>{flash.title || "Flash Deals"}</h2>
                          <p className="text-muted-foreground font-bold uppercase tracking-wider mt-0.5 text-[10px] line-clamp-1" style={subtitleStyle("flash", flash.textStyle)}>{flash.subtitle || "Up to 70% Off"}</p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#ff6b35] to-[#e84393] rounded-xl shadow-md" />
                        </div>
                      </div>
                    </EditableTile>

                    {/* Categories */}
                    {(["cat_tech","cat_lifestyle","cat_home","cat_beauty"] as const).map((id) => {
                      const t = get(id); const meta = CATEGORY_META[id]; const Icon = meta.icon;
                      return (
                        <EditableTile key={id} tile={t}
                          className={`col-span-1 row-span-1 rounded-[1.25rem] ${t.imageUrl ? "" : meta.bg} overflow-hidden shadow-md`}
                          onEdit={() => setEditing(t)} onUpload={(f) => handleUpload(id, f)}
                          onToggleVisible={() => update(id, { visible: !t.visible })}
                          onRemoveImage={() => update(id, { imageUrl: undefined })} uploading={uploadingId === id}>
                          {t.imageUrl && (
                            <>
                              <img src={t.imageUrl} alt="" className="absolute inset-0 w-full h-full" style={imgStyle(t)} />
                              <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${(t.overlay ?? 40)/100})` }} />
                            </>
                          )}
                          <div className="relative z-10 h-full flex flex-col justify-between p-3 text-white">
                            <div className="h-8 w-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                              <Icon className="w-3.5 h-3.5 text-white" />
                            </div>
                            <h3 className="font-['Bebas_Neue'] leading-none tracking-wide" style={titleStyle("category", t.textStyle)}>
                              {t.title}<br /><span style={subtitleStyle("category", t.textStyle)}>{t.subtitle}</span>
                            </h3>
                          </div>
                          {!t.imageUrl && (
                            <div className="absolute -bottom-3 -right-3 opacity-15 pointer-events-none">
                              <Icon className="w-16 h-16 text-white" />
                            </div>
                          )}
                        </EditableTile>
                      );
                    })}

                    {/* For You */}
                    <EditableTile tile={foryou}
                      className="col-span-2 row-span-2 rounded-[1.5rem] bg-card border border-border overflow-hidden shadow-md"
                      onEdit={() => setEditing(foryou)} onUpload={(f) => handleUpload("foryou", f)}
                      onToggleVisible={() => update("foryou", { visible: !foryou.visible })}
                      onRemoveImage={() => update("foryou", { imageUrl: undefined })} uploading={uploadingId === "foryou"}>
                      {renderImg(foryou)}
                      <div className="relative z-10 h-full p-4 flex flex-col">
                        <h3 className="font-['Bebas_Neue'] text-foreground mb-3" style={titleStyle("foryou", foryou.textStyle)}>{foryou.title || "For You"}</h3>
                        <div className="space-y-3 flex-1">
                          {[1,2,3].map((i) => (
                            <div key={i} className="flex items-center gap-3">
                              <div className="w-11 h-11 bg-muted rounded-xl shrink-0" />
                              <div className="flex-1 space-y-1"><div className="h-2.5 bg-muted rounded w-3/4" /><div className="h-2 bg-muted rounded w-1/3" /></div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 w-full border border-border py-2 rounded-xl text-[9px] font-bold text-muted-foreground uppercase tracking-[0.18em] text-center">
                          {foryou.subtitle || "Personalize Feed"}
                        </div>
                      </div>
                    </EditableTile>

                    {/* Trending */}
                    <EditableTile tile={trending}
                      className="col-span-2 row-span-2 rounded-[1.5rem] bg-neutral-200 overflow-hidden shadow-md"
                      onEdit={() => setEditing(trending)} onUpload={(f) => handleUpload("trending", f)}
                      onToggleVisible={() => update("trending", { visible: !trending.visible })}
                      onRemoveImage={() => update("trending", { imageUrl: undefined })} uploading={uploadingId === "trending"}>
                      {trending.imageUrl
                        ? <img src={trending.imageUrl} alt="" className="absolute inset-0 w-full h-full" style={imgStyle(trending)} />
                        : <div className="absolute inset-0 bg-gradient-to-br from-[#ff6b35] via-[#e84393] to-[#6c5ce7]" />}
                      <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(0,0,0,${Math.max((trending.overlay ?? 60)/100, 0.4)}), transparent)` }} />
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <span className="inline-block font-bold bg-[#ff6b35] px-2.5 py-1 rounded-full uppercase tracking-wider text-[9px]" style={subtitleStyle("trending", trending.textStyle)}>
                          {trending.subtitle || "Trending"}
                        </span>
                        <h3 className="font-['Bebas_Neue'] mt-2 leading-none tracking-wider line-clamp-2" style={titleStyle("trending", trending.textStyle)}>
                          {trending.title || "Capture Purity"}
                        </h3>
                      </div>
                    </EditableTile>

                    {/* Vendors */}
                    <EditableTile tile={vendors}
                      className="col-span-2 row-span-1 rounded-[1.25rem] bg-gradient-to-br from-[#0f0f1a] via-[#1a1830] to-[#2a1533] border border-white/10 overflow-hidden"
                      onEdit={() => setEditing(vendors)} onUpload={(f) => handleUpload("vendors", f)}
                      onToggleVisible={() => update("vendors", { visible: !vendors.visible })}
                      onRemoveImage={() => update("vendors", { imageUrl: undefined })} uploading={uploadingId === "vendors"}>
                      {vendors.imageUrl && <img src={vendors.imageUrl} alt="" className="absolute inset-0 w-full h-full opacity-40" style={imgStyle(vendors)} />}
                      <div className="relative z-10 h-full p-3.5 flex flex-row items-center gap-3 justify-between">
                        <div className="flex flex-col text-left min-w-0 flex-1">
                          <h4 className="font-['Bebas_Neue'] text-white leading-none mb-1 line-clamp-1" style={titleStyle("vendors", vendors.textStyle)}>
                            {vendors.title || "Multi-Vendor Power"}
                          </h4>
                          <p className="text-white/70 font-medium text-[10px] line-clamp-2" style={subtitleStyle("vendors", vendors.textStyle)}>
                            {vendors.subtitle || "Supporting 1,200+ local artisans."}
                          </p>
                        </div>
                        <div className="flex -space-x-2 shrink-0">
                          <div className="w-9 h-9 rounded-full border-2 border-[#1a1830] bg-white flex items-center justify-center font-bold text-[#6c5ce7] italic text-sm">D</div>
                          <div className="w-9 h-9 rounded-full border-2 border-[#1a1830] bg-[#6c5ce7] flex items-center justify-center font-bold text-white text-sm">Z</div>
                          <div className="w-9 h-9 rounded-full border-2 border-[#1a1830] bg-[#e84393] flex items-center justify-center font-bold text-white italic text-sm">A</div>
                        </div>
                      </div>
                    </EditableTile>

                  </div>

                  {/* Custom sections inside phone preview */}
                  {sections.filter((s) => s.visible).length > 0 && (
                    <div className="mt-3 space-y-2.5">
                      {sections.filter((s) => s.visible).map((s) => (
                        <div key={s.id} className="relative rounded-2xl overflow-hidden shadow-md" style={{ height: 140 }}>
                          {s.imageUrl
                            ? <img src={s.imageUrl} alt="" className="absolute inset-0 w-full h-full" style={imgStyle(s)} />
                            : <div className="absolute inset-0" style={{ background: s.bgColor || "linear-gradient(135deg,#6c5ce7,#e84393)" }} />}
                          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${(s.overlay ?? 40) / 100})` }} />
                          <div className="relative z-10 h-full flex items-center p-4 text-white">
                            <div>
                              <h3 className="font-['Bebas_Neue'] leading-none" style={titleStyle("section", s.textStyle)}>{s.title}</h3>
                              <p className="opacity-90 mt-1 text-xs line-clamp-2" style={subtitleStyle("section", s.textStyle)}>{s.subtitle}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {dirty && (
              <p className="text-[11px] text-amber-400 font-medium">Unsaved changes — click "Save Changes" to publish.</p>
            )}
          </div>
        )}



        {/* Custom sections */}
        <div className="bg-card border rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Custom Banner Sections</h2>
              <p className="text-xs text-muted-foreground">Add unlimited extra banners that appear below the bento grid on the home page.</p>
            </div>
            <Button size="sm" onClick={addSection}><Plus className="h-4 w-4 mr-1.5" /> Add Section</Button>
          </div>

          {sections.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No custom sections yet. Click "Add Section" to create one.</p>}

          <div className="space-y-4">
            {sections.map((s) => (
              <div key={s.id} className={`relative group rounded-2xl overflow-hidden border shadow-sm ${s.visible ? "" : "opacity-40 grayscale"}`} style={{ height: 160 }}>
                {s.imageUrl
                  ? <img src={s.imageUrl} alt="" className="absolute inset-0 w-full h-full" style={imgStyle(s)} />
                  : <div className="absolute inset-0" style={{ background: s.bgColor || "linear-gradient(135deg,#6c5ce7,#e84393)" }} />}
                <div className="absolute inset-0 pointer-events-none" style={{ background: `rgba(0,0,0,${(s.overlay ?? 40) / 100})` }} />
                <div className="relative z-10 h-full flex items-center p-6 text-white">
                  <div className="max-w-md">
                    <h3 className="font-['Bebas_Neue'] leading-none" style={titleStyle("section", s.textStyle)}>{s.title}</h3>
                    <p className="opacity-90 mt-1 line-clamp-2" style={subtitleStyle("section", s.textStyle)}>{s.subtitle}</p>
                  </div>
                </div>
                <div className="absolute top-2 right-2 z-20 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="secondary" className="h-8" onClick={() => setEditingSection(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="secondary" className="h-8" onClick={() => updateSection(s.id, { visible: !s.visible })}>{s.visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button>
                  <Button size="sm" variant="destructive" className="h-8" onClick={() => removeSection(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
          <ImagePlus className="h-3.5 w-3.5" /> Any image size works — use Edit → Image Adjust to crop, focus, zoom, or overlay.
        </p>
      </div>

      {/* Edit tile dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit — {editing?.label}</DialogTitle></DialogHeader>
          {editing && (
            <Tabs defaultValue="text" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="text"><Pencil className="h-3.5 w-3.5 mr-1.5" />Content</TabsTrigger>
                <TabsTrigger value="style"><Type className="h-3.5 w-3.5 mr-1.5" />Text Style</TabsTrigger>
                <TabsTrigger value="image"><Maximize2 className="h-3.5 w-3.5 mr-1.5" />Image</TabsTrigger>
              </TabsList>
              <TabsContent value="text" className="space-y-3 mt-4">
                {editing.id === "hero" && (
                  <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Top badge / tag</Label>
                      <Button type="button" size="sm" variant={editing.badgeVisible === false ? "outline" : "default"}
                        className="h-7 text-[11px]"
                        onClick={() => setEditing({ ...editing, badgeVisible: editing.badgeVisible === false })}>
                        {editing.badgeVisible === false ? <><EyeOff className="h-3 w-3 mr-1" />Hidden</> : <><Eye className="h-3 w-3 mr-1" />Visible</>}
                      </Button>
                    </div>
                    <Input value={editing.badge ?? ""} onChange={(e) => setEditing({ ...editing, badge: e.target.value })} placeholder="e.g. Darzo Marketplace" />
                    <div className="space-y-1">
                      <Label className="text-xs">CTA button text (empty to hide)</Label>
                      <Input value={editing.ctaText ?? ""} onChange={(e) => setEditing({ ...editing, ctaText: e.target.value })} placeholder="Explore Darzo" />
                    </div>
                  </div>
                )}
                <div className="space-y-1"><Label className="text-xs">Title</Label>
                  <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Leave blank for default" /></div>
                <div className="space-y-1"><Label className="text-xs">Subtitle</Label>
                  <Textarea value={editing.subtitle ?? ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} rows={2} /></div>
                <div className="space-y-1"><Label className="text-xs">Link URL</Label>
                  <Input value={editing.link ?? ""} onChange={(e) => setEditing({ ...editing, link: e.target.value })} placeholder="/products or https://..." /></div>
              </TabsContent>

              <TabsContent value="style" className="mt-4">
                <TextStyleEditor value={editing.textStyle} onChange={(ts) => setEditing({ ...editing, textStyle: ts })} />
              </TabsContent>
              <TabsContent value="image" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1"><Maximize2 className="h-3 w-3" /> Fit mode</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["cover","contain","fill"] as FitMode[]).map((m) => (
                      <Button key={m} type="button" size="sm" variant={editing.objectFit === m ? "default" : "outline"} onClick={() => setEditing({ ...editing, objectFit: m })} className="capitalize">{m}</Button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Cover = fill & crop · Contain = fit whole image · Fill = stretch</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1"><Move className="h-3 w-3" /> Focal point — click on preview</Label>
                  <FocalPicker imageUrl={editing.imageUrl} x={editing.focalX ?? 50} y={editing.focalY ?? 50}
                    onChange={(x, y) => setEditing({ ...editing, focalX: x, focalY: y })} />
                  <div className="flex gap-2 text-[10px]"><span>X: {editing.focalX ?? 50}%</span><span>Y: {editing.focalY ?? 50}%</span></div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Zoom ({editing.zoom ?? 100}%)</Label>
                  <Slider value={[editing.zoom ?? 100]} min={100} max={200} step={5} onValueChange={([v]) => setEditing({ ...editing, zoom: v })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Dark overlay ({editing.overlay ?? 0}%) — improves text readability</Label>
                  <Slider value={[editing.overlay ?? 0]} min={0} max={90} step={5} onValueChange={([v]) => setEditing({ ...editing, overlay: v })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1"><Palette className="h-3 w-3" /> Background color (for contain mode)</Label>
                  <Input type="color" value={editing.bgColor ?? "#000000"} onChange={(e) => setEditing({ ...editing, bgColor: e.target.value })} className="h-9 w-full" />
                </div>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => { if (editing) update(editing.id, editing); setEditing(null); }}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit section dialog */}
      <Dialog open={!!editingSection} onOpenChange={(o) => !o && setEditingSection(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Section</DialogTitle></DialogHeader>
          {editingSection && (
            <div className="space-y-3">
              <div className="space-y-1"><Label className="text-xs">Title</Label>
                <Input value={editingSection.title} onChange={(e) => setEditingSection({ ...editingSection, title: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Subtitle</Label>
                <Textarea rows={2} value={editingSection.subtitle ?? ""} onChange={(e) => setEditingSection({ ...editingSection, subtitle: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Link URL</Label>
                <Input value={editingSection.link ?? ""} onChange={(e) => setEditingSection({ ...editingSection, link: e.target.value })} placeholder="/products" /></div>
              <div className="space-y-1">
                <Label className="text-xs">Banner image</Label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer">
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSectionImage(editingSection.id, f); e.target.value = ""; }} />
                    <div className="border rounded-lg px-3 py-2 text-xs hover:bg-muted flex items-center justify-center gap-2"><Upload className="h-3.5 w-3.5" /> Upload image</div>
                  </label>
                  {editingSection.imageUrl && <Button size="sm" variant="ghost" onClick={() => updateSection(editingSection.id, { imageUrl: undefined })}><Trash2 className="h-3.5 w-3.5" /></Button>}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Focal point</Label>
                <FocalPicker imageUrl={editingSection.imageUrl} x={editingSection.focalX ?? 50} y={editingSection.focalY ?? 50}
                  onChange={(x, y) => { setEditingSection({ ...editingSection, focalX: x, focalY: y }); updateSection(editingSection.id, { focalX: x, focalY: y }); }} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Dark overlay ({editingSection.overlay ?? 40}%)</Label>
                <Slider value={[editingSection.overlay ?? 40]} min={0} max={90} step={5}
                  onValueChange={([v]) => setEditingSection({ ...editingSection, overlay: v })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Background color (no image)</Label>
                <Input type="color" value={editingSection.bgColor ?? "#6c5ce7"} onChange={(e) => setEditingSection({ ...editingSection, bgColor: e.target.value })} className="h-9 w-full" />
              </div>
              <div className="pt-3 border-t">
                <Label className="text-xs flex items-center gap-1 mb-3"><Type className="h-3 w-3" /> Text Style & Templates</Label>
                <TextStyleEditor value={editingSection.textStyle} onChange={(ts) => setEditingSection({ ...editingSection, textStyle: ts })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
            <Button onClick={() => { if (editingSection) { updateSection(editingSection.id, editingSection); setEditingSection(null); } }}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
