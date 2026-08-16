import React, { useState, useEffect } from "react";
import { EnterpriseAdminLayout } from "@/components/admin/enterprise/EnterpriseAdminLayout";
import { db } from "@/integrations/firebase/client";
import { supabase } from "@/lib/firebaseAdapter";
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import {
  Package,
  Plus,
  Search,
  Trash2,
  Edit,
  Download,
  Barcode,
  Image as ImageIcon,
  Video,
  Globe,
  Tag,
  Sparkles,
  DollarSign,
  Truck,
  ShieldCheck,
  Percent,
  Star,
  Layers,
  FileText,
  SlidersHorizontal,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface VariantItem {
  color: string;
  size: string;
  price: number;
  sku: string;
  stock: number;
}

const parseNumberInput = (val: string): number => {
  if (!val || val.trim() === "") return 0;
  const cleaned = val.replace(/^0+(?=\d)/, "");
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
};

const initialFormData = {
  id: "",
  title: "",
  slug: "",
  shortDescription: "",
  description: "",
  category: "Electronics",
  brand: "Generic",
  price: 0,
  discountPrice: 0,
  costPrice: 0,
  stock: 10,
  minOrderQuantity: 1,
  maxOrderQuantity: 100,
  sku: "",
  barcode: "",
  images: "",
  videoUrl: "",
  weight: "",
  dimensions: "",
  shippingCost: 0,
  freeShipping: false,
  estimatedDelivery: "2-5 Days",
  countryOfOrigin: "Bangladesh",
  warrantyInfo: "1 Year Official Warranty",
  returnPolicy: "7 Days Easy Return Policy",
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  isFeatured: false,
  isBestSeller: false,
  isNewArrival: true,
  isFlashSale: false,
  colors: "Black, White, Blue",
  sizes: "S, M, L, XL",
  variants: [
    { color: "Black", size: "M", price: 0, sku: "SKU-BLK-M", stock: 5 },
    { color: "Blue", size: "L", price: 0, sku: "SKU-BLU-L", stock: 5 }
  ] as VariantItem[]
};

export const EnterpriseProducts: React.FC = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    let list: any[] = [];
    try {
      const snap = await getDocs(collection(db, "products"));
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    } catch (err) {
      console.warn("Error loading products from Firestore, using fallback:", err);
    }

    if (list.length === 0) {
      try {
        const saved = localStorage.getItem("enterprise_admin_products");
        if (saved) list = JSON.parse(saved);
      } catch {}
    }

    setProducts(list);
    setLoading(false);
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setFormData({
      ...initialFormData,
      sku: "SKU-" + Math.floor(100000 + Math.random() * 900000),
      barcode: "BC-" + Math.floor(10000000 + Math.random() * 90000000)
    });
    setActiveTab("general");
    setShowModal(true);
  };

  const handleOpenEditModal = (product: any) => {
    setIsEditing(true);
    setFormData({
      id: product.id,
      title: product.title || product.name || "",
      slug: product.slug || "",
      shortDescription: product.shortDescription || product.short_description || "",
      description: product.description || "",
      category: product.category || "Electronics",
      brand: product.brand || "Generic",
      price: Number(product.price || product.regular_price || 0),
      discountPrice: Number(product.discountPrice || product.discount_price || 0),
      costPrice: Number(product.costPrice || product.cost_price || 0),
      stock: Number(product.stock || product.stock_quantity || 0),
      minOrderQuantity: Number(product.minOrderQuantity || product.min_order_quantity || 1),
      maxOrderQuantity: Number(product.maxOrderQuantity || product.max_order_quantity || 100),
      sku: product.sku || "",
      barcode: product.barcode || "",
      images: Array.isArray(product.images) ? product.images.join(", ") : (product.images || product.image_url || ""),
      videoUrl: product.videoUrl || product.video_url || "",
      weight: product.weight || "",
      dimensions: product.dimensions || "",
      shippingCost: Number(product.shippingCost || product.shipping_cost || 0),
      freeShipping: Boolean(product.freeShipping || product.free_shipping),
      estimatedDelivery: product.estimatedDelivery || product.estimated_delivery || "2-5 Days",
      countryOfOrigin: product.countryOfOrigin || product.country_of_origin || "Bangladesh",
      warrantyInfo: product.warrantyInfo || product.warranty_info || "",
      returnPolicy: product.returnPolicy || product.return_policy || "",
      metaTitle: product.metaTitle || product.meta_title || "",
      metaDescription: product.metaDescription || product.meta_description || "",
      metaKeywords: product.metaKeywords || product.meta_keywords || "",
      isFeatured: Boolean(product.isFeatured || product.is_featured),
      isBestSeller: Boolean(product.isBestSeller || product.is_best_seller),
      isNewArrival: Boolean(product.isNewArrival || product.is_new_arrival),
      isFlashSale: Boolean(product.isFlashSale || product.is_flash_sale),
      colors: product.colors || "Black, White, Blue",
      sizes: product.sizes || "S, M, L, XL",
      variants: Array.isArray(product.variants) && product.variants.length > 0 ? product.variants : [
        { color: "Black", size: "M", price: Number(product.price || 0), sku: (product.sku || "SKU") + "-BLK-M", stock: 5 },
        { color: "Blue", size: "L", price: Number(product.price || 0), sku: (product.sku || "SKU") + "-BLU-L", stock: 5 }
      ]
    });
    setActiveTab("general");
    setShowModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || formData.title.trim() === "") {
      setActiveTab("general");
      toast({ title: "প্রোডাক্টের নাম লিখুন", description: "Product Title দেওয়া বাধ্যতামূলক।", variant: "destructive" });
      return;
    }
    if (!formData.price || formData.price <= 0) {
      setActiveTab("pricing");
      toast({ title: "বিক্রয় মূল্য লিখুন", description: "Selling Price / MRP দেওয়া বাধ্যতামূলক।", variant: "destructive" });
      return;
    }

    try {
      const pId = isEditing && formData.id ? formData.id : "prod_" + Date.now();
      const imageArray = formData.images
        ? formData.images.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

      const productDoc = {
        id: pId,
        title: formData.title,
        name: formData.title,
        slug: formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        shortDescription: formData.shortDescription,
        short_description: formData.shortDescription,
        description: formData.description,
        category: formData.category,
        brand: formData.brand,
        price: Number(formData.price) || 0,
        regular_price: Number(formData.price) || 0,
        discountPrice: Number(formData.discountPrice) || 0,
        discount_price: Number(formData.discountPrice) || 0,
        costPrice: Number(formData.costPrice) || 0,
        cost_price: Number(formData.costPrice) || 0,
        stock: Number(formData.stock) || 0,
        stock_quantity: Number(formData.stock) || 0,
        minOrderQuantity: Number(formData.minOrderQuantity) || 1,
        maxOrderQuantity: Number(formData.maxOrderQuantity) || 100,
        sku: formData.sku || "SKU-" + Date.now(),
        barcode: formData.barcode || "BC-" + Math.floor(Math.random() * 10000000),
        images: imageArray,
        image_url: imageArray[0] || "",
        videoUrl: formData.videoUrl,
        weight: formData.weight,
        dimensions: formData.dimensions,
        shippingCost: Number(formData.shippingCost) || 0,
        freeShipping: formData.freeShipping,
        estimatedDelivery: formData.estimatedDelivery,
        countryOfOrigin: formData.countryOfOrigin,
        warrantyInfo: formData.warrantyInfo,
        returnPolicy: formData.returnPolicy,
        metaTitle: formData.metaTitle || formData.title,
        metaDescription: formData.metaDescription || formData.shortDescription,
        metaKeywords: formData.metaKeywords,
        isFeatured: formData.isFeatured,
        is_featured: formData.isFeatured,
        isBestSeller: formData.isBestSeller,
        is_best_seller: formData.isBestSeller,
        isNewArrival: formData.isNewArrival,
        is_new_arrival: formData.isNewArrival,
        isFlashSale: formData.isFlashSale,
        is_flash_sale: formData.isFlashSale,
        colors: formData.colors,
        sizes: formData.sizes,
        variants: formData.variants,
        status: "APPROVED",
        approvalStatus: "APPROVED",
        updatedAt: new Date().toISOString(),
        ...(isEditing ? {} : { createdAt: new Date().toISOString() })
      };

      // Instantly update local state & close modal for instant zero-latency save
      setProducts((prev) => {
        const idx = prev.findIndex((p) => p.id === pId);
        let updatedList: any[];
        if (idx >= 0) {
          updatedList = [...prev];
          updatedList[idx] = { ...updatedList[idx], ...productDoc };
        } else {
          updatedList = [productDoc, ...prev];
        }
        try {
          localStorage.setItem("enterprise_admin_products", JSON.stringify(updatedList));
        } catch {}
        return updatedList;
      });

      setShowModal(false);

      toast({
        title: isEditing ? "প্রোডাক্ট আপডেট সফল!" : "প্রোডাক্ট আপলোড সফল!",
        description: `${formData.title} সফলভাবে প্রোডাক্ট ক্যাটালগে সেভ করা হয়েছে।`
      });

      // Background non-blocking sync
      (async () => {
        try {
          if (isEditing) {
            await updateDoc(doc(db, "products", pId), productDoc);
          } else {
            await setDoc(doc(db, "products", pId), productDoc);
          }
        } catch (fsErr: any) {
          console.warn("Firestore sync warning:", fsErr);
        }

        try {
          await supabase.from("products").upsert({
            id: pId,
            name: formData.title,
            title: formData.title,
            slug: productDoc.slug,
            regular_price: Number(formData.price) || 0,
            discount_price: Number(formData.discountPrice) || 0,
            cost_price: Number(formData.costPrice) || 0,
            stock_quantity: Number(formData.stock) || 0,
            sku: productDoc.sku,
            barcode: productDoc.barcode,
            status: "APPROVED",
            is_featured: formData.isFeatured,
            created_at: new Date().toISOString()
          });
        } catch {}
      })();

    } catch (err: any) {
      console.error("Save product error:", err);
      toast({ title: "ত্রুটি", description: err?.message || "প্রোডাক্ট সেভ করতে সমস্যা হয়েছে", variant: "destructive" });
    }
  };


  const handleDeleteProduct = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিত যে এই প্রোডাক্টটি মুছে ফেলতে চান?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
      toast({ title: "প্রোডাক্ট মুছে ফেলা হয়েছে!" });
      loadProducts();
    } catch (err: any) {
      toast({ title: "মুছে ফেলা সম্ভব হয়নি", description: err.message, variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`আপনি কি চিহ্নিত ${selectedIds.length} টি প্রোডাক্ট মুছে ফেলতে চান?`)) return;
    try {
      for (const id of selectedIds) {
        await deleteDoc(doc(db, "products", id));
      }
      toast({ title: "বাল্ক ডিলেট সফল!", description: `${selectedIds.length} টি প্রোডাক্ট মুছে ফেলা হয়েছে।` });
      setSelectedIds([]);
      loadProducts();
    } catch (err: any) {
      toast({ title: "বাল্ক ডিলেট ব্যর্থ", description: err.message, variant: "destructive" });
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(products, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `products_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const addVariantRow = () => {
    setFormData({
      ...formData,
      variants: [
        ...formData.variants,
        { color: "Default", size: "Standard", price: Number(formData.price) || 0, sku: `${formData.sku}-V${formData.variants.length + 1}`, stock: 5 }
      ]
    });
  };

  const removeVariantRow = (index: number) => {
    setFormData({
      ...formData,
      variants: formData.variants.filter((_, i) => i !== index)
    });
  };

  const updateVariantRow = (index: number, field: keyof VariantItem, value: any) => {
    const updated = [...formData.variants];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, variants: updated });
  };

  const filtered = products.filter(
    (p) =>
      p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <EnterpriseAdminLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="h-6 w-6 text-orange-600" />
              Enterprise Product Catalog Manager
              <Badge className="bg-orange-500/10 border border-orange-500/30 text-orange-600 font-bold">
                PRO FEATURED
              </Badge>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              ভেরিয়েন্ট ম্যাট্রিক্স, বারকোড, এসইও মেটাডাটা, একাধিক ছবি ও ভিডিও সহ সম্পুর্ন ডিটেইলস প্রোডাক্ট ম্যানেজমেন্ট।
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button variant="outline" onClick={handleExportJSON} className="text-xs font-bold gap-1.5 border-slate-300">
              <Download className="h-4 w-4" /> Export JSON
            </Button>
            <Button onClick={handleOpenAddModal} className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs gap-2">
              <Plus className="h-4 w-4" /> নতুন প্রোডাক্ট যোগ করুন
            </Button>
          </div>
        </div>

        {/* SEARCH & BULK ACTIONS TOOLBAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="টাইটেল, SKU বা ক্যাটাগরি দিয়ে খুঁজুন..."
              className="pl-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800"
            />
          </div>

          {selectedIds.length > 0 && (
            <Button onClick={handleBulkDelete} variant="destructive" className="text-xs font-bold gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> সিলেক্টেড {selectedIds.length} টি ডিলেট করুন
            </Button>
          )}
        </div>

        {/* PRODUCTS TABLE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 w-10">Select</th>
                  <th className="p-3">Product Title & SKU</th>
                  <th className="p-3">Category / Brand</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Badges</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                      কোন প্রোডাক্ট রেকর্ড পাওয়া যায়নি
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(p.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds([...selectedIds, p.id]);
                            else setSelectedIds(selectedIds.filter((id) => id !== p.id));
                          }}
                          className="rounded border-slate-300 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 font-bold">
                        <div className="text-slate-900 dark:text-white text-xs">{p.title || p.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">SKU: {p.sku || p.id} | BC: {p.barcode || "N/A"}</div>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{p.category || "General"}</span>
                        <div className="text-[10px] text-slate-400">{p.brand || "Generic"}</div>
                      </td>
                      <td className="p-3 font-black text-slate-900 dark:text-white">
                        ৳{(p.price || p.regular_price || 0).toLocaleString("en-BD")}
                        {p.discountPrice > 0 && (
                          <div className="text-[10px] text-emerald-600 line-through">
                            ৳{Number(p.discountPrice).toLocaleString("en-BD")}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge className={`${(p.stock || p.stock_quantity || 0) < 5 ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600"} text-[10px]`}>
                          {p.stock || p.stock_quantity || 0} in stock
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {p.isFeatured && <Badge className="bg-purple-500/10 text-purple-600 text-[9px]">Featured</Badge>}
                          {p.isBestSeller && <Badge className="bg-amber-500/10 text-amber-600 text-[9px]">Best Seller</Badge>}
                          {p.isNewArrival && <Badge className="bg-blue-500/10 text-blue-600 text-[9px]">New</Badge>}
                          {p.isFlashSale && <Badge className="bg-rose-500/10 text-rose-600 text-[9px]">Flash Sale</Badge>}
                        </div>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenEditModal(p)} className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteProduct(p.id)} className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL: ULTRA-PROFESSIONAL ICON-FREE PRODUCT FORM */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-4xl rounded-xl p-6 space-y-6 shadow-2xl my-8 max-h-[92vh] flex flex-col">
              
              {/* MODAL HEADER */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    {isEditing ? "Edit Product Details" : "Add New Product"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configure specifications, inventory, media gallery, variants, and SEO meta information.
                  </p>
                </div>
                <button 
                  onClick={() => setShowModal(false)} 
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-semibold text-sm px-2 py-1 rounded transition"
                >
                  Close ✕
                </button>
              </div>

              {/* MODAL FORM WITH TABS */}
              <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto pr-1 space-y-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  
                  {/* TAB CONTROLS (PURE TEXT, ICON-FREE, PROFESSIONAL PILLS) */}
                  <TabsList className="grid grid-cols-3 sm:grid-cols-6 gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-lg h-auto mb-6">
                    <TabsTrigger 
                      value="general" 
                      className="text-xs font-semibold py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white rounded-md transition shadow-xs"
                    >
                      General
                    </TabsTrigger>
                    <TabsTrigger 
                      value="pricing" 
                      className="text-xs font-semibold py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white rounded-md transition shadow-xs"
                    >
                      Pricing & Stock
                    </TabsTrigger>
                    <TabsTrigger 
                      value="media" 
                      className="text-xs font-semibold py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white rounded-md transition shadow-xs"
                    >
                      Media & Gallery
                    </TabsTrigger>
                    <TabsTrigger 
                      value="variants" 
                      className="text-xs font-semibold py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white rounded-md transition shadow-xs"
                    >
                      Variants
                    </TabsTrigger>
                    <TabsTrigger 
                      value="shipping" 
                      className="text-xs font-semibold py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white rounded-md transition shadow-xs"
                    >
                      Shipping & Specs
                    </TabsTrigger>
                    <TabsTrigger 
                      value="seo" 
                      className="text-xs font-semibold py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white rounded-md transition shadow-xs"
                    >
                      SEO & Display
                    </TabsTrigger>
                  </TabsList>

                  {/* TAB 1: GENERAL INFO */}
                  <TabsContent value="general" className="space-y-4 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Product Title *</Label>
                        <Input 
                          required 
                          value={formData.title} 
                          onChange={(e) => setFormData({ ...formData, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") })} 
                          placeholder="e.g. Wireless Bluetooth Headphones" 
                          className="text-xs mt-1.5 h-9 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900" 
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Product Slug / URL Permalinks</Label>
                        <Input 
                          value={formData.slug} 
                          onChange={(e) => setFormData({ ...formData, slug: e.target.value })} 
                          placeholder="wireless-bluetooth-headphones" 
                          className="text-xs mt-1.5 h-9 font-mono bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Category</Label>
                        <Input 
                          value={formData.category} 
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })} 
                          placeholder="Electronics, Fashion, Mobile..." 
                          className="text-xs mt-1.5 h-9 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Brand</Label>
                        <Input 
                          value={formData.brand} 
                          onChange={(e) => setFormData({ ...formData, brand: e.target.value })} 
                          placeholder="Samsung, Sony, Generic..." 
                          className="text-xs mt-1.5 h-9 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Short Summary Description</Label>
                      <Input 
                        value={formData.shortDescription} 
                        onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })} 
                        placeholder="Brief 1-2 sentence overview of product key highlights" 
                        className="text-xs mt-1.5 h-9 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Full Comprehensive Description</Label>
                      <Textarea 
                        rows={5} 
                        value={formData.description} 
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                        placeholder="Detailed specifications, usage guide, features, and item info..." 
                        className="text-xs mt-1.5 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                      />
                    </div>
                  </TabsContent>

                  {/* TAB 2: PRICING & STOCK */}
                  <TabsContent value="pricing" className="space-y-4 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Selling Price / MRP (৳) *</Label>
                        <Input 
                          type="number" 
                          required 
                          value={formData.price === 0 ? "" : formData.price} 
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setFormData({ ...formData, price: parseNumberInput(e.target.value) })} 
                          placeholder="0"
                          className="text-xs mt-1.5 h-9 font-bold bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Discount Price (৳)</Label>
                        <Input 
                          type="number" 
                          value={formData.discountPrice === 0 ? "" : formData.discountPrice} 
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setFormData({ ...formData, discountPrice: parseNumberInput(e.target.value) })} 
                          className="text-xs mt-1.5 h-9 font-semibold bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                          placeholder="0" 
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Cost Price / Expense (৳)</Label>
                        <Input 
                          type="number" 
                          value={formData.costPrice === 0 ? "" : formData.costPrice} 
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setFormData({ ...formData, costPrice: parseNumberInput(e.target.value) })} 
                          className="text-xs mt-1.5 h-9 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                          placeholder="0" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Stock Inventory Quantity *</Label>
                        <Input 
                          type="number" 
                          required 
                          value={formData.stock === 0 ? "" : formData.stock} 
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setFormData({ ...formData, stock: parseNumberInput(e.target.value) })} 
                          placeholder="0"
                          className="text-xs mt-1.5 h-9 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Minimum Order Quantity</Label>
                        <Input 
                          type="number" 
                          value={formData.minOrderQuantity === 0 ? "" : formData.minOrderQuantity} 
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setFormData({ ...formData, minOrderQuantity: parseNumberInput(e.target.value) })} 
                          placeholder="1"
                          className="text-xs mt-1.5 h-9 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Maximum Order Quantity</Label>
                        <Input 
                          type="number" 
                          value={formData.maxOrderQuantity === 0 ? "" : formData.maxOrderQuantity} 
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setFormData({ ...formData, maxOrderQuantity: parseNumberInput(e.target.value) })} 
                          placeholder="100"
                          className="text-xs mt-1.5 h-9 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">SKU Code</Label>
                        <Input 
                          value={formData.sku} 
                          onChange={(e) => setFormData({ ...formData, sku: e.target.value })} 
                          className="text-xs mt-1.5 h-9 font-mono bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                          placeholder="SKU-10023" 
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Barcode Identifier</Label>
                        <Input 
                          value={formData.barcode} 
                          onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} 
                          className="text-xs mt-1.5 h-9 font-mono bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                          placeholder="BC-8839201" 
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* TAB 3: MEDIA & VIDEO */}
                  <TabsContent value="media" className="space-y-4 pt-1">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Product Image Gallery URLs (Comma Separated)
                      </Label>
                      <Textarea 
                        rows={3} 
                        value={formData.images} 
                        onChange={(e) => setFormData({ ...formData, images: e.target.value })} 
                        placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg, https://example.com/img3.jpg" 
                        className="text-xs mt-1.5 font-mono bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                      />
                      <p className="text-[11px] text-slate-400 mt-1">The first image URL will be designated as the primary cover photo.</p>
                    </div>

                    {/* LIVE IMAGE PREVIEWS */}
                    {formData.images && (
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Gallery Previews:</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.images.split(",").map((s) => s.trim()).filter(Boolean).map((url, idx) => (
                            <div key={idx} className="relative w-16 h-16 rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-950">
                              <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover" onError={(e) => { (e.target as any).src = "https://placehold.co/100x100?text=No+Img"; }} />
                              {idx === 0 && <span className="absolute top-0 left-0 bg-slate-900 text-white text-[8px] px-1 font-semibold">Cover</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Product Video URL (YouTube or MP4 Direct Link)
                      </Label>
                      <Input 
                        value={formData.videoUrl} 
                        onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })} 
                        placeholder="https://www.youtube.com/watch?v=..." 
                        className="text-xs mt-1.5 h-9 font-mono bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                      />
                    </div>
                  </TabsContent>

                  {/* TAB 4: VARIANTS */}
                  <TabsContent value="variants" className="space-y-4 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Available Colors (Comma Separated)</Label>
                        <Input 
                          value={formData.colors} 
                          onChange={(e) => setFormData({ ...formData, colors: e.target.value })} 
                          placeholder="Black, White, Blue, Red" 
                          className="text-xs mt-1.5 h-9 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Available Sizes (Comma Separated)</Label>
                        <Input 
                          value={formData.sizes} 
                          onChange={(e) => setFormData({ ...formData, sizes: e.target.value })} 
                          placeholder="S, M, L, XL, XXL" 
                          className="text-xs mt-1.5 h-9 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                        />
                      </div>
                    </div>

                    {/* CUSTOM VARIANT TABLE */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Custom Variations Matrix:</Label>
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="outline" 
                          onClick={addVariantRow} 
                          className="text-xs font-semibold h-8 border-slate-300 dark:border-slate-700"
                        >
                          + Add Variant Row
                        </Button>
                      </div>

                      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-800/80 font-semibold text-slate-700 dark:text-slate-300">
                            <tr>
                              <th className="p-2.5">Color</th>
                              <th className="p-2.5">Size</th>
                              <th className="p-2.5">Price (৳)</th>
                              <th className="p-2.5">SKU</th>
                              <th className="p-2.5">Stock</th>
                              <th className="p-2.5 text-right">Remove</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {formData.variants.map((v, i) => (
                              <tr key={i}>
                                <td className="p-2"><Input value={v.color} onChange={(e) => updateVariantRow(i, "color", e.target.value)} className="h-8 text-xs bg-slate-50 dark:bg-slate-950" /></td>
                                <td className="p-2"><Input value={v.size} onChange={(e) => updateVariantRow(i, "size", e.target.value)} className="h-8 text-xs bg-slate-50 dark:bg-slate-950" /></td>
                                <td className="p-2">
                                  <Input 
                                    type="number" 
                                    value={v.price === 0 ? "" : v.price} 
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => updateVariantRow(i, "price", parseNumberInput(e.target.value))} 
                                    placeholder="0"
                                    className="h-8 text-xs font-semibold bg-slate-50 dark:bg-slate-950" 
                                  />
                                </td>
                                <td className="p-2"><Input value={v.sku} onChange={(e) => updateVariantRow(i, "sku", e.target.value)} className="h-8 text-xs font-mono bg-slate-50 dark:bg-slate-950" /></td>
                                <td className="p-2">
                                  <Input 
                                    type="number" 
                                    value={v.stock === 0 ? "" : v.stock} 
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => updateVariantRow(i, "stock", parseNumberInput(e.target.value))} 
                                    placeholder="0"
                                    className="h-8 text-xs bg-slate-50 dark:bg-slate-950" 
                                  />
                                </td>
                                <td className="p-2 text-right">
                                  <button 
                                    type="button" 
                                    onClick={() => removeVariantRow(i)} 
                                    className="text-xs font-semibold text-rose-600 hover:text-rose-800 px-2 py-1 rounded"
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>

                  {/* TAB 5: SHIPPING & SPECS */}
                  <TabsContent value="shipping" className="space-y-4 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Weight (e.g. 0.5 kg)</Label>
                        <Input 
                          value={formData.weight} 
                          onChange={(e) => setFormData({ ...formData, weight: e.target.value })} 
                          placeholder="0.5 kg" 
                          className="text-xs mt-1.5 h-9 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Dimensions (e.g. 10 x 5 x 2 cm)</Label>
                        <Input 
                          value={formData.dimensions} 
                          onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })} 
                          placeholder="10 x 5 x 2 cm" 
                          className="text-xs mt-1.5 h-9 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Shipping Fee (৳)</Label>
                        <Input 
                          type="number" 
                          value={formData.shippingCost === 0 ? "" : formData.shippingCost} 
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setFormData({ ...formData, shippingCost: parseNumberInput(e.target.value) })} 
                          placeholder="0"
                          className="text-xs mt-1.5 h-9 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Estimated Delivery Time</Label>
                        <Input 
                          value={formData.estimatedDelivery} 
                          onChange={(e) => setFormData({ ...formData, estimatedDelivery: e.target.value })} 
                          placeholder="2-5 Business Days" 
                          className="text-xs mt-1.5 h-9 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Country of Origin</Label>
                        <Input 
                          value={formData.countryOfOrigin} 
                          onChange={(e) => setFormData({ ...formData, countryOfOrigin: e.target.value })} 
                          placeholder="Bangladesh, China..." 
                          className="text-xs mt-1.5 h-9 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950">
                      <div>
                        <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Free Shipping Option</Label>
                        <p className="text-[11px] text-slate-400">Offer free shipping on this specific product item</p>
                      </div>
                      <Switch checked={formData.freeShipping} onCheckedChange={(val) => setFormData({ ...formData, freeShipping: val })} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Warranty Policy Terms</Label>
                        <Input 
                          value={formData.warrantyInfo} 
                          onChange={(e) => setFormData({ ...formData, warrantyInfo: e.target.value })} 
                          placeholder="1 Year Official Brand Warranty" 
                          className="text-xs mt-1.5 h-9 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Return Policy Terms</Label>
                        <Input 
                          value={formData.returnPolicy} 
                          onChange={(e) => setFormData({ ...formData, returnPolicy: e.target.value })} 
                          placeholder="7 Days Easy Return Policy" 
                          className="text-xs mt-1.5 h-9 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* TAB 6: SEO & BADGES */}
                  <TabsContent value="seo" className="space-y-4 pt-1">
                    <div className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Meta Title (SEO Header Tag)</Label>
                        <Input 
                          value={formData.metaTitle} 
                          onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })} 
                          placeholder="Search Engine Result Display Title" 
                          className="text-xs mt-1.5 h-9 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Meta Description (SEO Snippet)</Label>
                        <Textarea 
                          rows={2} 
                          value={formData.metaDescription} 
                          onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })} 
                          placeholder="Search Result Snippet overview..." 
                          className="text-xs mt-1.5 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Meta Keywords</Label>
                        <Input 
                          value={formData.metaKeywords} 
                          onChange={(e) => setFormData({ ...formData, metaKeywords: e.target.value })} 
                          placeholder="headphones, bluetooth, audio" 
                          className="text-xs mt-1.5 h-9 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800" 
                        />
                      </div>
                    </div>

                    {/* PROMOTIONAL BADGES TOGGLES */}
                    <div>
                      <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Catalog Badges & Visibility Options:</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                        <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Featured Product</Label>
                          <Switch checked={formData.isFeatured} onCheckedChange={(val) => setFormData({ ...formData, isFeatured: val })} />
                        </div>
                        <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Best Seller</Label>
                          <Switch checked={formData.isBestSeller} onCheckedChange={(val) => setFormData({ ...formData, isBestSeller: val })} />
                        </div>
                        <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">New Arrival</Label>
                          <Switch checked={formData.isNewArrival} onCheckedChange={(val) => setFormData({ ...formData, isNewArrival: val })} />
                        </div>
                        <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Flash Sale Item</Label>
                          <Switch checked={formData.isFlashSale} onCheckedChange={(val) => setFormData({ ...formData, isFlashSale: val })} />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                </Tabs>

                {/* MODAL FOOTER */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    * Mandatory required fields
                  </div>
                  <div className="flex gap-2.5">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowModal(false)} 
                      className="text-xs font-semibold border-slate-300 dark:border-slate-700"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      onClick={handleSaveProduct}
                      className="bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs px-6"
                    >
                      {isEditing ? "Update Product" : "Save Product"}
                    </Button>
                  </div>
                </div>
              </form>

            </div>
          </div>
        )}
      </div>
    </EnterpriseAdminLayout>
  );
};
