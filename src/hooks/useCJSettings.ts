import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/firebaseAdapter";

export interface CJSettings {
  id: string;
  is_enabled: boolean;
  default_margin_type: 'percentage' | 'fixed';
  default_margin_value: number;
  usd_to_bdt_rate: number;
  show_in_search: boolean;
  show_in_categories: boolean;
  show_on_homepage: boolean;
}

export interface CJCategoryMapping {
  id: string;
  cj_category_name: string;
  local_category_id: string | null;
  is_enabled: boolean;
  custom_margin_type: 'percentage' | 'fixed' | null;
  custom_margin_value: number | null;
}

async function fetchCJSettings(): Promise<CJSettings | null> {
  const { data, error } = await supabase
    .from("cj_settings")
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Error fetching CJ settings:", error);
    return null;
  }

  return data as CJSettings | null;
}

async function fetchCJCategoryMappings(): Promise<CJCategoryMapping[]> {
  const { data, error } = await supabase
    .from("cj_category_mappings")
    .select("*")
    .eq("is_enabled", true);

  if (error) {
    console.error("Error fetching CJ category mappings:", error);
    return [];
  }

  return data as CJCategoryMapping[];
}

export function useCJSettings() {
  return useQuery({
    queryKey: ["cj-settings"],
    queryFn: fetchCJSettings,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCJCategoryMappings() {
  return useQuery({
    queryKey: ["cj-category-mappings"],
    queryFn: fetchCJCategoryMappings,
    staleTime: 5 * 60 * 1000,
  });
}

// Helper to calculate BDT price with margin
export function calculateCJPrice(
  usdPrice: number,
  settings: CJSettings | null | undefined
): number {
  if (!settings) {
    // Default fallback (30% margin)
    const bdtPrice = usdPrice * 120;
    return Math.round(bdtPrice * 1.30);
  }

  const bdtPrice = usdPrice * settings.usd_to_bdt_rate;
  
  if (settings.default_margin_type === 'percentage') {
    return Math.round(bdtPrice * (1 + settings.default_margin_value / 100));
  } else {
    return Math.round(bdtPrice + settings.default_margin_value);
  }
}

// Map CJ category to local category
export function mapCJCategory(
  cjCategoryName: string,
  mappings: CJCategoryMapping[],
  localCategories: { id: string; name: string; slug: string }[]
): { id: string; name: string; slug: string } | null {
  // First check explicit mappings
  const mapping = mappings.find(
    m => m.cj_category_name.toLowerCase() === cjCategoryName.toLowerCase()
  );
  
  if (mapping?.local_category_id) {
    return localCategories.find(c => c.id === mapping.local_category_id) || null;
  }

  // Auto-map by name similarity
  const normalizedCJ = cjCategoryName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  for (const category of localCategories) {
    const normalizedLocal = category.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalizedLocal.includes(normalizedCJ) || normalizedCJ.includes(normalizedLocal)) {
      return category;
    }
  }

  // Common mappings
  const commonMappings: Record<string, string[]> = {
    'electronics': ['phone', 'computer', 'laptop', 'tablet', 'gadget', 'tech', 'electronic'],
    'fashion': ['clothing', 'clothes', 'apparel', 'dress', 'shirt', 'pants', 'fashion'],
    'beauty': ['cosmetic', 'makeup', 'skincare', 'beauty', 'personal care'],
    'home-garden': ['home', 'kitchen', 'furniture', 'garden', 'decor', 'household'],
    'sports': ['sport', 'fitness', 'outdoor', 'exercise', 'gym'],
    'toys': ['toy', 'game', 'kid', 'children', 'baby'],
    'jewelry': ['jewelry', 'jewellery', 'accessory', 'watch', 'ring', 'necklace'],
    'automotive': ['car', 'auto', 'vehicle', 'motor', 'bike'],
  };

  for (const [categorySlug, keywords] of Object.entries(commonMappings)) {
    if (keywords.some(kw => normalizedCJ.includes(kw))) {
      const found = localCategories.find(c => c.slug === categorySlug);
      if (found) return found;
    }
  }

  return null;
}
