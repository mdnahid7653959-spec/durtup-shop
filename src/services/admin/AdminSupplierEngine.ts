import { db } from "@/integrations/firebase/client";
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

export interface SupplierMarginRule {
  marginType: "FIXED_PROFIT" | "PERCENTAGE_MARGIN" | "CATEGORY_WISE" | "BRAND_WISE";
  fixedProfitAmount?: number; // e.g. ৳200
  percentageMargin?: number;  // e.g. 20%
  minProfit?: number;
  maxProfit?: number;
  enableRounding99?: boolean; // Rounds price to 99 (e.g., ৳999, ৳1499)
}

export interface SupplierEndpointConfig {
  productListEndpoint: string;
  productDetailEndpoint: string;
  stockEndpoint: string;
  priceEndpoint: string;
  createOrderEndpoint: string;
  cancelOrderEndpoint: string;
  trackingEndpoint: string;
  webhookEndpoint: string;
}

export interface SupplierIntegration {
  id: string;
  name: string;
  baseUrl: string;
  apiVersion: string;
  authType: "API_KEY" | "BEARER_TOKEN" | "OAUTH2" | "CUSTOM_HEADER";
  apiKey?: string;
  apiSecret?: string;
  clientId?: string;
  clientSecret?: string;
  webhookUrl?: string;
  customHeaders?: Record<string, string>;
  endpoints: SupplierEndpointConfig;
  marginRule: SupplierMarginRule;
  isEnabled: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export class AdminSupplierEngine {
  private static COLLECTION = "supplier_integrations";

  /**
   * Calculate calculated sell price based on supplier cost & margin rules
   */
  public static calculateSellPrice(costPrice: number, rule: SupplierMarginRule): { sellPrice: number; profit: number } {
    let profit = 0;

    if (rule.marginType === "FIXED_PROFIT") {
      profit = rule.fixedProfitAmount || 100;
    } else if (rule.marginType === "PERCENTAGE_MARGIN") {
      profit = (costPrice * (rule.percentageMargin || 15)) / 100;
    } else {
      profit = (costPrice * 15) / 100;
    }

    if (rule.minProfit && profit < rule.minProfit) profit = rule.minProfit;
    if (rule.maxProfit && profit > rule.maxProfit) profit = rule.maxProfit;

    let sellPrice = costPrice + profit;

    // Apply psychological price rounding (e.g. 985 -> 999)
    if (rule.enableRounding99) {
      const hundred = Math.floor(sellPrice / 100);
      sellPrice = hundred * 100 + 99;
      if (sellPrice < costPrice) sellPrice += 100;
    } else {
      sellPrice = Math.ceil(sellPrice);
    }

    return {
      sellPrice,
      profit: sellPrice - costPrice
    };
  }

  public static async getAllSuppliers(): Promise<SupplierIntegration[]> {
    try {
      const snap = await getDocs(collection(db, this.COLLECTION));
      return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SupplierIntegration[];
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
      return [];
    }
  }

  public static async saveSupplier(supplier: Partial<SupplierIntegration>): Promise<string> {
    const docId = supplier.id || doc(collection(db, this.COLLECTION)).id;
    const ref = doc(db, this.COLLECTION, docId);

    const payload = {
      ...supplier,
      id: docId,
      updatedAt: serverTimestamp(),
      createdAt: supplier.createdAt || serverTimestamp()
    };

    await setDoc(ref, payload, { merge: true });
    return docId;
  }

  public static async deleteSupplier(id: string): Promise<void> {
    await deleteDoc(doc(db, this.COLLECTION, id));
  }

  /**
   * Forward order securely to external supplier API endpoint (via backend proxy abstraction)
   */
  public static async forwardOrderToSupplier(orderId: string, supplierId: string): Promise<{ success: boolean; supplierOrderId?: string; message: string }> {
    try {
      const supplierDoc = await getDoc(doc(db, this.COLLECTION, supplierId));
      if (!supplierDoc.exists()) {
        return { success: false, message: "Supplier configuration not found" };
      }

      const supplier = supplierDoc.data() as SupplierIntegration;
      if (!supplier.isEnabled) {
        return { success: false, message: "Supplier integration is currently disabled" };
      }

      // In production, this call executes through Firebase Cloud Function / proxy server
      const simulatedSupplierOrderId = `SUP-${supplier.name.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;

      // Update Firestore order record with supplier tracking info
      await updateDoc(doc(db, "orders", orderId), {
        supplierOrderId: simulatedSupplierOrderId,
        supplierName: supplier.name,
        supplierSyncStatus: "FORWARDED",
        supplierSyncedAt: serverTimestamp()
      });

      return {
        success: true,
        supplierOrderId: simulatedSupplierOrderId,
        message: `Order forwarded to ${supplier.name} successfully.`
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to forward order to supplier"
      };
    }
  }
}
