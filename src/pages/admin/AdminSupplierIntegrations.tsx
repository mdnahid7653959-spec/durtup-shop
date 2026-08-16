import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/firebaseAdapter";
import { encryptCredentials, decryptCredentials } from "@/lib/crypto";
import { 
  Globe, Settings, Percent, DollarSign, Activity, 
  CheckCircle2, XCircle, AlertCircle, Trash2, Edit, 
  Plus, RefreshCw, Play, Link2, ShieldCheck, HelpCircle,
  TrendingUp, Clock, AlertTriangle, ArrowRight, ArrowLeft,
  Terminal, ShieldAlert, Cpu, Sparkles, Check, Database, Eye
} from "lucide-react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { adminDb } from "@/lib/adminDb";

interface SupplierIntegration {
  id: string;
  name: string;
  company_name: string;
  api_base_url: string;
  api_version: string;
  auth_type: 'apikey' | 'bearer' | 'oauth2' | 'basic';
  credentials_encrypted: string;
  endpoints_config: any;
  pricing_rules: any;
  sync_interval: string;
  is_active: boolean;
  webhook_url: string;
  created_at?: string;
  updated_at?: string;
}

interface SyncLog {
  id: string;
  supplier_id: string;
  action_type: 'connection_test' | 'product_sync' | 'order_forward' | 'webhook';
  status: 'success' | 'failed';
  response_time_ms: number;
  message: string;
  error_details: any;
  created_at: string;
}

// Utility to get nested object values via dot/bracket notation
const getNestedValue = (obj: any, path: string) => {
  if (!path) return undefined;
  try {
    const cleanPath = path.replace(/\[(\w+)\]/g, '.$1');
    const parts = cleanPath.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  } catch {
    return undefined;
  }
};

