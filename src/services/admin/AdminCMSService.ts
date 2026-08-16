import { db } from "@/integrations/firebase/client";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export interface CMSSection {
  id: string;
  type: "HERO_SLIDER" | "CATEGORY_RAIL" | "FLASH_SALE_GRID" | "PROMO_BANNER" | "TRENDING_PRODUCTS" | "CUSTOM_HTML";
  title: string;
  subtitle?: string;
  order: number;
  isVisible: boolean;
  config: Record<string, any>;
}

export interface CMSLayoutConfig {
  sections: CMSSection[];
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    borderRadius: string;
  };
  updatedAt?: any;
}

export class AdminCMSService {
  private static DOC_PATH = "cms_layouts/homepage";

  public static async getHomepageLayout(): Promise<CMSLayoutConfig> {
    try {
      const snap = await getDoc(doc(db, this.DOC_PATH));
      if (snap.exists()) {
        return snap.data() as CMSLayoutConfig;
      }
    } catch (error) {
      console.error("Failed to load CMS layout:", error);
    }

    return {
      sections: [
        { id: "hero-1", type: "HERO_SLIDER", title: "Hero Banners", order: 1, isVisible: true, config: {} },
        { id: "cat-1", type: "CATEGORY_RAIL", title: "Featured Categories", order: 2, isVisible: true, config: {} },
        { id: "flash-1", type: "FLASH_SALE_GRID", title: "Flash Deals", order: 3, isVisible: true, config: {} },
        { id: "prod-1", type: "TRENDING_PRODUCTS", title: "Trending Items", order: 4, isVisible: true, config: {} }
      ],
      theme: {
        primaryColor: "#f97316",
        secondaryColor: "#0f172a",
        fontFamily: "Inter",
        borderRadius: "0.75rem"
      }
    };
  }

  public static async saveHomepageLayout(layout: CMSLayoutConfig): Promise<void> {
    await setDoc(doc(db, this.DOC_PATH), {
      ...layout,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
}
