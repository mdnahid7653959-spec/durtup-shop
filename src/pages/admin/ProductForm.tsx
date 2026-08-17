import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Save, ArrowLeft, Palette, Loader2, Package, Image as ImageIcon, Video } from "lucide-react";
import { supabase } from "@/lib/firebaseAdapter";
import { adminDb } from "@/lib/adminDb";
import { db } from "@/integrations/firebase/client";
import { doc, setDoc, collection, getDocs } from "firebase/firestore";
import { AdminLayout } from "@/components/admin/AdminLayout";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { ProductImageUploader } from "@/components/admin/ProductImageUploader";
import { ProductVideoUploader } from "@/components/admin/ProductVideoUploader";
import { smartSearchService } from "@/services/search/SmartSearchService";

interface ProductForm {
  name: string;
  slug: string;
  short_description: string;
  description: string;
  sku: string;
  regular_price: string;
  discount_price: string;
  cost_price: string;
  stock_quantity: string;
  min_order_quantity: string;
  max_order_quantity: string;
  weight: string;
  dimensions: string;
  shipping_cost: string;
  free_shipping: boolean;
  estimated_delivery: string;
  status: string;
  is_featured: boolean;
  is_best_seller: boolean;
  is_new_arrival: boolean;
  is_flash_sale: boolean;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  warranty_info: string;
  return_policy: string;
  product_condition: string;
  country_of_origin: string;
  color: string;
  video_url: string;
  category_id: string;
  brand_id: string;
  rating_average: string;
  rating_count: string;
  sold_count: string;
}

interface ProductImage {
  id: string;
  url: string;
  file?: File;
  isNew?: boolean;
  isPrimary?: boolean;
}

interface ProductVideo {
  type: 'file' | 'youtube';
  url: string;
  file?: File;
  isNew?: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
}

const initialForm: ProductForm = {
  name: "",
  slug: "",
  short_description: "",
  description: "",
  sku: "",
  regular_price: "",
  discount_price: "",
  cost_price: "",
  stock_quantity: "0",
  min_order_quantity: "1",
  max_order_quantity: "",
  weight: "",
  dimensions: "",
  shipping_cost: "0",
  free_shipping: false,
  estimated_delivery: "",
  status: "active",
  is_featured: false,
  is_best_seller: false,
  is_new_arrival: true,
  is_flash_sale: false,
  meta_title: "",
  meta_description: "",
  meta_keywords: "",
  warranty_info: "",
  return_policy: "",
  product_condition: "new",
  country_of_origin: "",
  color: "",
  video_url: "",
  category_id: "",
  brand_id: "",
  rating_average: "0",
  rating_count: "0",
  sold_count: "0",
};

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
const defaultCategories: Category[] = [
  { id: "electronics", name: "Electronics & Gadgets" },
  { id: "fashion", name: "Fashion" },
  { id: "mens-fashion", name: "Men's Fashion" },
  { id: "womens-fashion", name: "Women's Fashion" },
  { id: "home-garden", name: "Home & Garden" },
  { id: "home-lifestyle", name: "Home & Lifestyle" },
  { id: "sports", name: "Sports & Outdoor" },
  { id: "toys-hobbies", name: "Toys & Hobbies" },
  { id: "beauty-health", name: "Beauty & Health" },
  { id: "automotive", name: "Automotive" },
  { id: "jewelry", name: "Jewelry & Accessories" },
  { id: "watch", name: "Watches" },
  { id: "winter", name: "Winter Collection" },
  { id: "kids-zone", name: "Kids Zone" },
  { id: "foods", name: "Foods & Grocery" },
];