export default function AdminSupplierIntegrations() {
  const { toast } = useToast();
  const { admin } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<SupplierIntegration[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [mappingsCount, setMappingsCount] = useState<Record<string, number>>({});
  
  // Modal / Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partial<SupplierIntegration> | null>(null);
  
  // Simple Input States
  const [supplierName, setSupplierName] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [syncInterval, setSyncInterval] = useState("1h");
  const [isActive, setIsActive] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");

  // Pricing Rule States
  const [markupType, setMarkupType] = useState<'percentage' | 'fixed'>('percentage');
  const [markupValue, setMarkupValue] = useState(15);
  const [commissionMargin, setCommissionMargin] = useState(5);
  const [minProfit, setMinProfit] = useState(50);
  const [maxProfit, setMaxProfit] = useState(999999);
  const [conversionRate, setConversionRate] = useState(1);
  const [autoRound, setAutoRound] = useState(false);
  const [roundTo, setRoundTo] = useState(99);
  
  // JSON Parse states
  const [sampleResponseText, setSampleResponseText] = useState("");
  const [parsedSampleArray, setParsedSampleArray] = useState<any[]>([]);
  const [detectedKeys, setDetectedKeys] = useState<string[]>([]);
  
  // Field mapping state keys
  const [endpointsInput, setEndpointsInput] = useState<any>({
    response_root_path: "",
    sku_path: "",
    name_path: "",
    price_path: "",
    stock_path: "",
    image_path: "",
    description_path: "",
    category_list_path: "",
    category_id_path: "",
    category_name_path: ""
  });

  // Action status loader states
  const [pinging, setPinging] = useState<Record<string, boolean>>({});
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: supplierData } = await adminDb.select<SupplierIntegration>("supplier_integrations", {
        orderBy: { col: "created_at", ascending: false }
      });
      setSuppliers(supplierData || []);

      const { data: logData } = await adminDb.select<SyncLog>("supplier_sync_logs", {
        limit: 50,
        orderBy: { col: "created_at", ascending: false }
      });
      setLogs(logData || []);

      const { data: mappings } = await adminDb.select<any>("supplier_product_mappings", {
        columns: "supplier_id"
      });
      
      const counts: Record<string, number> = {};
      mappings?.forEach((m: any) => {
        counts[m.supplier_id] = (counts[m.supplier_id] || 0) + 1;
      });
      setMappingsCount(counts);

    } catch (error: any) {
      toast({
        title: "Error fetching data",
        description: error.message || "Failed to query database",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleEdit = (supplier: SupplierIntegration) => {
    setEditingSupplier(supplier);
    setSupplierName(supplier.name);
    setEndpointUrl(supplier.api_base_url);
    
    // Decrypt credentials
    const creds = decryptCredentials(supplier.credentials_encrypted) || {};
    setApiKey(creds.api_key || "");
    setSecretKey(creds.secret_key || "");
    
    setSyncInterval(supplier.sync_interval);
    setIsActive(supplier.is_active);
    setWebhookUrl(supplier.webhook_url);
    
    // Set mapped endpoints
    const endpoints = supplier.endpoints_config || {};
    setEndpointsInput(endpoints);

    // Set pricing rules states
    const rules = supplier.pricing_rules || {};
    setMarkupType(rules.markup_type || 'percentage');
    setMarkupValue(rules.markup_value !== undefined ? rules.markup_value : 15);
    setCommissionMargin(rules.commission_margin !== undefined ? rules.commission_margin : 5);
    setMinProfit(rules.min_profit !== undefined ? rules.min_profit : 50);
    setMaxProfit(rules.max_profit !== undefined ? rules.max_profit : 999999);
    setConversionRate(rules.conversion_rate !== undefined ? rules.conversion_rate : 1);
    setAutoRound(rules.auto_round || false);
    setRoundTo(rules.round_to !== undefined ? rules.round_to : 99);
    
    // Load sample response if stored
    const sample = endpoints.sample_response ? JSON.stringify(endpoints.sample_response, null, 2) : "";
    setSampleResponseText(sample);
    if (sample) {
      tryParseSampleJSON(sample, endpoints);
    } else {
      setParsedSampleArray([]);
      setDetectedKeys([]);
    }
    
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingSupplier({
      auth_type: "apikey",
      api_version: "v1",
    });
    setSupplierName("");
    setEndpointUrl("");
    setApiKey("");
    setSecretKey("");
    setSyncInterval("1h");
    setIsActive(true);
    setWebhookUrl("");
    setSampleResponseText("");
    setParsedSampleArray([]);
    setDetectedKeys([]);
    setEndpointsInput({
      response_root_path: "",
      sku_path: "",
      name_path: "",
      price_path: "",
      stock_path: "",
      image_path: "",
      description_path: "",
      category_list_path: "",
      category_id_path: "",
      category_name_path: ""
    });

    // Set default pricing rules states
    setMarkupType('percentage');
    setMarkupValue(15);
    setCommissionMargin(5);
    setMinProfit(50);
    setMaxProfit(999999);
    setConversionRate(1);
    setAutoRound(false);
    setRoundTo(99);

    setIsFormOpen(true);
  };

  // Safe internal parsing helper
  const tryParseSampleJSON = (jsonText: string, currentEndpoints: any) => {
    try {
      const parsed = JSON.parse(jsonText);
      let arrayPath = currentEndpoints?.response_root_path || "";
      let sampleArray: any[] = [];
      
      if (Array.isArray(parsed)) {
        sampleArray = parsed;
      } else {
        if (arrayPath && Array.isArray(parsed[arrayPath])) {
          sampleArray = parsed[arrayPath];
        } else {
          // Find first array key
          const keys = Object.keys(parsed);
          for (const k of keys) {
            if (Array.isArray(parsed[k])) {
              arrayPath = k;
              sampleArray = parsed[k];
              break;
            }
          }
        }
      }
      
      if (sampleArray.length > 0) {
        const firstItem = sampleArray[0];
        const itemKeys = Object.keys(firstItem).flatMap(k => {
          if (typeof firstItem[k] === 'object' && firstItem[k] !== null && !Array.isArray(firstItem[k])) {
            return Object.keys(firstItem[k]).map(subK => `${k}.${subK}`);
          }
          if (Array.isArray(firstItem[k]) && firstItem[k].length > 0) {
            const firstSub = firstItem[k][0];
            if (typeof firstSub === 'object' && firstSub !== null) {
              return Object.keys(firstSub).map(subK => `${k}[0].${subK}`);
            }
          }
          return [k];
        });
        
        setDetectedKeys(itemKeys);
        setParsedSampleArray(sampleArray);
        return { arrayPath, itemKeys };
      }
    } catch (e) {
      console.warn("Failed to parse JSON silently", e);
    }
    return null;
  };

  const handleParseJSONButton = () => {
    if (!sampleResponseText.trim()) {
      toast({ title: "JSON Empty", description: "Please paste a sample JSON response first.", variant: "destructive" });
      return;
    }
    
    try {
      const parsed = JSON.parse(sampleResponseText);
      let arrayPath = "";
      let sampleArray: any[] = [];
      
      if (Array.isArray(parsed)) {
        sampleArray = parsed;
      } else {
        const keys = Object.keys(parsed);
        for (const k of keys) {
          if (Array.isArray(parsed[k])) {
            arrayPath = k;
            sampleArray = parsed[k];
            break;
          }
        }
      }
      
      if (sampleArray.length === 0) {
        throw new Error("Could not find any product array inside the JSON response. Make sure it contains a list of items.");
      }
      
      const firstItem = sampleArray[0];
      const itemKeys = Object.keys(firstItem).flatMap(k => {
        if (typeof firstItem[k] === 'object' && firstItem[k] !== null && !Array.isArray(firstItem[k])) {
          return Object.keys(firstItem[k]).map(subK => `${k}.${subK}`);
        }
        if (Array.isArray(firstItem[k]) && firstItem[k].length > 0) {
          const firstSub = firstItem[k][0];
          if (typeof firstSub === 'object' && firstSub !== null) {
            return Object.keys(firstSub).map(subK => `${k}[0].${subK}`);
          }
        }
        return [k];
      });
      
      // Auto mapping heuristics
      const newEndpoints = { ...endpointsInput };
      newEndpoints.response_root_path = arrayPath;
      newEndpoints.connection_test = "/ping";
      newEndpoints.product_list = "/products";
      
      const sku = itemKeys.find(k => k.toLowerCase() === 'sku' || k.toLowerCase() === 'id' || k.toLowerCase().includes('sku'));
      const name = itemKeys.find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('title'));
      const price = itemKeys.find(k => k.toLowerCase().includes('price') || k.toLowerCase().includes('cost') || k.toLowerCase().includes('sell'));
      const stock = itemKeys.find(k => k.toLowerCase().includes('stock') || k.toLowerCase().includes('quantity') || k.toLowerCase().includes('qty') || k.toLowerCase().includes('inventory'));
      const img = itemKeys.find(k => k.toLowerCase().includes('image') || k.toLowerCase().includes('img') || k.toLowerCase().includes('pic') || k.toLowerCase().includes('thumb') || k.toLowerCase().includes('url'));
      const desc = itemKeys.find(k => k.toLowerCase().includes('desc') || k.toLowerCase().includes('summary') || k.toLowerCase().includes('detail'));
      
      if (sku) newEndpoints.sku_path = sku;
      if (name) newEndpoints.name_path = name;
      if (price) newEndpoints.price_path = price;
      if (stock) newEndpoints.stock_path = stock;
      if (img) newEndpoints.image_path = img;
      if (desc) newEndpoints.description_path = desc;
      
      setEndpointsInput(newEndpoints);
      setDetectedKeys(itemKeys);
      setParsedSampleArray(sampleArray);
      
      toast({
        title: "JSON Parsed Successfully!",
        description: `Found ${sampleArray.length} items. Auto-mapped primary fields.`
      });
    } catch (err: any) {
      toast({
        title: "JSON Parsing Failed",
        description: err.message || "Invalid JSON syntax.",
        variant: "destructive"
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier || !admin) return;
    if (!supplierName || !endpointUrl) {
      toast({ title: "Fields missing", description: "Supplier Name and Endpoint URL are required.", variant: "destructive" });
      return;
    }

    try {
      // Store API Key and Secret Key securely in encrypted credentials
      const creds = { api_key: apiKey, secret_key: secretKey };
      const encryptedCreds = encryptCredentials(creds);
      
      // Embed sample response into endpoints_config
      let sampleJSON = null;
      if (sampleResponseText.trim()) {
        try {
          sampleJSON = JSON.parse(sampleResponseText);
        } catch {
          // ignore invalid json on save
        }
      }

      const payload: any = {
        name: supplierName,
        company_name: editingSupplier.company_name || supplierName,
        api_base_url: endpointUrl,
        api_version: editingSupplier.api_version || "v1",
        auth_type: "apikey",
        credentials_encrypted: encryptedCreds,
        endpoints_config: {
          ...endpointsInput,
          sample_response: sampleJSON
        },
        pricing_rules: {
          markup_type: markupType,
          markup_value: Number(markupValue),
          commission_margin: Number(commissionMargin),
          min_profit: Number(minProfit),
          max_profit: Number(maxProfit),
          conversion_rate: Number(conversionRate),
          auto_round: autoRound,
          round_to: Number(roundTo)
        },
        sync_interval: syncInterval,
        is_active: isActive,
        webhook_url: webhookUrl,
        updated_at: new Date().toISOString()
      };

      if (editingSupplier.id) {
        const { error } = await adminDb.update("supplier_integrations", payload, { id: editingSupplier.id });
        if (error) throw error;
        toast({ title: "Supplier integration saved successfully!" });
      } else {
        const { error } = await adminDb.insert("supplier_integrations", {
          ...payload,
          created_at: new Date().toISOString()
        });
        if (error) throw error;
        toast({ title: "Supplier integration created successfully!" });
      }

      setIsFormOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message || "Failed to update database",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supplier integration? All product mappings and logs will be deleted.")) return;

    try {
      const { error } = await adminDb.remove("supplier_integrations", { id });
      if (error) throw error;
      toast({ title: "Integration deleted successfully" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleTestConnection = async (supplierId: string) => {
    setPinging(prev => ({ ...prev, [supplierId]: true }));
    try {
      const supplier = suppliers.find(s => s.id === supplierId);
      if (!supplier) throw new Error("Supplier not found");

      const creds = decryptCredentials(supplier.credentials_encrypted) || {};
      const apiBase = supplier.api_base_url || "https://mohasagor.com.bd";
      const listPath = supplier.endpoints_config?.product_list || "/api/reseller/product";
      const url = `${apiBase}${listPath}`;

      const proxiedUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxiedUrl);
      if (!res.ok) {
        throw new Error(`CORS Proxy returned HTTP ${res.status}`);
      }

      const json = await res.json();
      if (!json.contents) {
        throw new Error("Empty response from CORS proxy");
      }

      const rawData = JSON.parse(json.contents);
      const rawProducts = Array.isArray(rawData) ? rawData : (rawData.data || rawData.products || []);

      if (!Array.isArray(rawProducts)) {
        throw new Error("Failed to parse products list from API response");
      }

      toast({
        title: "Connection test passed!",
        description: `Successfully verified API connection. Retrieved ${rawProducts.length} products.`
      });
    } catch (err: any) {
      toast({
        title: "Connection test failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setPinging(prev => ({ ...prev, [supplierId]: false }));
    }
  };

  const handleSyncProducts = async (supplierId: string) => {
    setSyncing(prev => ({ ...prev, [supplierId]: true }));
    try {
      const supplier = suppliers.find(s => s.id === supplierId);
      if (!supplier) throw new Error("Supplier not found");

      const creds = decryptCredentials(supplier.credentials_encrypted) || {};
      const apiBase = supplier.api_base_url || "https://mohasagor.com.bd";
      const listPath = supplier.endpoints_config?.product_list || "/api/reseller/product";
      const url = `${apiBase}${listPath}`;

      const proxiedUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxiedUrl);
      if (!res.ok) {
        throw new Error(`CORS Proxy returned HTTP ${res.status}`);
      }

      const json = await res.json();
      if (!json.contents) {
        throw new Error("Empty response from CORS proxy");
      }

      const rawData = JSON.parse(json.contents);
      const rawProducts = Array.isArray(rawData) ? rawData : (rawData.data || rawData.products || []);

      if (!Array.isArray(rawProducts)) {
        throw new Error("API response is not an array of products");
      }

      // Map and save products to Supabase directly from the browser
      let successCount = 0;
      for (const prod of rawProducts) {
        const sku = String(prod.id || prod.sku || "");
        if (!sku) continue;

        // Resolve pricing using the supplier's rules
        const rules = supplier.pricing_rules || {};
        const basePrice = parseFloat(prod.price || "0");
        let markupType = rules.markup_type || 'percentage';
        let markupValue = Number(rules.markup_value !== undefined ? rules.markup_value : 15);
        let commissionMargin = Number(rules.commission_margin !== undefined ? rules.commission_margin : 5);
        let minProfit = Number(rules.min_profit !== undefined ? rules.min_profit : 50);
        let maxProfit = Number(rules.max_profit !== undefined ? rules.max_profit : 999999);
        
        let profit = markupType === 'percentage' ? basePrice * (markupValue / 100) : markupValue;
        if (profit < minProfit) profit = minProfit;
        if (profit > maxProfit) profit = maxProfit;
        
        const sellingPrice = Math.round(basePrice + profit + commissionMargin);

        // Upsert to products table directly
        const productPayload = {
          name: prod.name || "Mohasagor Product",
          sku: sku,
          regular_price: sellingPrice,
          discount_price: Math.round(sellingPrice * 0.95),
          stock_quantity: parseInt(prod.stock_quantity || prod.stock || "10"),
          description: prod.description || "",
          status: "active",
          seller_id: supplier.company_name || supplier.name || "Mohasagor",
        };

        const { error: upsertErr } = await supabase
          .from("products")
          .upsert(productPayload, { onConflict: "sku" });

        if (!upsertErr) {
          successCount++;
        }
      }

      toast({
        title: "Sync completed successfully!",
        description: `Successfully synced ${successCount} products directly from ${supplier.name}!`
      });
      fetchData();
    } catch (err: any) {
      toast({
        title: "Synchronization failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSyncing(prev => ({ ...prev, [supplierId]: false }));
    }
  };

  const getSuccessRate = () => {
    if (logs.length === 0) return 100;
    const successLogs = logs.filter(l => l.status === "success").length;
    return Math.round((successLogs / logs.length) * 100);
  };

  const getAverageResponseTime = () => {
    if (logs.length === 0) return 0;
    const total = logs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0);
    return Math.round(total / logs.length);
  };

  return (
    <AdminLayout title="Supplier Integrations">
      <div className="flex flex-col gap-6 p-1 md:p-4">
        
        {/* Simple Minimalistic Banner */}
        <div className="relative rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/10 p-6 md:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-orange-500/15 border-orange-500/20 text-orange-600 font-semibold gap-1 dark:text-orange-400">
                <Sparkles className="h-3 w-3" /> Dropship Manager
              </Badge>
              <span className="text-xs text-muted-foreground">• Active Synchronizer</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Supplier API Integration</h1>
            <p className="text-muted-foreground text-xs max-w-lg">
              Add your supplier API endpoints, paste a sample product response, and quickly map fields to display inventory.
            </p>
          </div>
          <Button onClick={handleAddNew} className="bg-orange-600 hover:bg-orange-500 text-white font-medium gap-2">
            <Plus className="h-4 w-4" /> Add API Connection
          </Button>
        </div>

        {/* Dashboard Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border/40 bg-card/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suppliers</CardTitle>
              <Globe className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{suppliers.length}</div>
              <p className="text-[10px] text-muted-foreground">Connected API channels</p>
            </CardContent>
          </Card>
          <Card className="border-border/40 bg-card/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Products Tracked</CardTitle>
              <Database className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.values(mappingsCount).reduce((a, b) => a + b, 0)}
              </div>
              <p className="text-[10px] text-muted-foreground">Total mapped item syncs</p>
            </CardContent>
          </Card>
          <Card className="border-border/40 bg-card/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">API Sync Success</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getSuccessRate()}%</div>
              <p className="text-[10px] text-muted-foreground">Success rate of recent connections</p>
            </CardContent>
          </Card>
        </div>

        {/* Workspace Table & Log Panels */}
        <Card className="border-border/30 bg-card/40 shadow-sm overflow-hidden">
          <Tabs defaultValue="suppliers" className="w-full">
            <div className="border-b border-border/40 bg-muted/20 px-6 py-1.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <TabsList className="bg-transparent border-none p-0 h-auto gap-4">
                <TabsTrigger value="suppliers" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:shadow-none rounded-none px-0 py-3 font-semibold text-xs gap-2">
                  <Globe className="h-4 w-4" /> Supplier Channels
                </TabsTrigger>
                <TabsTrigger value="logs" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:shadow-none rounded-none px-0 py-3 font-semibold text-xs gap-2">
                  <Activity className="h-4 w-4" /> Live Sync Logs
                </TabsTrigger>
              </TabsList>
            </div>

            {/* 1. List Tab */}
            <TabsContent value="suppliers" className="m-0 p-6 space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <RefreshCw className="h-8 w-8 text-orange-500 animate-spin" />
                  <p className="text-xs text-muted-foreground">Loading supplier configurations...</p>
                </div>
              ) : suppliers.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border/60 rounded-xl max-w-md mx-auto my-6 p-6">
                  <Globe className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
                  <h3 className="font-semibold text-sm">No API Connection Configured</h3>
                  <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto">
                    Setup a supplier connection using API Keys and a sample JSON response to import products.
                  </p>
                  <Button onClick={handleAddNew} className="bg-orange-600 hover:bg-orange-500 text-white text-xs">
                    Add First Channel
                  </Button>
                </div>
              ) : (
                <div className="border border-border/30 rounded-xl overflow-hidden bg-card/60">
                  <Table>
                    <TableHeader className="bg-muted/10">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold text-xs">Supplier Info</TableHead>
                        <TableHead className="font-semibold text-xs">Base Endpoint URL</TableHead>
                        <TableHead className="font-semibold text-xs">Products</TableHead>
                        <TableHead className="font-semibold text-xs">Status</TableHead>
                        <TableHead className="text-right font-semibold text-xs pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers.map(s => (
                        <TableRow key={s.id} className="transition-colors hover:bg-muted/20">
                          <TableCell className="py-3 font-semibold text-sm">
                            🔌 {s.name}
                          </TableCell>
                          <TableCell className="py-3 font-mono text-xs text-muted-foreground max-w-xs truncate">
                            {s.api_base_url}
                          </TableCell>
                          <TableCell className="py-3 font-semibold text-xs text-foreground">
                            {mappingsCount[s.id] || 0} items mapped
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="flex items-center gap-1.5">
                              <span className={`h-2 w-2 rounded-full ${s.is_active ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
                              <span className="text-xs font-medium">{s.is_active ? 'Active' : 'Paused'}</span>
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-3 pr-6 space-x-1.5">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleTestConnection(s.id)} 
                              disabled={pinging[s.id]} 
                              className="h-7 text-[11px] font-medium"
                            >
                              {pinging[s.id] ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1 text-green-500" />}
                              Test Ping
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleSyncProducts(s.id)} 
                              disabled={syncing[s.id]} 
                              className="h-7 text-[11px] font-medium"
                            >
                              {syncing[s.id] ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1 text-blue-500" />}
                              Sync Products
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(s)} className="h-8 w-8 hover:bg-muted">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDelete(s.id)} 
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* 2. Logs Tab */}
            <TabsContent value="logs" className="m-0 p-6 space-y-4">
              <div className="rounded-xl border border-border/40 bg-zinc-950 font-mono text-[11px] leading-relaxed text-zinc-300 overflow-hidden">
                <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                    <span className="text-[10px] text-zinc-500 ml-2">sync_terminal.log</span>
                  </div>
                </div>
                <div className="p-4 max-h-[350px] overflow-y-auto space-y-2">
                  {logs.length === 0 ? (
                    <div className="text-center py-6 text-zinc-600">~ waiting for log streams...</div>
                  ) : (
                    logs.map(l => (
                      <div key={l.id} className="flex flex-col md:flex-row md:items-start gap-1 md:gap-3 text-zinc-300">
                        <span className="text-zinc-500">{new Date(l.created_at).toLocaleTimeString()}</span>
                        <span className="text-blue-400 font-bold">{`[${l.action_type.toUpperCase()}]`}</span>
                        <span className={l.status === 'success' ? 'text-green-500' : 'text-rose-500'}>
                          {l.status === 'success' ? '✔ SUCCESS' : '✘ FAILED'}
                        </span>
                        <span>{l.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Simplified Single Screen Modal Configuration Dialog */}
        {isFormOpen && editingSupplier && (
          <div className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-5xl max-h-[92vh] overflow-hidden border-border/60 shadow-2xl flex flex-col bg-background">
              
              {/* Modal Header */}
              <CardHeader className="border-b border-border/40 pb-4 bg-muted/10">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Settings className="h-5 w-5 text-orange-500" />
                      {editingSupplier.id ? "Edit API Connection Settings" : "Configure New API Integration"}
                    </CardTitle>
                    <CardDescription className="text-xs">Setup simple API connection parameters, paste a sample response, and map the product keys.</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsFormOpen(false)} className="rounded-full h-8 w-8 hover:bg-muted">
                    ✕
                  </Button>
                </div>
              </CardHeader>

              {/* Form Content in Two-Column Layout */}
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto flex flex-col">
                <CardContent className="p-6 space-y-6 flex-1">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    
                    {/* Left Column: API Settings */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-orange-500 flex items-center gap-1">
                        <Globe className="h-4 w-4" /> 1. Endpoint Credentials
                      </h3>

                      <div className="space-y-2">
                        <Label htmlFor="s_name" className="text-xs font-semibold">Supplier Name *</Label>
                        <Input 
                          id="s_name" 
                          required 
                          placeholder="e.g. CJ Dropshipping, AliExpress"
                          value={supplierName} 
                          onChange={e => setSupplierName(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="s_base" className="text-xs font-semibold">Endpoint URL *</Label>
                        <Input 
                          id="s_base" 
                          required 
                          placeholder="https://api.supplier.com/products" 
                          value={endpointUrl} 
                          onChange={e => setEndpointUrl(e.target.value)}
                          className="h-9 text-xs font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="s_key" className="text-xs font-semibold">API Key / Header Secret</Label>
                          <Input 
                            id="s_key" 
                            type="password"
                            placeholder="Enter access token / key"
                            value={apiKey} 
                            onChange={e => setApiKey(e.target.value)}
                            className="h-9 text-xs font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="s_sec" className="text-xs font-semibold">Secret Key (Optional)</Label>
                          <Input 
                            id="s_sec" 
                            type="password"
                            placeholder="Enter API secret signature" 
                            value={secretKey} 
                            onChange={e => setSecretKey(e.target.value)}
                            className="h-9 text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-t pt-4">
                        <div className="space-y-2">
                          <Label htmlFor="s_interval" className="text-xs font-semibold">Auto-Sync Schedule</Label>
                          <Select value={syncInterval} onValueChange={setSyncInterval}>
                            <SelectTrigger id="s_interval" className="h-9 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5m">Every 5 Minutes</SelectItem>
                              <SelectItem value="15m">Every 15 Minutes</SelectItem>
                              <SelectItem value="1h">Every 1 Hour</SelectItem>
                              <SelectItem value="12h">Every 12 Hours</SelectItem>
                              <SelectItem value="24h">Every 24 Hours</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="s_webhook" className="text-xs font-semibold">Custom Webhook URI</Label>
                          <Input 
                            id="s_webhook" 
                            placeholder="https://durtup.shop/webhook/..." 
                            value={webhookUrl} 
                            onChange={e => setWebhookUrl(e.target.value)}
                            className="h-9 text-xs font-mono"
                          />
                        </div>
                      </div>

                      {/* Profit Margin & Pricing Rules */}
                      <div className="border-t pt-4 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-orange-500 flex items-center gap-1">
                          <Percent className="h-4 w-4" /> Pricing Rules & Profit Margin
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="markup_type" className="text-xs font-semibold">Markup Type</Label>
                            <Select value={markupType} onValueChange={(val: any) => setMarkupType(val)}>
                              <SelectTrigger id="markup_type" className="h-9 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percentage">Percentage (%)</SelectItem>
                                <SelectItem value="fixed">Fixed BDT (৳)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="markup_value" className="text-xs font-semibold">
                              {markupType === 'percentage' ? 'Profit Margin (%)' : 'Profit Margin (৳)'}
                            </Label>
                            <Input 
                              id="markup_value" 
                              type="number"
                              min="0"
                              placeholder={markupType === 'percentage' ? '15' : '100'}
                              value={markupValue} 
                              onChange={e => setMarkupValue(Number(e.target.value))}
                              className="h-9 text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="commission_margin" className="text-xs font-semibold">Commission Margin (%)</Label>
                            <Input 
                              id="commission_margin" 
                              type="number"
                              min="0"
                              placeholder="5"
                              value={commissionMargin} 
                              onChange={e => setCommissionMargin(Number(e.target.value))}
                              className="h-9 text-xs font-mono"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="conversion_rate" className="text-xs font-semibold">Exchange Rate (1 BDT = ? Supp Currency)</Label>
                            <Input 
                              id="conversion_rate" 
                              type="number"
                              step="0.0001"
                              placeholder="1.0"
                              value={conversionRate} 
                              onChange={e => setConversionRate(Number(e.target.value))}
                              className="h-9 text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="min_profit" className="text-xs font-semibold">Min Profit Cap (৳)</Label>
                            <Input 
                              id="min_profit" 
                              type="number"
                              placeholder="50"
                              value={minProfit} 
                              onChange={e => setMinProfit(Number(e.target.value))}
                              className="h-9 text-xs font-mono"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="max_profit" className="text-xs font-semibold">Max Profit Cap (৳)</Label>
                            <Input 
                              id="max_profit" 
                              type="number"
                              placeholder="999999"
                              value={maxProfit} 
                              onChange={e => setMaxProfit(Number(e.target.value))}
                              className="h-9 text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between border border-border/40 p-2.5 rounded-lg bg-muted/5 gap-4">
                          <div className="space-y-0.5">
                            <Label htmlFor="auto_round" className="text-xs font-semibold cursor-pointer">Auto Round Final Prices</Label>
                            <p className="text-[10px] text-muted-foreground">Force prices to end with a specific value (e.g. ৳99)</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {autoRound && (
                              <Input 
                                type="number" 
                                placeholder="99" 
                                value={roundTo}
                                onChange={e => setRoundTo(Number(e.target.value))}
                                className="w-16 h-8 text-xs font-mono text-center" 
                              />
                            )}
                            <Switch 
                              id="auto_round" 
                              checked={autoRound}
                              onCheckedChange={setAutoRound}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 border border-border/40 p-3 rounded-lg bg-muted/10">
                        <Switch 
                          id="s_active" 
                          checked={isActive}
                          onCheckedChange={setIsActive}
                        />
                        <Label htmlFor="s_active" className="text-xs font-semibold cursor-pointer">Enable background sync for this supplier</Label>
                      </div>
                    </div>

                    {/* Right Column: Sample JSON & Field Mapping */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-orange-500 flex items-center gap-1.5">
                        <Eye className="h-4 w-4" /> 2. Paste JSON Sample & Map Fields
                      </h3>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="json_sample" className="text-xs font-semibold">Sample API Response (JSON Array or Object)</Label>
                          <Button 
                            type="button" 
                            size="sm" 
                            onClick={handleParseJSONButton} 
                            className="h-6 text-[10px] bg-orange-600/10 hover:bg-orange-600/20 text-orange-600 font-bold px-2.5 rounded"
                          >
                            Parse & Auto-Map keys
                          </Button>
                        </div>
                        <textarea
                          id="json_sample"
                          placeholder='[{"id": 1, "title": "Red Jacket", "price": 12.50, "stock": 100, "image": "https://img.com/a.jpg"}]'
                          value={sampleResponseText}
                          onChange={e => setSampleResponseText(e.target.value)}
                          className="w-full h-32 p-3 font-mono text-[10px] rounded-lg border border-border bg-zinc-950 text-zinc-300 resize-none focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>

                      {/* Mapping Selectors */}
                      {detectedKeys.length > 0 && (
                        <div className="border border-border/40 p-4 rounded-xl bg-muted/5 space-y-3">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select JSON Properties:</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            
                            <div className="space-y-1.5">
                              <Label className="text-[10px] text-muted-foreground font-semibold">Products Array path</Label>
                              <Input 
                                placeholder="Auto-detected root key (e.g. products)"
                                value={endpointsInput.response_root_path || ""}
                                onChange={e => setEndpointsInput((prev: any) => ({ ...prev, response_root_path: e.target.value }))}
                                className="h-8 text-[11px]"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-[10px] text-muted-foreground font-semibold">Category List Endpoint Path</Label>
                              <Input 
                                placeholder="e.g. /api/reseller/category"
                                value={endpointsInput.category_list_path || ""}
                                onChange={e => setEndpointsInput((prev: any) => ({ ...prev, category_list_path: e.target.value }))}
                                className="h-8 text-[11px]"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-[10px] text-muted-foreground font-semibold">SKU key</Label>
                              <Select 
                                value={endpointsInput.sku_path} 
                                onValueChange={(val) => setEndpointsInput((prev: any) => ({ ...prev, sku_path: val }))}
                              >
                                <SelectTrigger className="h-8 text-[11px]">
                                  <SelectValue placeholder="Select SKU field" />
                                </SelectTrigger>
                                <SelectContent>
                                  {detectedKeys.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-[10px] text-muted-foreground font-semibold">Title / Name key</Label>
                              <Select 
                                value={endpointsInput.name_path} 
                                onValueChange={(val) => setEndpointsInput((prev: any) => ({ ...prev, name_path: val }))}
                              >
                                <SelectTrigger className="h-8 text-[11px]">
                                  <SelectValue placeholder="Select title field" />
                                </SelectTrigger>
                                <SelectContent>
                                  {detectedKeys.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-[10px] text-muted-foreground font-semibold">Price key</Label>
                              <Select 
                                value={endpointsInput.price_path} 
                                onValueChange={(val) => setEndpointsInput((prev: any) => ({ ...prev, price_path: val }))}
                              >
                                <SelectTrigger className="h-8 text-[11px]">
                                  <SelectValue placeholder="Select price field" />
                                </SelectTrigger>
                                <SelectContent>
                                  {detectedKeys.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-[10px] text-muted-foreground font-semibold">Stock quantity key</Label>
                              <Select 
                                value={endpointsInput.stock_path} 
                                onValueChange={(val) => setEndpointsInput((prev: any) => ({ ...prev, stock_path: val }))}
                              >
                                <SelectTrigger className="h-8 text-[11px]">
                                  <SelectValue placeholder="Select stock field" />
                                </SelectTrigger>
                                <SelectContent>
                                  {detectedKeys.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-[10px] text-muted-foreground font-semibold">Image URL key</Label>
                              <Select 
                                value={endpointsInput.image_path} 
                                onValueChange={(val) => setEndpointsInput((prev: any) => ({ ...prev, image_path: val }))}
                              >
                                <SelectTrigger className="h-8 text-[11px]">
                                  <SelectValue placeholder="Select image field" />
                                </SelectTrigger>
                                <SelectContent>
                                  {detectedKeys.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-[10px] text-muted-foreground font-semibold">Category ID key</Label>
                              <Select 
                                value={endpointsInput.category_id_path || ""} 
                                onValueChange={(val) => setEndpointsInput((prev: any) => ({ ...prev, category_id_path: val }))}
                              >
                                <SelectTrigger className="h-8 text-[11px]">
                                  <SelectValue placeholder="Select category ID field" />
                                </SelectTrigger>
                                <SelectContent>
                                  {detectedKeys.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-[10px] text-muted-foreground font-semibold">Category Name key (if direct)</Label>
                              <Select 
                                value={endpointsInput.category_name_path || ""} 
                                onValueChange={(val) => setEndpointsInput((prev: any) => ({ ...prev, category_name_path: val }))}
                              >
                                <SelectTrigger className="h-8 text-[11px]">
                                  <SelectValue placeholder="Select category name field" />
                                </SelectTrigger>
                                <SelectContent>
                                  {detectedKeys.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Live Preview Container */}
                          {parsedSampleArray.length > 0 && (
                            <div className="mt-4 border-t pt-3 space-y-2">
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                <Sparkles className="h-3.5 w-3.5 text-orange-500" /> Products Live Preview (Based on pasted response)
                              </h4>
                              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                {parsedSampleArray.slice(0, 3).map((item, idx) => {
                                  const name = getNestedValue(item, endpointsInput.name_path) || "N/A";
                                  const sku = getNestedValue(item, endpointsInput.sku_path) || "N/A";
                                  const price = getNestedValue(item, endpointsInput.price_path) || 0;
                                  const stock = getNestedValue(item, endpointsInput.stock_path) || 0;
                                  const img = getNestedValue(item, endpointsInput.image_path) || "";
                                  
                                  return (
                                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-card/70 text-xs">
                                      {img && (
                                        <img 
                                          src={img} 
                                          alt={name} 
                                          className="w-8 h-8 object-cover rounded bg-muted flex-shrink-0"
                                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="font-bold truncate text-foreground text-[11px]">{name}</p>
                                        <p className="text-[9px] text-muted-foreground font-mono">SKU: {sku}</p>
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <p className="font-bold text-orange-500 text-[11px]">৳{price}</p>
                                        <p className="text-[9px] text-muted-foreground">Stock: {stock}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>

                {/* Footer buttons */}
                <div className="border-t border-border/40 p-4 md:p-6 bg-muted/10 flex items-center justify-between">
                  <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)} className="h-10 text-xs border-border/60">
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold gap-1.5 h-10 text-xs shadow-lg">
                    <Check className="h-4 w-4" /> Save Connection Channels
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}

function CardFooter({ children, className, ...props }: any) {
  return (
    <div className={`p-6 flex items-center ${className || ""}`} {...props}>
      {children}
    </div>
  );
}
