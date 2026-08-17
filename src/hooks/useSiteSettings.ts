import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/firebaseAdapter";

export interface SiteSettings {
  // Store Info
  storeName: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: string;
  currency: string;
  // SEO
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  // Facebook & Meta
  facebookPixelId: string;
  facebookConversionsApiToken: string;
  // Google
  googleAnalyticsId: string;
  googleTagManagerId: string;
  googleAdsConversionId: string;
  googleAdsConversionLabel: string;
  // TikTok
  tiktokPixelId: string;
  // Snapchat
  snapchatPixelId: string;
  // Pinterest
  pinterestTagId: string;
  // Twitter/X
  twitterPixelId: string;
  // Microsoft/Bing
  microsoftAdsTagId: string;
  // Content
  headerBanner: string;
  announcementText: string;
  showAnnouncement: boolean;
}

const defaultSettings: SiteSettings = {
  storeName: "MegaMart",
  storeEmail: "support@megamart.com",
  storePhone: "+1 (555) 123-4567",
  storeAddress: "123 Commerce Street, New York, NY 10001",
  currency: "USD",
  metaTitle: "MegaMart - Shop Millions of Products at Best Prices",
  metaDescription: "Discover amazing deals on electronics, fashion, home goods and more. Free shipping on orders over $35.",
  ogImage: "",
  facebookPixelId: "",
  facebookConversionsApiToken: "",
  googleAnalyticsId: "",
  googleTagManagerId: "",
  googleAdsConversionId: "",
  googleAdsConversionLabel: "",
  tiktokPixelId: "",
  snapchatPixelId: "",
  pinterestTagId: "",
  twitterPixelId: "",
  microsoftAdsTagId: "",
  headerBanner: "",
  announcementText: "",
  showAnnouncement: false,
};

async function fetchSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value");

  if (error) {
    console.error("Error fetching settings:", error);
    return defaultSettings;
  }

  const settings = { ...defaultSettings };
  
  if (data) {
    data.forEach((item) => {
      if (item.key in settings && item.value !== null) {
        (settings as any)[item.key] = item.value;
      }
    });
  }

  return settings;
}

async function saveSiteSettings(settings: Partial<SiteSettings>) {
  const updates = Object.entries(settings).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }));

  for (const update of updates) {
    const { error } = await supabase
      .from("site_settings")
      .upsert(update, { onConflict: "key" });
    
    if (error) {
      console.error(`Error saving ${update.key}:`, error);
      throw error;
    }
  }

  return settings;
}

export function useSiteSettings() {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ["site-settings"],
    queryFn: fetchSiteSettings,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const saveSettings = async (category: string, data: Record<string, any>): Promise<boolean> => {
    try {
      // For marketing settings, map to individual keys
      if (category === "marketing") {
      const updates = [
          { key: "facebookPixelId", value: data.facebookPixelId || "" },
          { key: "facebookConversionsApiToken", value: data.facebookConversionsApiToken || "" },
          { key: "googleAnalyticsId", value: data.googleAnalyticsId || "" },
          { key: "googleTagManagerId", value: data.googleTagManagerId || "" },
          { key: "googleAdsConversionId", value: data.googleAdsConversionId || "" },
          { key: "googleAdsConversionLabel", value: data.googleAdsConversionLabel || "" },
          { key: "tiktokPixelId", value: data.tiktokPixelId || "" },
          { key: "snapchatPixelId", value: data.snapchatPixelId || "" },
          { key: "pinterestTagId", value: data.pinterestTagId || "" },
          { key: "twitterPixelId", value: data.twitterPixelId || "" },
          { key: "microsoftAdsTagId", value: data.microsoftAdsTagId || "" },
          { key: "metaTitle", value: data.defaultMetaTitle || "" },
          { key: "metaDescription", value: data.defaultMetaDescription || "" },
          { key: "ogImage", value: data.ogImage || "" },
        ];
        
        for (const update of updates) {
          await supabase
            .from("site_settings")
            .upsert({ ...update, updated_at: new Date().toISOString() }, { onConflict: "key" });
        }
      } else if (category === "store") {
        const updates = [
          { key: "storeName", value: data.storeName || "" },
          { key: "storeEmail", value: data.storeEmail || "" },
          { key: "storePhone", value: data.storePhone || "" },
          { key: "storeAddress", value: data.storeAddress || "" },
          { key: "currency", value: data.currency || "" },
        ];
        
        for (const update of updates) {
          await supabase
            .from("site_settings")
            .upsert({ ...update, updated_at: new Date().toISOString() }, { onConflict: "key" });
        }
      } else if (category === "notifications") {
        await supabase
          .from("site_settings")
          .upsert({ key: "notifications", value: data, updated_at: new Date().toISOString() }, { onConflict: "key" });
      }
      
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      return true;
    } catch (error) {
      console.error("Error saving settings:", error);
      return false;
    }
  };

  const settings = useMemo(() => {
    if (!query.data) return null;
    return {
      store: {
        storeName: query.data.storeName,
        storeEmail: query.data.storeEmail,
        storePhone: query.data.storePhone,
        storeAddress: query.data.storeAddress,
        currency: query.data.currency,
      },
      marketing: {
        facebookPixelId: query.data.facebookPixelId,
        facebookConversionsApiToken: query.data.facebookConversionsApiToken,
        googleAnalyticsId: query.data.googleAnalyticsId,
        googleTagManagerId: query.data.googleTagManagerId,
        googleAdsConversionId: query.data.googleAdsConversionId,
        googleAdsConversionLabel: query.data.googleAdsConversionLabel,
        tiktokPixelId: query.data.tiktokPixelId,
        snapchatPixelId: query.data.snapchatPixelId,
        pinterestTagId: query.data.pinterestTagId,
        twitterPixelId: query.data.twitterPixelId,
        microsoftAdsTagId: query.data.microsoftAdsTagId,
        defaultMetaTitle: query.data.metaTitle,
        defaultMetaDescription: query.data.metaDescription,
        ogImage: query.data.ogImage,
      },
      notifications: null,
    };
  }, [query.data]);

  return {
    settings,
    loading: query.isLoading,
    saveSettings,
    rawSettings: query.data,
  };
}

export function useSaveSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveSiteSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    },
  });
}
