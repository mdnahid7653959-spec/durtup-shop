import React, { useState, useEffect } from "react";
import { EnterpriseAdminLayout } from "@/components/admin/enterprise/EnterpriseAdminLayout";
import { db } from "@/integrations/firebase/client";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import {
  Plug,
  Key,
  Shield,
  RefreshCcw,
  Save,
  CheckCircle2,
  Percent,
  DollarSign,
  Layers,
  Store,
  Tag,
  ArrowRight,
  Globe,
  Sliders,
  Webhook
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export const EnterpriseSupplierCenter: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Supplier API Engine Configuration
  const [apiConfig, setApiConfig] = useState({
    supplierName: "CJ Dropshipping & Global Suppliers",
    apiKey: "cj_live_apikey_88392019482",
    apiSecret: "cj_sec_993847291048201",
    authType: "Bearer Token",
    bearerToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    endpointProductFeed: "https://api.cjdropshipping.com/api2.0/v1/product/list",
    endpointStockSync: "https://api.cjdropshipping.com/api2.0/v1/product/stock",
    endpointOrderPost: "https://api.cjdropshipping.com/api2.0/v1/shopping/order/create",
    webhookUrl: "https://durtup.shop/api/webhooks/supplier",
    autoStockSync: true,
    autoPriceSync: true,
    autoOrderForward: true,
  });

  // Admin Margin Controls (Multi-Tier Engine)
  const [margins, setMargins] = useState({
    globalMarginType: "percentage", // "percentage" | "fixed"
    globalMarginValue: 15, // 15% or ৳15
    categoryMargins: {
      Electronics: 12,
      Fashion: 25,
      Beauty: 30,
      HomeLiving: 20,
    },
    brandMargins: {
      Samsung: 10,
      Apple: 8,
      Xiaomi: 12,
    },
    sellerMargins: {
      verifiedSeller: 10,
      regularSeller: 15,
    }
  });

  useEffect(() => {
    loadSupplierSettings();
  }, []);

  const loadSupplierSettings = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "site_settings", "supplier_api_engine"));
      if (snap.exists()) {
        const d = snap.data();
        if (d.apiConfig) setApiConfig((prev) => ({ ...prev, ...d.apiConfig }));
        if (d.margins) setMargins((prev) => ({ ...prev, ...d.margins }));
      }
    } catch (err) {
      console.error("Error loading supplier config:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "site_settings", "supplier_api_engine"), {
        apiConfig,
        margins,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      toast({
        title: "Supplier API Configuration Saved!",
        description: "API credentials and margin rules updated in Firestore.",
      });
    } catch (err: any) {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <EnterpriseAdminLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Plug className="h-6 w-6 text-orange-600" />
              Supplier API Integration & Margin Control Center
              <Badge className="bg-orange-500/10 border border-orange-500/30 text-orange-600 font-bold">
                PRODUCTION READY
              </Badge>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Supplier automation with API Keys, OAuth Tokens, Custom Endpoints, Webhooks, and Multi-Tier Margin Control Engine.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button variant="outline" onClick={loadSupplierSettings} className="text-xs font-bold border-slate-300">
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button onClick={handleSaveConfig} disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs gap-2">
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </div>

        {/* SECTION 1: SUPPLIER API CREDENTIALS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Key className="h-4 w-4 text-orange-600" />
                Supplier API Auth & Credentials
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Supplier Enterprise Name</label>
                <Input value={apiConfig.supplierName} onChange={(e) => setApiConfig({ ...apiConfig, supplierName: e.target.value })} className="text-xs mt-1" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">API Key</label>
                <Input value={apiConfig.apiKey} onChange={(e) => setApiConfig({ ...apiConfig, apiKey: e.target.value })} className="text-xs font-mono mt-1" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">API Secret</label>
                <Input type="password" value={apiConfig.apiSecret} onChange={(e) => setApiConfig({ ...apiConfig, apiSecret: e.target.value })} className="text-xs font-mono mt-1" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">OAuth / Bearer Access Token</label>
                <Input value={apiConfig.bearerToken} onChange={(e) => setApiConfig({ ...apiConfig, bearerToken: e.target.value })} className="text-xs font-mono mt-1" />
              </div>
            </div>
          </div>

          {/* SECTION 2: ENDPOINT MAPPING & WEBHOOKS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Webhook className="h-4 w-4 text-blue-600" />
                Endpoint Mapping & Webhooks
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Product Feed Endpoint</label>
                <Input value={apiConfig.endpointProductFeed} onChange={(e) => setApiConfig({ ...apiConfig, endpointProductFeed: e.target.value })} className="text-xs font-mono mt-1" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Stock & Price Sync Endpoint</label>
                <Input value={apiConfig.endpointStockSync} onChange={(e) => setApiConfig({ ...apiConfig, endpointStockSync: e.target.value })} className="text-xs font-mono mt-1" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Order Forwarding Endpoint</label>
                <Input value={apiConfig.endpointOrderPost} onChange={(e) => setApiConfig({ ...apiConfig, endpointOrderPost: e.target.value })} className="text-xs font-mono mt-1" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Webhook Receiver URL</label>
                <Input value={apiConfig.webhookUrl} onChange={(e) => setApiConfig({ ...apiConfig, webhookUrl: e.target.value })} className="text-xs font-mono mt-1" />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: MULTI-TIER MARGIN CONTROL ENGINE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Percent className="h-4 w-4 text-emerald-600" />
              Admin Multi-Tier Profit Margin Engine
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Global Profit Margin (%)</label>
              <Input
                type="number"
                value={margins.globalMarginValue}
                onChange={(e) => setMargins({ ...margins, globalMarginValue: Number(e.target.value) })}
                className="text-xs font-bold"
              />
              <p className="text-[10px] text-slate-500">Default margin added to all supplier products.</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Electronics Category Margin (%)</label>
              <Input
                type="number"
                value={margins.categoryMargins.Electronics}
                onChange={(e) => setMargins({
                  ...margins,
                  categoryMargins: { ...margins.categoryMargins, Electronics: Number(e.target.value) }
                })}
                className="text-xs font-bold"
              />
              <p className="text-[10px] text-slate-500">Specific margin rule for electronics products.</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Fashion Category Margin (%)</label>
              <Input
                type="number"
                value={margins.categoryMargins.Fashion}
                onChange={(e) => setMargins({
                  ...margins,
                  categoryMargins: { ...margins.categoryMargins, Fashion: Number(e.target.value) }
                })}
                className="text-xs font-bold"
              />
              <p className="text-[10px] text-slate-500">Specific margin rule for fashion products.</p>
            </div>
          </div>
        </div>
      </div>
    </EnterpriseAdminLayout>
  );
};
