import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/firebaseAdapter";

export interface ResponsiveGrid {
  mobile: number;
  tablet: number;
  desktop: number;
}

export interface SectionStyle {
  padding?: string;
  margin?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: string;
  shadow?: string;
}

export interface SectionSchedule {
  startTime?: string;
  endTime?: string;
}

export interface SectionContent {
  maxItems?: number;
  sortBy?: "latest" | "popular" | "random" | "default";
  title?: string;
  subtitle?: string;
  text?: string;
  html?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonLink?: string;
  heading?: string;
  description?: string;
  videoUrl?: string;
}

export interface SectionConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
  gridCols?: number;
  responsiveGrid?: ResponsiveGrid;
  style?: SectionStyle;
  schedule?: SectionSchedule;
  content?: SectionContent;
  spacing?: string;
  customSectionId?: string; // links to custom_sections table
}

export const defaultSections: SectionConfig[] = [
  { id: "hero_banner", label: "Hero Banner", visible: true, order: 0 },
  { id: "recently_viewed", label: "Recently Viewed", visible: true, order: 1 },
  { id: "latest_products", label: "Just Added", visible: true, order: 2, gridCols: 6, responsiveGrid: { mobile: 2, tablet: 3, desktop: 6 } },
  { id: "flash_sale", label: "Flash Sale", visible: true, order: 3 },
  { id: "featured", label: "Best Deals", visible: true, order: 4, gridCols: 6, responsiveGrid: { mobile: 2, tablet: 3, desktop: 6 } },
  { id: "cj_trending", label: "CJ Trending", visible: true, order: 5, gridCols: 6, responsiveGrid: { mobile: 2, tablet: 3, desktop: 6 } },
  { id: "trending", label: "Trending", visible: true, order: 6, gridCols: 6, responsiveGrid: { mobile: 2, tablet: 3, desktop: 6 } },
  { id: "new_arrivals", label: "New Arrivals", visible: true, order: 7, gridCols: 6, responsiveGrid: { mobile: 2, tablet: 3, desktop: 6 } },
  { id: "recommended", label: "For You", visible: true, order: 8, gridCols: 6, responsiveGrid: { mobile: 2, tablet: 3, desktop: 6 } },
  { id: "promo_banners", label: "Promo Banners", visible: true, order: 9 },
];

function isSectionScheduled(schedule?: SectionSchedule): boolean {
  if (!schedule) return true;
  const now = new Date();
  if (schedule.startTime && new Date(schedule.startTime) > now) return false;
  if (schedule.endTime && new Date(schedule.endTime) < now) return false;
  return true;
}

export function useLayoutConfig() {
  return useQuery({
    queryKey: ["layout-config", "homepage"],
    queryFn: async (): Promise<SectionConfig[]> => {
      const { data, error } = await supabase
        .from("layout_config")
        .select("sections")
        .eq("page", "homepage")
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch layout config:", error);
        return defaultSections;
      }

      if (!data?.sections || !Array.isArray(data.sections) || data.sections.length === 0) {
        return defaultSections;
      }

      return (data.sections as unknown as SectionConfig[])
        .filter(s => isSectionScheduled(s.schedule))
        .sort((a, b) => a.order - b.order);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCustomSections() {
  return useQuery({
    queryKey: ["custom-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_sections")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
