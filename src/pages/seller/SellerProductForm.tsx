import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  Save, ArrowLeft, Loader2, Package, Image as ImageIcon, 
  DollarSign, Truck, Search, RotateCcw, Layers, Tag, Plus,
  Info, Sparkles, Shield, Globe, Palette, Scale, Ruler, Video
} from "lucide-react";
import { supabase } from "@/lib/firebaseAdapter";
import { ProductImageUploader } from "@/components/admin/ProductImageUploader";

import { SellerLayout } from "@/components/seller/SellerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface ProductForm {
  // Basic Info
  name: string;
  slug: string;
  short_description: string;
  description: string;
  
  // Category
  category_id: string;
  brand_id: string;
  
  // Pricing & Stock
  regular_price: string;
  discount_price: string;
  discount_percent: string;
  stock_quantity: string;
  sku: string;
  min_order_quantity: string;
  max_order_quantity: string;
  
  // Specifications
  color: string;
  size: string;
  weight: string;
  material: string;
  dimensions: string;
  warranty_info: string;
  product_condition: string;
  country_of_origin: string;
  
  // Shipping
  shipping_cost: string;
  free_shipping: boolean;
  estimated_delivery: string;
  shipping_class: string;
  package_weight: string;
  package_dimensions: string;
  
  // SEO
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  is_searchable: boolean;
  
  // Return Policy
  return_eligible: boolean;
  return_days: string;
  return_policy: string;
  
  // Media
  video_url: string;
  
  // Tags
  tags: string[];
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

interface Brand {
  id: string;
  name: string;
}

interface ProductImage {
  id: string;
  url: string;
  file?: File;
  isNew?: boolean;
  isPrimary?: boolean;
}


const initialForm: ProductForm = {
  name: "",
  slug: "",
  short_description: "",
  description: "",
  category_id: "",
  brand_id: "",
  regular_price: "",
  discount_price: "",
  discount_percent: "",
  stock_quantity: "0",
  sku: "",
  min_order_quantity: "1",
  max_order_quantity: "",
  color: "",
  size: "",
  weight: "",
  material: "",
  dimensions: "",
  warranty_info: "",
  product_condition: "new",
  country_of_origin: "Bangladesh",
  shipping_cost: "0",
  free_shipping: false,
  estimated_delivery: "3-5 business days",
  shipping_class: "standard",
  package_weight: "",
  package_dimensions: "",
  meta_title: "",
  meta_description: "",
  meta_keywords: "",
  is_searchable: true,
  return_eligible: true,
  return_days: "7",
  return_policy: "",
  video_url: "",
  tags: [],
};