const defaultBrands: Brand[] = [
  { id: "brand-apple", name: "Apple" },
  { id: "brand-samsung", name: "Samsung" },
  { id: "brand-xiaomi", name: "Xiaomi" },
  { id: "brand-realme", name: "Realme" },
  { id: "brand-sony", name: "Sony" },
  { id: "brand-mohasagor", name: "Mohasagor" },
  { id: "brand-generic", name: "Generic / Unbranded" },
];

  const { admin } = useAdminAuth();
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [brands, setBrands] = useState<Brand[]>(defaultBrands);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [video, setVideo] = useState<ProductVideo | null>(null);
  const isEdit = !!id;

  useEffect(() => {
    fetchCategories();
    fetchBrands();
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const { data } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");
      if (data && data.length > 0) {
        const merged = [...data];
        defaultCategories.forEach(def => {
          if (!merged.some(c => c.name.toLowerCase() === def.name.toLowerCase())) {
            merged.push(def);
          }
        });
        setCategories(merged);
        return;
      }
    } catch {}

    try {
      const snap = await getDocs(collection(db, "categories"));
      const fsList: Category[] = [];
      snap.forEach((d) => {
        const cData = d.data();
        if (cData.name) {
          fsList.push({ id: d.id, name: cData.name });
        }
      });
      if (fsList.length > 0) {
        const merged = [...fsList];
        defaultCategories.forEach(def => {
          if (!merged.some(c => c.name.toLowerCase() === def.name.toLowerCase())) {
            merged.push(def);
          }
        });
        setCategories(merged);
        return;
      }
    } catch {}

    setCategories(defaultCategories);
  };

  const fetchBrands = async () => {
    try {
      const { data } = await supabase
        .from("brands")
        .select("id, name")
        .order("name");
      if (data && data.length > 0) {
        const merged = [...data];
        defaultBrands.forEach(def => {
          if (!merged.some(b => b.name.toLowerCase() === def.name.toLowerCase())) {
            merged.push(def);
          }
        });
        setBrands(merged);
        return;
      }
    } catch {}

    try {
      const snap = await getDocs(collection(db, "brands"));
      const fsList: Brand[] = [];
      snap.forEach((d) => {
        const bData = d.data();
        if (bData.name) {
          fsList.push({ id: d.id, name: bData.name });
        }
      });
      if (fsList.length > 0) {
        const merged = [...fsList];
        defaultBrands.forEach(def => {
          if (!merged.some(b => b.name.toLowerCase() === def.name.toLowerCase())) {
            merged.push(def);
          }
        });
        setBrands(merged);
        return;
      }
    } catch {}

    setBrands(defaultBrands);
  };


  const fetchProduct = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*, product_images(*)")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch product"
      });
      navigate("/admin/products");
    } else if (!data) {
      toast({ variant: "destructive", title: "Not found", description: "Product not found" });
      navigate("/admin/products");
    } else if (data) {

      setForm({
        name: data.name || "",
        slug: data.slug || "",
        short_description: data.short_description || "",
        description: data.description || "",
        sku: data.sku || "",
        regular_price: data.regular_price?.toString() || "",
        discount_price: data.discount_price?.toString() || "",
        cost_price: data.cost_price?.toString() || "",
        stock_quantity: data.stock_quantity?.toString() || "0",
        min_order_quantity: data.min_order_quantity?.toString() || "1",
        max_order_quantity: data.max_order_quantity?.toString() || "",
        weight: data.weight?.toString() || "",
        dimensions: data.dimensions || "",
        shipping_cost: data.shipping_cost?.toString() || "0",
        free_shipping: data.free_shipping || false,
        estimated_delivery: data.estimated_delivery || "",
        status: data.status || "draft",
        is_featured: data.is_featured || false,
        is_best_seller: data.is_best_seller || false,
        is_new_arrival: data.is_new_arrival || false,
        is_flash_sale: data.is_flash_sale || false,
        meta_title: data.meta_title || "",
        meta_description: data.meta_description || "",
        meta_keywords: data.meta_keywords || "",
        warranty_info: data.warranty_info || "",
        return_policy: data.return_policy || "",
        product_condition: data.product_condition || "new",
        country_of_origin: data.country_of_origin || "",
        color: data.color || "",
        video_url: data.video_url || "",
        category_id: data.category_id || "",
        brand_id: data.brand_id || "",
        rating_average: data.rating_average?.toString() || "0",
        rating_count: data.rating_count?.toString() || "0",
        sold_count: data.sold_count?.toString() || "0",
      });

      // Load existing images
      if (data.product_images && data.product_images.length > 0) {
        const loadedImages = data.product_images
          .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
          .map((img: any) => ({
            id: img.id,
            url: img.image_url,
            isPrimary: img.is_primary,
            isNew: false,
          }));
        setImages(loadedImages);
      }

      // Load video if exists
      if (data.video_url) {
        setVideo({
          type: 'youtube',
          url: data.video_url,
        });
      }
    }
    setLoading(false);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (name: string) => {
    setForm({
      ...form,
      name,
      slug: form.slug || generateSlug(name),
    });
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  };

  const uploadNewImages = async (productId: string) => {
    const uploadedImages: ProductImage[] = [];
    
    for (const image of images) {
      if (image.isNew && image.file) {
        setUploading(true);
        let finalUrl = "";

        try {
          const fileExt = image.file.name.split('.').pop();
          const filePath = `${productId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const { error: uploadErr } = await supabase.storage
            .from("product-media")
            .upload(filePath, image.file);

          if (!uploadErr) {
            const { data: publicUrlData } = supabase.storage
              .from("product-media")
              .getPublicUrl(filePath);
            finalUrl = publicUrlData.publicUrl;
          } else {
            console.warn("Storage upload warning, using data URL fallback:", uploadErr.message);
            finalUrl = await fileToDataUrl(image.file);
          }
        } catch (directErr: any) {
          console.warn("Direct upload exception, using data URL fallback:", directErr);
          finalUrl = await fileToDataUrl(image.file);
        }

        if ((!finalUrl || (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://") && !finalUrl.startsWith("data:") && !finalUrl.startsWith("blob:"))) && image.file) {
          finalUrl = await fileToDataUrl(image.file);
        }

        uploadedImages.push({
          ...image,
          url: finalUrl || image.url,
          isNew: false,
        });
      } else {
        uploadedImages.push(image);
      }
    }
    
    setUploading(false);
    return uploadedImages.filter(img => img.url);
  };

  const saveProductImages = async (productId: string, imagesToSave: ProductImage[]) => {
    try {
      await adminDb.remove("product_images", { filters: [{ col: "product_id", value: productId }] });
      const rowsToInsert = imagesToSave.map((img, idx) => ({
        product_id: productId,
        image_url: img.url,
        is_primary: img.isPrimary,
        sort_order: idx
      }));
      const { error: insertErr } = await adminDb.insert("product_images", rowsToInsert);
      if (insertErr) {
        console.error("Direct insert product_images error:", insertErr);
        toast({
          variant: "destructive",
          title: "Database Error",
          description: `Failed to link images to product: ${insertErr.message || 'Row Level Security policy blocked insert'}`
        });
      }
    } catch (dbErr: any) {
      console.error("Save product_images DB error:", dbErr);
      toast({
        variant: "destructive",
        title: "Database Error",
        description: `Failed to save product images: ${dbErr.message || dbErr}`
      });
    }
  };

  const uploadVideoFile = async (productId: string, file: File) => {
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${productId}/video_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage
        .from("product-media")
        .upload(filePath, file);

      if (!uploadErr) {
        const { data: publicUrlData } = supabase.storage
          .from("product-media")
          .getPublicUrl(filePath);
        setUploading(false);
        return publicUrlData.publicUrl;
      } else {
        console.error("Direct video upload error:", uploadErr);
        toast({
          variant: "destructive",
          title: "Upload Error",
          description: `Failed to upload video: ${uploadErr.message}`
        });
      }
    } catch (directErr: any) {
      console.error("Direct video upload exception:", directErr);
      toast({
        variant: "destructive",
        title: "Upload Error",
        description: `Error uploading video: ${directErr.message || directErr}`
      });
    }
    setUploading(false);
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!admin?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Admin session not found. Please login again."
      });
      return;
    }

    if (!form.name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Product name is required"
      });
      return;
    }

    if (!form.regular_price || parseFloat(form.regular_price) <= 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Regular price must be greater than 0"
      });
      return;
    }

    if (parseInt(form.stock_quantity || "0", 10) < 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Stock quantity cannot be negative"
      });
      return;
    }

    if (form.discount_price && parseFloat(form.discount_price) >= parseFloat(form.regular_price)) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Discount price must be less than regular price"
      });
      return;
    }
    
    setSaving(true);

    const finalId = isEdit && id ? id : "prod_" + Date.now();
    
    // Process and upload/convert new images first to obtain permanent URLs
    let uploadedImages: ProductImage[] = [];
    try {
      uploadedImages = await uploadNewImages(finalId);
    } catch (e) {
      console.warn("Image upload process warning:", e);
      uploadedImages = images;
    }

    const primaryImageUrl = uploadedImages.find(img => img.isPrimary)?.url || uploadedImages[0]?.url || "";
    const imageUrls = uploadedImages.map(i => i.url).filter(Boolean);
    const selectedCatObj = categories.find(c => c.id === form.category_id);
    const catName = selectedCatObj?.name || form.category_id || "";
    const catSlug = form.category_id || selectedCatObj?.id || "";

    const productData = {
      name: form.name.trim(),
      slug: form.slug || generateSlug(form.name),
      short_description: form.short_description || null,
      description: form.description || null,
      sku: form.sku || null,
      regular_price: parseFloat(form.regular_price) || 0,
      discount_price: form.discount_price ? parseFloat(form.discount_price) : null,
      cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      min_order_quantity: parseInt(form.min_order_quantity) || 1,
      max_order_quantity: form.max_order_quantity ? parseInt(form.max_order_quantity) : null,
      weight: form.weight ? parseFloat(form.weight) : null,
      dimensions: form.dimensions || null,
      shipping_cost: parseFloat(form.shipping_cost) || 0,
      free_shipping: form.free_shipping,
      estimated_delivery: form.estimated_delivery || null,
      status: form.status || "active",
      is_featured: form.is_featured,
      is_best_seller: form.is_best_seller,
      is_new_arrival: form.is_new_arrival,
      is_flash_sale: form.is_flash_sale,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      meta_keywords: form.meta_keywords || null,
      warranty_info: form.warranty_info || null,
      return_policy: form.return_policy || null,
      product_condition: form.product_condition,
      country_of_origin: form.country_of_origin || null,
      color: form.color || null,
      video_url: video?.type === 'youtube' ? video.url : (form.video_url || null),
      category_id: form.category_id || catSlug || null,
      brand_id: form.brand_id || null,
      rating_average: parseFloat(form.rating_average) || 4.8,
      rating_count: parseInt(form.rating_count) || 15,
      sold_count: parseInt(form.sold_count) || 40,
    };

    const firestoreDoc = {
      id: finalId,
      title: productData.name,
      name: productData.name,
      slug: productData.slug,
      category: catName,
      category_id: form.category_id || catSlug,
      category_name: catName,
      category_slug: catSlug,
      shortDescription: productData.short_description,
      short_description: productData.short_description,
      description: productData.description,
      price: productData.regular_price,
      regular_price: productData.regular_price,
      discountPrice: productData.discount_price,
      discount_price: productData.discount_price,
      costPrice: productData.cost_price,
      cost_price: productData.cost_price,
      stock: productData.stock_quantity,
      stock_quantity: productData.stock_quantity,
      sku: productData.sku,
      image_url: primaryImageUrl,
      image: primaryImageUrl,
      images: imageUrls,
      product_images: uploadedImages.map((img, idx) => ({ id: `img-${idx}`, image_url: img.url, is_primary: img.isPrimary, sort_order: idx })),
      status: "APPROVED",
      approvalStatus: "APPROVED",
      isFeatured: productData.is_featured,
      is_featured: productData.is_featured,
      isBestSeller: productData.is_best_seller,
      is_best_seller: productData.is_best_seller,
      isNewArrival: productData.is_new_arrival,
      is_new_arrival: productData.is_new_arrival,
      isFlashSale: productData.is_flash_sale,
      is_flash_sale: productData.is_flash_sale,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    // 1. Instant Local Storage Update
    try {
      const rawLocal = localStorage.getItem("enterprise_admin_products") || localStorage.getItem("local_products") || "[]";
      const localList = JSON.parse(rawLocal);
      const idx = localList.findIndex((p: any) => p.id === finalId);
      if (idx >= 0) {
        localList[idx] = { ...localList[idx], ...firestoreDoc };
      } else {
        localList.unshift(firestoreDoc);
      }
      localStorage.setItem("enterprise_admin_products", JSON.stringify(localList));
      localStorage.setItem("local_products", JSON.stringify(localList));
    } catch (e) {
      console.warn("Local storage write warning:", e);
    }

    // 2. Instant Firestore Sync
    setDoc(doc(db, "products", finalId), firestoreDoc, { merge: true }).catch((e) => {
      console.warn("Firestore sync warning:", e);
    });

    // 3. Background Supabase DB Sync
    (async () => {
      try {
        if (isEdit && id) {
          const { error: dbErr } = await supabase.from("products").update(productData).eq("id", id);
          if (dbErr) await adminDb.update("products", productData, { id });
        } else {
          const { error: dbErr } = await supabase.from("products").insert([{ id: finalId, ...productData }]);
          if (dbErr) await adminDb.insert("products", { id: finalId, ...productData });
        }

        if (uploadedImages.length > 0) {
          await saveProductImages(finalId, uploadedImages);
        }
      } catch (bgErr) {
        console.warn("Background DB sync finished with warning:", bgErr);
      }
    })();

    // 4. Invalidate and rebuild search index in real-time
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("admin_products_updated"));
    }
    smartSearchService.buildIndex().catch(() => {});

    toast({ 
      title: "Success",
      description: `Product ${isEdit ? "updated" : "created"} successfully` 
    });

    setSaving(false);
    navigate("/admin/products");
  };



  if (loading) {
    return (
      <AdminLayout title={isEdit ? "Edit Product" : "New Product"}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={isEdit ? "Edit Product" : "New Product"}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Button type="button" variant="ghost" onClick={() => navigate("/admin/products")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              type="submit" 
              disabled={saving || uploading} 
              className="flex-1 sm:flex-none"
            >
              {(saving || uploading) ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {uploading ? "Uploading..." : saving ? "Saving..." : "Save Product"}
            </Button>
          </div>
        </div>

        {/* Tabs for Mobile */}
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="w-full flex flex-wrap h-auto gap-1">
            <TabsTrigger value="basic" className="flex-1 min-w-[80px] gap-1">
              <Package className="h-4 w-4 hidden sm:block" />
              Basic
            </TabsTrigger>
            <TabsTrigger value="media" className="flex-1 min-w-[80px] gap-1">
              <ImageIcon className="h-4 w-4 hidden sm:block" />
              Media
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex-1 min-w-[80px] gap-1">
              Pricing
            </TabsTrigger>
            <TabsTrigger value="shipping" className="flex-1 min-w-[80px] gap-1">
              Shipping
            </TabsTrigger>
            <TabsTrigger value="seo" className="flex-1 min-w-[80px] gap-1">
              SEO
            </TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="name">Product Name *</Label>
                        <Input
                          id="name"
                          value={form.name}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder="Enter product name"
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="slug">URL Slug</Label>
                        <Input
                          id="slug"
                          value={form.slug}
                          onChange={(e) => setForm({ ...form, slug: e.target.value })}
                          placeholder="product-url-slug"
                          className="mt-1"
                        />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Select 
                            value={form.category_id} 
                            onValueChange={(v) => setForm({ ...form, category_id: v })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="brand">Brand</Label>
                          <Select 
                            value={form.brand_id} 
                            onValueChange={(v) => setForm({ ...form, brand_id: v })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select brand" />
                            </SelectTrigger>
                            <SelectContent>
                              {brands.map((brand) => (
                                <SelectItem key={brand.id} value={brand.id}>
                                  {brand.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="short_description">Short Description</Label>
                        <Textarea
                          id="short_description"
                          value={form.short_description}
                          onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                          placeholder="Brief product description"
                          rows={2}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Full Description</Label>
                        <Textarea
                          id="description"
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          placeholder="Detailed product description"
                          rows={5}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="sku">SKU</Label>
                        <Input
                          id="sku"
                          value={form.sku}
                          onChange={(e) => setForm({ ...form, sku: e.target.value })}
                          placeholder="Product SKU"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Product Status</Label>
                      <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Condition</Label>
                      <Select value={form.product_condition} onValueChange={(v) => setForm({ ...form, product_condition: v })}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="used">Used</SelectItem>
                          <SelectItem value="refurbished">Refurbished</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="color" className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Product Color
                      </Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          id="color"
                          type="color"
                          value={form.color || "#000000"}
                          onChange={(e) => setForm({ ...form, color: e.target.value })}
                          className="w-14 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={form.color}
                          onChange={(e) => setForm({ ...form, color: e.target.value })}
                          placeholder="#000000"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Visibility</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="is_featured">Featured Product</Label>
                      <Switch
                        id="is_featured"
                        checked={form.is_featured}
                        onCheckedChange={(c) => setForm({ ...form, is_featured: c })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="is_best_seller">Best Seller</Label>
                      <Switch
                        id="is_best_seller"
                        checked={form.is_best_seller}
                        onCheckedChange={(c) => setForm({ ...form, is_best_seller: c })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="is_new_arrival">New Arrival</Label>
                      <Switch
                        id="is_new_arrival"
                        checked={form.is_new_arrival}
                        onCheckedChange={(c) => setForm({ ...form, is_new_arrival: c })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="is_flash_sale">Flash Sale</Label>
                      <Switch
                        id="is_flash_sale"
                        checked={form.is_flash_sale}
                        onCheckedChange={(c) => setForm({ ...form, is_flash_sale: c })}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="rating_average">Rating Average (0-5)</Label>
                      <Input
                        id="rating_average"
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={form.rating_average}
                        onChange={(e) => setForm({ ...form, rating_average: e.target.value })}
                        placeholder="0"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rating_count">Total Reviews</Label>
                      <Input
                        id="rating_count"
                        type="number"
                        min="0"
                        value={form.rating_count}
                        onChange={(e) => setForm({ ...form, rating_count: e.target.value })}
                        placeholder="0"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sold_count">Sold Count</Label>
                      <Input
                        id="sold_count"
                        type="number"
                        min="0"
                        value={form.sold_count}
                        onChange={(e) => setForm({ ...form, sold_count: e.target.value })}
                        placeholder="0"
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        This updates automatically when orders are placed
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Media Tab - Images & Video */}
          <TabsContent value="media" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Product Images
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ProductImageUploader
                    images={images}
                    onImagesChange={setImages}
                    maxImages={10}
                    disabled={saving || uploading}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Product Video
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ProductVideoUploader
                    video={video}
                    onVideoChange={setVideo}
                    disabled={saving || uploading}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pricing & Inventory</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="regular_price">Regular Price *</Label>
                    <Input
                      id="regular_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.regular_price}
                      onChange={(e) => setForm({ ...form, regular_price: e.target.value })}
                      placeholder="0.00"
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="discount_price">Sale Price</Label>
                    <Input
                      id="discount_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.discount_price}
                      onChange={(e) => setForm({ ...form, discount_price: e.target.value })}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cost_price">Cost Price</Label>
                    <Input
                      id="cost_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.cost_price}
                      onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="stock_quantity">Stock Quantity</Label>
                    <Input
                      id="stock_quantity"
                      type="number"
                      min="0"
                      value={form.stock_quantity}
                      onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="min_order_quantity">Min Order Qty</Label>
                    <Input
                      id="min_order_quantity"
                      type="number"
                      min="1"
                      value={form.min_order_quantity}
                      onChange={(e) => setForm({ ...form, min_order_quantity: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_order_quantity">Max Order Qty</Label>
                    <Input
                      id="max_order_quantity"
                      type="number"
                      min="1"
                      value={form.max_order_quantity}
                      onChange={(e) => setForm({ ...form, max_order_quantity: e.target.value })}
                      placeholder="No limit"
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Policy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="warranty_info">Warranty Info</Label>
                  <Textarea
                    id="warranty_info"
                    value={form.warranty_info}
                    onChange={(e) => setForm({ ...form, warranty_info: e.target.value })}
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="return_policy">Return Policy</Label>
                  <Textarea
                    id="return_policy"
                    value={form.return_policy}
                    onChange={(e) => setForm({ ...form, return_policy: e.target.value })}
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="country_of_origin">Country of Origin</Label>
                  <Input
                    id="country_of_origin"
                    value={form.country_of_origin}
                    onChange={(e) => setForm({ ...form, country_of_origin: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shipping Tab */}
          <TabsContent value="shipping" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Shipping</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.weight}
                      onChange={(e) => setForm({ ...form, weight: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dimensions">Dimensions</Label>
                    <Input
                      id="dimensions"
                      value={form.dimensions}
                      onChange={(e) => setForm({ ...form, dimensions: e.target.value })}
                      placeholder="L x W x H"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shipping_cost">Shipping Cost</Label>
                    <Input
                      id="shipping_cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.shipping_cost}
                      onChange={(e) => setForm({ ...form, shipping_cost: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="free_shipping"
                    checked={form.free_shipping}
                    onCheckedChange={(checked) => setForm({ ...form, free_shipping: checked })}
                  />
                  <Label htmlFor="free_shipping">Free Shipping</Label>
                </div>
                <div>
                  <Label htmlFor="estimated_delivery">Estimated Delivery</Label>
                  <Input
                    id="estimated_delivery"
                    value={form.estimated_delivery}
                    onChange={(e) => setForm({ ...form, estimated_delivery: e.target.value })}
                    placeholder="e.g., 3-5 business days"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEO Tab */}
          <TabsContent value="seo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>SEO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="meta_title">Meta Title</Label>
                  <Input
                    id="meta_title"
                    value={form.meta_title}
                    onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
                    placeholder="SEO title"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {form.meta_title.length}/60 characters
                  </p>
                </div>
                <div>
                  <Label htmlFor="meta_description">Meta Description</Label>
                  <Textarea
                    id="meta_description"
                    value={form.meta_description}
                    onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
                    placeholder="SEO description"
                    rows={2}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {form.meta_description.length}/160 characters
                  </p>
                </div>
                <div>
                  <Label htmlFor="meta_keywords">Meta Keywords</Label>
                  <Input
                    id="meta_keywords"
                    value={form.meta_keywords}
                    onChange={(e) => setForm({ ...form, meta_keywords: e.target.value })}
                    placeholder="keyword1, keyword2, keyword3"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </AdminLayout>
  );
}
