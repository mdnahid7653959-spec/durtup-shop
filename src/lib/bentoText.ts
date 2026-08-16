// Shared text-style utilities for the Bento editor + storefront.

export interface TextStyle {
  fontFamily?: string;
  titleScale?: number;      // 50-250 (%)
  subtitleScale?: number;   // 50-250 (%)
  titleColor?: string;
  subtitleColor?: string;
  titleWeight?: number;     // 300-900
  letterSpacing?: number;   // em * 100 (e.g. 5 => 0.05em)
  align?: "left" | "center" | "right";
  uppercase?: boolean;
  italic?: boolean;
}

export type TileKind =
  | "hero" | "flash" | "category" | "foryou" | "trending" | "vendors" | "section";

// Base font-sizes (clamp for responsiveness) per tile role.
const BASE: Record<TileKind, { title: string; subtitle: string }> = {
  hero:     { title: "clamp(2.5rem, 7vw, 6rem)",       subtitle: "clamp(0.875rem, 1.4vw, 1.25rem)" },
  flash:    { title: "clamp(1.875rem, 3.5vw, 2.5rem)", subtitle: "clamp(0.625rem, 0.9vw, 0.75rem)" },
  category: { title: "clamp(1.25rem, 2vw, 1.75rem)",   subtitle: "clamp(0.75rem, 1vw, 0.9rem)" },
  foryou:   { title: "clamp(1.5rem, 2.5vw, 2rem)",     subtitle: "clamp(0.625rem, 0.8vw, 0.75rem)" },
  trending: { title: "clamp(1.5rem, 2.5vw, 2rem)",     subtitle: "clamp(0.6rem, 0.8vw, 0.75rem)" },
  vendors:  { title: "clamp(1.25rem, 2vw, 1.5rem)",    subtitle: "clamp(0.75rem, 1vw, 0.9rem)" },
  section:  { title: "clamp(1.875rem, 4vw, 3rem)",     subtitle: "clamp(0.875rem, 1.2vw, 1rem)" },
};

export function titleStyle(kind: TileKind, ts?: TextStyle, defaultColor?: string): React.CSSProperties {
  const b = BASE[kind].title;
  const scale = (ts?.titleScale ?? 100) / 100;
  return {
    fontFamily: ts?.fontFamily,
    fontSize: `calc(${b} * ${scale})`,
    color: ts?.titleColor || defaultColor,
    fontWeight: ts?.titleWeight,
    letterSpacing: ts?.letterSpacing != null ? `${ts.letterSpacing / 100}em` : undefined,
    textAlign: ts?.align,
    textTransform: ts?.uppercase === false ? "none" : ts?.uppercase ? "uppercase" : undefined,
    fontStyle: ts?.italic ? "italic" : undefined,
  };
}

export function subtitleStyle(kind: TileKind, ts?: TextStyle, defaultColor?: string): React.CSSProperties {
  const b = BASE[kind].subtitle;
  const scale = (ts?.subtitleScale ?? 100) / 100;
  return {
    fontFamily: ts?.fontFamily,
    fontSize: `calc(${b} * ${scale})`,
    color: ts?.subtitleColor || defaultColor,
    letterSpacing: ts?.letterSpacing != null ? `${ts.letterSpacing / 100}em` : undefined,
    textAlign: ts?.align,
    fontStyle: ts?.italic ? "italic" : undefined,
  };
}

// Curated templates.
export const TEXT_TEMPLATES: { id: string; name: string; desc: string; style: TextStyle }[] = [
  { id: "default",   name: "Default",         desc: "Original bold display",
    style: {} },
  { id: "editorial", name: "Bold Editorial",  desc: "Bebas Neue · tight · uppercase",
    style: { fontFamily: "'Bebas Neue', sans-serif", titleScale: 110, letterSpacing: -1, uppercase: true, titleWeight: 700 } },
  { id: "elegant",   name: "Elegant Serif",   desc: "Playfair · airy tracking",
    style: { fontFamily: "'Playfair Display', serif", titleScale: 95, letterSpacing: 2, uppercase: false, titleWeight: 600, italic: false } },
  { id: "minimal",   name: "Minimal Sans",    desc: "Barlow · light · sentence case",
    style: { fontFamily: "'Barlow', sans-serif", titleScale: 85, letterSpacing: 0, uppercase: false, titleWeight: 500 } },
  { id: "impact",    name: "Impact Poster",   desc: "Impact · wide tracking",
    style: { fontFamily: "Impact, 'Barlow Condensed', sans-serif", titleScale: 120, letterSpacing: 4, uppercase: true, titleWeight: 900 } },
  { id: "mono",      name: "Mono Techno",     desc: "Monospace · rigid",
    style: { fontFamily: "'JetBrains Mono', monospace", titleScale: 80, letterSpacing: 2, uppercase: true, titleWeight: 700 } },
  { id: "handwritten", name: "Handwritten",   desc: "Playful · italic",
    style: { fontFamily: "'Caveat', 'Comic Sans MS', cursive", titleScale: 130, letterSpacing: 0, uppercase: false, titleWeight: 700, italic: true } },
  { id: "luxury",    name: "Luxury Gold",     desc: "Serif · gold · centered",
    style: { fontFamily: "'Cormorant Garamond', serif", titleScale: 110, letterSpacing: 6, uppercase: true, titleWeight: 500, titleColor: "#d4af37", align: "center" } },
];

export const FONT_OPTIONS = [
  { label: "Bebas Neue", value: "'Bebas Neue', sans-serif" },
  { label: "Barlow", value: "'Barlow', sans-serif" },
  { label: "Playfair Display", value: "'Playfair Display', serif" },
  { label: "Cormorant", value: "'Cormorant Garamond', serif" },
  { label: "Impact", value: "Impact, 'Barlow Condensed', sans-serif" },
  { label: "JetBrains Mono", value: "'JetBrains Mono', monospace" },
  { label: "Caveat (handwritten)", value: "'Caveat', cursive" },
  { label: "Inter", value: "'Inter', sans-serif" },
];