export default function SellerProductForm() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  
  const [uploading, setUploading] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [activeTab, setActiveTab] = useState("basic");
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [creatingBrand, setCreatingBrand] = useState(false);
  const isEdit = !!id;

  const handleCreateBrand = async () => {
    const name = newBrandName.trim();
    if (!name) {
      toast({ title: "Brand name required", variant: "destructive" });
      return;
    }
    if (!user) return;
    setCreatingBrand(true);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 6);
    const { data, error } = await supabase
      .from("brands")
      .insert({ name, slug, is_active: true, created_by: user.id })
      .select("id, name")
      .single();
    setCreatingBrand(false);
    if (error || !data) {
      toast({ title: "Failed to create brand", description: error?.message, variant: "destructive" });
      return;
    }
    setBrands((prev) => [...prev, { id: data.id, name: data.name }].sort((a, b) => a.name.localeCompare(b.name)));
    setForm((prev) => ({ ...prev, brand_id: data.id }));
    setNewBrandName("");
    setBrandDialogOpen(false);
    toast({ title: "Brand created", description: `"${data.name}" added.` });
  };

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    checkSellerAndLoad();
  }, [user, navigate, id]);

  const checkSellerAndLoad = async () => {
    if (!user) return;

    const { data: seller, error: sellerError } = await supabase
      .from("sellers")
      .select("id, status")
      .eq("user_id", user.id)
      .single();

    if (sellerError || !seller) {
      navigate("/seller/register");
      return;
    }

    if (seller.status !== "approved") {
      navigate("/seller/pending");
      return;
    }

    setSellerId(seller.id);
    fetchCategories();
    fetchBrands();

    if (id) {
      fetchProduct(seller.id);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("id, name, parent_id")
      .eq("is_active", true)
      .order("name");
    if (data) setCategories(data);
  };

  const fetchBrands = async () => {
    const { data } = await supabase
      .from("brands")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    if (data) setBrands(data);
  };

  const fetchProduct = async (sellerIdParam: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*, product_images(*)")
      .eq("id", id)
      .eq("seller_id", sellerIdParam)
      .single();

    if (error || !data) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Product not found or you don't have access"
      });
      navigate("/seller/products");
      return;
    }

    setForm({
      name: data.name || "",
      slug: data.slug || "",
      short_description: data.short_description || "",
      description: data.description || "",
      category_id: data.category_id || "",
      brand_id: data.brand_id || "",
      regular_price: data.regular_price?.toString() || "",
      discount_price: data.discount_price?.toString() || "",
      discount_percent: "",
      stock_quantity: data.stock_quantity?.toString() || "0",
      sku: data.sku || "",
      min_order_quantity: data.min_order_quantity?.toString() || "1",
      max_order_quantity: data.max_order_quantity?.toString() || "",
      color: data.color || "",
      size: "",
      weight: data.weight?.toString() || "",
      material: "",
      dimensions: data.dimensions || "",
      warranty_info: data.warranty_info || "",
      product_condition: data.product_condition || "new",
      country_of_origin: data.country_of_origin || "Bangladesh",
      shipping_cost: data.shipping_cost?.toString() || "0",
      free_shipping: data.free_shipping || false,
      estimated_delivery: data.estimated_delivery || "3-5 business days",
      shipping_class: "standard",
      package_weight: "",
      package_dimensions: "",
      meta_title: data.meta_title || "",
      meta_description: data.meta_description || "",
      meta_keywords: data.meta_keywords || "",
      is_searchable: true,
      return_eligible: true,
      return_days: "7",
      return_policy: data.return_policy || "",
      video_url: data.video_url || "",
      tags: data.tags || [],
    });

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
      meta_title: form.meta_title || name,
    });
  };

  const calculateDiscountPercent = () => {
    if (form.regular_price && form.discount_price) {
      const regular = parseFloat(form.regular_price);
      const discount = parseFloat(form.discount_price);
      if (regular > 0 && discount > 0 && discount < regular) {
        const percent = Math.round(((regular - discount) / regular) * 100);
        setForm({ ...form, discount_percent: percent.toString() });
      }
    }
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  };

  // Upload new images to storage via seller-media edge function
  const uploadNewImages = async (): Promise<ProductImage[]> => {
    const uploadedImages: ProductImage[] = [];
    
    for (const image of images) {
      if (image.isNew && image.file) {
        let finalUrl = "";
        try {
          const formData = new FormData();
          formData.append("action", "upload");
          formData.append("file", image.file);
          formData.append("productId", isEdit ? id! : "temp");
          formData.append("mediaType", "image");

          const { data, error } = await supabase.functions.invoke("seller-media", {
            body: formData,
          });

          if (!error && data?.url) {
            finalUrl = data.url;
          }
        } catch (err) {
          console.error("Upload exception:", err);
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
    
    return uploadedImages.filter(img => img.url);
  };

  const addTag = () => {
    if (newTag.trim() && !form.tags.includes(newTag.trim())) {
      setForm({ ...form, tags: [...form.tags, newTag.trim()] });
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setForm({ ...form, tags: form.tags.filter(t => t !== tag) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sellerId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Seller session not found. Please login again."
      });
      return;
    }

    if (!form.name.trim()) {
      setActiveTab("basic");
      return;
    }

    if (!form.category_id) {
      setActiveTab("category");
      return;
    }

    if (!form.regular_price || parseFloat(form.regular_price) <= 0) {
      setActiveTab("pricing");
      return;
    }

    if (images.length === 0) {
      setActiveTab("media");
      toast({
        variant: "destructive",
        title: "Product image required",
        description: "Onnoto ekta product photo add korun tarpor submit korun."
      });
      return;
    }
    
    setSaving(true);

    const productData = {
      name: form.name.trim(),
      slug: form.slug || generateSlug(form.name),
      short_description: form.short_description || null,
      description: form.description || null,
      sku: form.sku || null,
      regular_price: parseFloat(form.regular_price) || 0,
      discount_price: form.discount_price ? parseFloat(form.discount_price) : null,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      min_order_quantity: parseInt(form.min_order_quantity) || 1,
      max_order_quantity: form.max_order_quantity ? parseInt(form.max_order_quantity) : null,
      weight: form.weight ? parseFloat(form.weight) : null,
      dimensions: form.dimensions || null,
      shipping_cost: parseFloat(form.shipping_cost) || 0,
      free_shipping: form.free_shipping,
      estimated_delivery: form.estimated_delivery || null,
      status: "inactive",
      approval_status: "pending",
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      meta_keywords: form.meta_keywords || null,
      warranty_info: form.warranty_info || null,
      return_policy: form.return_policy || null,
      product_condition: form.product_condition,
      country_of_origin: form.country_of_origin || null,
      color: form.color || null,
      video_url: form.video_url || null,
      category_id: form.category_id || null,
      brand_id: form.brand_id || null,
      seller_id: sellerId,
      tags: form.tags.length > 0 ? form.tags : null,
    };

    try {
      // Upload new images first
      setUploading(true);
      const uploadedImages = await uploadNewImages();
      setUploading(false);


      // Get image URLs for the edge function
      const imageUrls = uploadedImages.map(img => img.url).filter(Boolean);

      const { data, error } = await supabase.functions.invoke("seller-products", {
        body: {
          action: isEdit ? "update" : "create",
          productId: isEdit ? id : undefined,
          productData,
          imageUrls,
        }
      });

      if (error || data?.error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: data?.error || error?.message || "Failed to save product"
        });
        setSaving(false);
        return;
      }

      toast({ 
        title: "Success",
        description: isEdit 
          ? "Product updated! It will be reviewed by admin." 
          : "Product submitted for review! Admin will approve it soon."
      });
      navigate("/seller/products");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to save product"
      });
    }
    
    setSaving(false);
  };

  // Get parent categories (no parent_id)
  const parentCategories = categories.filter(c => !c.parent_id);
  // Get subcategories based on selected parent
  const subCategories = categories.filter(c => c.parent_id === form.category_id);

  if (loading) {
    return (
      <SellerLayout title={isEdit ? "Edit Product" : "Add Product"}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout title={isEdit ? "Edit Product" : "Add New Product"}>
      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          const target = e.target as HTMLElement;
          if (
            e.key === "Enter" &&
            activeTab !== "return" &&
            target.tagName !== "TEXTAREA"
          ) {
            e.preventDefault();
          }
        }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/5 to-transparent p-4 rounded-xl border">
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" size="icon" onClick={() => navigate("/seller/products")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {isEdit ? "Edit Product" : "Add New Product"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Fill all required fields to submit for review
              </p>
            </div>
          </div>
          {(() => {
            const tabOrder = ["basic", "category", "pricing", "media", "specs", "return"];
            const currentIdx = tabOrder.indexOf(activeTab);
            const isLast = currentIdx === tabOrder.length - 1;
            if (isLast) {
              return (
                <Button type="submit" disabled={saving} className="gap-2 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Saving..." : "Submit for Review"}
                </Button>
              );
            }
            return (
              <Button
                type="button"
                onClick={() => {
                  if (activeTab === "media" && images.length === 0) {
                    toast({
                      variant: "destructive",
                      title: "Product image required",
                      description: "Onnoto ekta product photo add korun tarpor porer step e jan."
                    });
                    return;
                  }
                  setActiveTab(tabOrder[currentIdx + 1]);
                }}
                className="gap-2 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90"
              >
                Next: {tabOrder[currentIdx + 1].charAt(0).toUpperCase() + tabOrder[currentIdx + 1].slice(1)}
              </Button>
            );
          })()}
        </div>

        {/* Info Alert */}
        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            Your product will be reviewed by our team before going live. This usually takes 24-48 hours.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1 bg-muted/50">
            <TabsTrigger value="basic" className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Basic Info</span>
              <span className="sm:hidden">Basic</span>
            </TabsTrigger>
            <TabsTrigger value="category" className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Category</span>
              <span className="sm:hidden">Cat</span>
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Pricing</span>
              <span className="sm:hidden">Price</span>
            </TabsTrigger>
            <TabsTrigger value="media" className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ImageIcon className="h-4 w-4" />
              Media
            </TabsTrigger>
            <TabsTrigger value="specs" className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Specifications</span>
              <span className="sm:hidden">Specs</span>
            </TabsTrigger>
            <TabsTrigger value="return" className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Return</span>
              <span className="sm:hidden">Return</span>
            </TabsTrigger>
          </TabsList>

          {/* ========== BASIC INFO TAB ========== */}
          <TabsContent value="basic" className="space-y-6">
            <Card className="border-2 border-dashed border-primary/20">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Product Basic Information
                </CardTitle>
                <CardDescription>Enter the main details about your product</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-semibold">
                      Product Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g., Wireless Bluetooth Headphone"
                      required
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use a clear, descriptive name (max 200 characters)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug" className="text-sm font-semibold">URL Slug</Label>
                    <Input
                      id="slug"
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                      placeholder="product-url-slug"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Auto-generated from product name
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="short_description" className="text-sm font-semibold">
                    Short Description
                  </Label>
                  <Textarea
                    id="short_description"
                    value={form.short_description}
                    onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                    placeholder="Brief 1-2 line description that appears in product listings..."
                    rows={2}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    This appears in search results and product cards (max 300 characters)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-semibold">
                    Full Description
                  </Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Detailed product description including features, specifications, usage instructions..."
                    rows={8}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Include all important details, features, and benefits
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== CATEGORY TAB ========== */}
          <TabsContent value="category" className="space-y-6">
            <Card className="border-2 border-dashed border-primary/20">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Product Category
                </CardTitle>
                <CardDescription>Select the appropriate category for your product</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Main Category <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={form.category_id}
                      onValueChange={(value) => setForm({ ...form, category_id: value })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select main category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Choose the most relevant category
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Brand</Label>
                      <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-primary">
                            <Plus className="h-3.5 w-3.5 mr-1" /> New Brand
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Create New Brand</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-2 py-2">
                            <Label htmlFor="new_brand_name">Brand Name</Label>
                            <Input
                              id="new_brand_name"
                              value={newBrandName}
                              onChange={(e) => setNewBrandName(e.target.value)}
                              placeholder="e.g., Darzo Originals"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleCreateBrand();
                                }
                              }}
                            />
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setBrandDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="button" onClick={handleCreateBrand} disabled={creatingBrand}>
                              {creatingBrand && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Create
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <Select
                      value={form.brand_id}
                      onValueChange={(value) => setForm({ ...form, brand_id: value })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select brand (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Can't find your brand? Click "New Brand" to add it.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Product Condition</Label>
                  <Select
                    value={form.product_condition}
                    onValueChange={(value) => setForm({ ...form, product_condition: value })}
                  >
                    <SelectTrigger className="h-11 max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-green-500" />
                          New
                        </div>
                      </SelectItem>
                      <SelectItem value="used">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-yellow-500" />
                          Used
                        </div>
                      </SelectItem>
                      <SelectItem value="refurbished">
                        <div className="flex items-center gap-2">
                          <RotateCcw className="h-4 w-4 text-blue-500" />
                          Refurbished
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== PRICING TAB ========== */}
          <TabsContent value="pricing" className="space-y-6">
            <Card className="border-2 border-dashed border-primary/20">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Pricing & Inventory
                </CardTitle>
                <CardDescription>Set your product pricing and stock information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Pricing Section */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Product Pricing
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="regular_price" className="text-sm font-semibold">
                        Selling Price (৳) <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">৳</span>
                        <Input
                          id="regular_price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.regular_price}
                          onChange={(e) => {
                            setForm({ ...form, regular_price: e.target.value });
                          }}
                          onBlur={calculateDiscountPercent}
                          placeholder="0.00"
                          required
                          className="h-11 pl-8"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="discount_price" className="text-sm font-semibold">
                        Original/MRP Price (৳)
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">৳</span>
                        <Input
                          id="discount_price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.discount_price}
                          onChange={(e) => setForm({ ...form, discount_price: e.target.value })}
                          onBlur={calculateDiscountPercent}
                          placeholder="0.00"
                          className="h-11 pl-8"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        For showing strikethrough price
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Discount %</Label>
                      <div className="h-11 flex items-center px-3 bg-muted rounded-md">
                        <span className="text-lg font-bold text-green-600">
                          {form.discount_percent ? `${form.discount_percent}% OFF` : "-"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Auto-calculated
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Inventory Section */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Inventory Management
                  </h3>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stock_quantity" className="text-sm font-semibold">
                        Stock Quantity
                      </Label>
                      <Input
                        id="stock_quantity"
                        type="number"
                        min="0"
                        value={form.stock_quantity}
                        onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sku" className="text-sm font-semibold">
                        SKU / Product Code
                      </Label>
                      <Input
                        id="sku"
                        value={form.sku}
                        onChange={(e) => setForm({ ...form, sku: e.target.value })}
                        placeholder="SKU-12345"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="min_order_quantity" className="text-sm font-semibold">
                        Min Order Qty
                      </Label>
                      <Input
                        id="min_order_quantity"
                        type="number"
                        min="1"
                        value={form.min_order_quantity}
                        onChange={(e) => setForm({ ...form, min_order_quantity: e.target.value })}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_order_quantity" className="text-sm font-semibold">
                        Max Order Qty
                      </Label>
                      <Input
                        id="max_order_quantity"
                        type="number"
                        min="1"
                        value={form.max_order_quantity}
                        onChange={(e) => setForm({ ...form, max_order_quantity: e.target.value })}
                        placeholder="No limit"
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== MEDIA TAB ========== */}
          <TabsContent value="media" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="border-2 border-dashed border-primary/20">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    Product Images
                  </CardTitle>
                  <CardDescription>
                    Upload high-quality images of your product
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <ProductImageUploader
                    images={images}
                    onImagesChange={setImages}
                    maxImages={10}
                    disabled={saving || uploading}
                  />
                </CardContent>
              </Card>

              <Card className="border-2 border-dashed border-primary/20">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-primary" />
                    Product Video
                  </CardTitle>
                  <CardDescription>
                    Add a product demo video to increase buyer confidence
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <Label htmlFor="youtube-url">YouTube Video URL</Label>
                    <Input
                      id="youtube-url"
                      type="url"
                      value={form.video_url}
                      onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=..."
                      disabled={saving || uploading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Only YouTube video links are supported. Direct video upload is not supported.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ========== SPECIFICATIONS TAB ========== */}
          <TabsContent value="specs" className="space-y-6">
            <Card className="border-2 border-dashed border-primary/20">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Product Specifications
                </CardTitle>
                <CardDescription>Add detailed product attributes and specifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="color" className="text-sm font-semibold flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Color
                    </Label>
                    <Input
                      id="color"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      placeholder="e.g., Black, Red, Blue"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="size" className="text-sm font-semibold flex items-center gap-2">
                      <Ruler className="h-4 w-4" />
                      Size
                    </Label>
                    <Input
                      id="size"
                      value={form.size}
                      onChange={(e) => setForm({ ...form, size: e.target.value })}
                      placeholder="e.g., S, M, L, XL or dimensions"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight" className="text-sm font-semibold flex items-center gap-2">
                      <Scale className="h-4 w-4" />
                      Weight (kg)
                    </Label>
                    <Input
                      id="weight"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.weight}
                      onChange={(e) => setForm({ ...form, weight: e.target.value })}
                      placeholder="0.5"
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="material" className="text-sm font-semibold">
                      Material
                    </Label>
                    <Input
                      id="material"
                      value={form.material}
                      onChange={(e) => setForm({ ...form, material: e.target.value })}
                      placeholder="e.g., Cotton, Plastic, Metal"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dimensions" className="text-sm font-semibold">
                      Dimensions (L × W × H)
                    </Label>
                    <Input
                      id="dimensions"
                      value={form.dimensions}
                      onChange={(e) => setForm({ ...form, dimensions: e.target.value })}
                      placeholder="e.g., 30 × 20 × 10 cm"
                      className="h-11"
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country_of_origin" className="text-sm font-semibold flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Country of Origin
                    </Label>
                    <Input
                      id="country_of_origin"
                      value={form.country_of_origin}
                      onChange={(e) => setForm({ ...form, country_of_origin: e.target.value })}
                      placeholder="Bangladesh"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warranty_info" className="text-sm font-semibold flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Warranty / Guarantee
                    </Label>
                    <Input
                      id="warranty_info"
                      value={form.warranty_info}
                      onChange={(e) => setForm({ ...form, warranty_info: e.target.value })}
                      placeholder="e.g., 1 Year Manufacturer Warranty"
                      className="h-11"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>




          {/* ========== RETURN POLICY TAB ========== */}
          <TabsContent value="return" className="space-y-6">
            <Card className="border-2 border-dashed border-primary/20">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-primary" />
                  Return & Refund Policy
                </CardTitle>
                <CardDescription>Define return and refund terms for this product</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Return Eligible Toggle */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="return_eligible" className="text-sm font-semibold cursor-pointer">
                      Return Eligible
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Allow customers to return this product
                    </p>
                  </div>
                  <Switch
                    id="return_eligible"
                    checked={form.return_eligible}
                    onCheckedChange={(checked) => setForm({ ...form, return_eligible: checked })}
                  />
                </div>

                {form.return_eligible && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Return Window</Label>
                      <Select
                        value={form.return_days}
                        onValueChange={(value) => setForm({ ...form, return_days: value })}
                      >
                        <SelectTrigger className="h-11 max-w-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 Days</SelectItem>
                          <SelectItem value="14">14 Days</SelectItem>
                          <SelectItem value="30">30 Days</SelectItem>
                          <SelectItem value="60">60 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="return_policy" className="text-sm font-semibold">
                        Return Policy Description
                      </Label>
                      <Textarea
                        id="return_policy"
                        value={form.return_policy}
                        onChange={(e) => setForm({ ...form, return_policy: e.target.value })}
                        placeholder="Describe your return and refund conditions..."
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        Explain conditions for returns, refunds, and exchanges
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Bottom action button */}
        <div className="flex justify-end pt-4 border-t">
          {(() => {
            const tabOrder = ["basic", "category", "pricing", "media", "specs", "return"];
            const currentIdx = tabOrder.indexOf(activeTab);
            const isLast = currentIdx === tabOrder.length - 1;
            if (isLast) {
              return (
                <Button
                  type="submit"
                  disabled={saving}
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                  {saving ? "Submitting..." : "Submit Product for Review"}
                </Button>
              );
            }
            const nextTab = tabOrder[currentIdx + 1];
            return (
              <Button
                type="button"
                size="lg"
                onClick={() => {
                  if (activeTab === "media" && images.length === 0) {
                    toast({
                      variant: "destructive",
                      title: "Product image required",
                      description: "Onnoto ekta product photo add korun tarpor porer step e jan."
                    });
                    return;
                  }
                  setActiveTab(nextTab);
                }}
                className="gap-2 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90"
              >
                Next: {nextTab.charAt(0).toUpperCase() + nextTab.slice(1)}
              </Button>
            );
          })()}
        </div>

      </form>
    </SellerLayout>
  );
}
