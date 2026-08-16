import { db } from "@/integrations/firebase/client";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export interface CommissionSettings {
  globalRate: number; // e.g. 10%
  categoryRates: Record<string, number>; // categoryId -> rate
  brandRates: Record<string, number>;    // brandId -> rate
  sellerRates: Record<string, number>;   // sellerId -> rate
  campaignRates: Record<string, number>; // campaignId -> rate
  updatedAt?: any;
}

export class AdminCommissionService {
  private static DOC_PATH = "system_settings/commissions";

  public static async getCommissionSettings(): Promise<CommissionSettings> {
    try {
      const snap = await getDoc(doc(db, this.DOC_PATH));
      if (snap.exists()) {
        return snap.data() as CommissionSettings;
      }
    } catch (error) {
      console.error("Failed to load commission settings:", error);
    }

    return {
      globalRate: 10,
      categoryRates: {},
      brandRates: {},
      sellerRates: {},
      campaignRates: {}
    };
  }

  public static async saveCommissionSettings(settings: CommissionSettings): Promise<void> {
    await setDoc(doc(db, this.DOC_PATH), {
      ...settings,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  /**
   * Calculate effective commission rate for a specific product order line
   */
  public static calculateEffectiveCommission(
    settings: CommissionSettings,
    params: { categoryId?: string; brandId?: string; sellerId?: string; campaignId?: string }
  ): number {
    if (params.sellerId && settings.sellerRates[params.sellerId] !== undefined) {
      return settings.sellerRates[params.sellerId];
    }
    if (params.campaignId && settings.campaignRates[params.campaignId] !== undefined) {
      return settings.campaignRates[params.campaignId];
    }
    if (params.categoryId && settings.categoryRates[params.categoryId] !== undefined) {
      return settings.categoryRates[params.categoryId];
    }
    if (params.brandId && settings.brandRates[params.brandId] !== undefined) {
      return settings.brandRates[params.brandId];
    }
    return settings.globalRate;
  }
}
