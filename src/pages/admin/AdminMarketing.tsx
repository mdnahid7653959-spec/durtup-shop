import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/lib/firebaseAdapter";
import { adminDb } from "@/lib/adminDb";
import { Megaphone, Zap, Image, Tag, Plus, Trash2, Edit, Calendar, Upload, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface Campaign {
  id: string;
  name: string;
  slug: string;
  campaign_type: string | null;
  is_active: boolean | null;
  starts_at: string;
  ends_at: string;
  discount_type: string | null;
  discount_value: number | null;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  banner_image: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface Banner {
  id: string;
  title: string;
  image_url: string;
  mobile_image_url: string | null;
  link_url: string | null;
  position: string;
  is_active: boolean | null;
  sort_order: number | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  image_fit: string;
  image_position: string;
}

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  end_date: string | null;
}

export default function AdminMarketing() {
  const { admin } = useAdminAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>("");
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [campaignForm, setCampaignForm] = useState({
    name: "",
    campaign_type: "flash_sale",
    starts_at: "",
    ends_at: "",
    discount_type: "percentage",
    discount_value: 0
  });

  const [bannerForm, setBannerForm] = useState({
    title: "",
    image_url: "",
    link_url: "",
    position: "hero",
    sort_order: 0,
    image_fit: "cover",
    image_position: "center"
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [campaignsRes, bannersRes, couponsRes] = await Promise.all([
        adminDb.select<Campaign>("campaigns", { orderBy: { col: "created_at", ascending: false } }),
        adminDb.select<Banner>("cms_banners", { orderBy: { col: "sort_order" } }),
        adminDb.select<Coupon>("coupons", { orderBy: { col: "created_at", ascending: false }, limit: 10 }),
      ]);
      if (campaignsRes.data) setCampaigns(campaignsRes.data);
      if (bannersRes.data) setBanners(bannersRes.data);
      if (couponsRes.data) setCoupons(couponsRes.data);
    } catch (error) {
      console.error("Error fetching marketing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveCampaign = async () => {
    const slug = campaignForm.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const data = {
      name: campaignForm.name,
      slug,
      campaign_type: campaignForm.campaign_type,
      starts_at: campaignForm.starts_at,
      ends_at: campaignForm.ends_at,
      discount_type: campaignForm.discount_type,
      discount_value: campaignForm.discount_value,
      is_active: false,
    };
    if (editingCampaign) {
      const { error } = await adminDb.update("campaigns", data, { id: editingCampaign.id });
      if (error) toast({ variant: "destructive", title: "Error", description: error.message });
      else toast({ title: "Success", description: "Campaign updated" });
    } else {
      const { error } = await adminDb.insert("campaigns", data);
      if (error) toast({ variant: "destructive", title: "Error", description: error.message });
      else toast({ title: "Success", description: "Campaign created" });
    }
    setCampaignDialogOpen(false);
    setEditingCampaign(null);
    setCampaignForm({ name: "", campaign_type: "flash_sale", starts_at: "", ends_at: "", discount_type: "percentage", discount_value: 0 });
    fetchData();
  };

  const updateCampaignStatus = async (id: string, isActive: boolean) => {
    await adminDb.update("campaigns", { is_active: isActive }, { id });
    fetchData();
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("Delete this campaign?")) return;
    await adminDb.remove("campaigns", { id });
    fetchData();
  };

  const handleBannerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const uploadBannerImage = async (file: File): Promise<string | null> => {
    if (!admin?.id) return null;
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("action", "upload");
    formData.append("adminId", admin.id);

    try {
      const { data, error } = await supabase.functions.invoke("admin-banners", {
        body: formData,
      });

      if (error || data?.error) {
        toast({ variant: "destructive", title: "Upload failed", description: data?.error || error?.message });
        return null;
      }

      return data.url;
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err.message });
      return null;
    }
  };

  const saveBanner = async () => {
    if (!admin?.id) {
      toast({ variant: "destructive", title: "Error", description: "Admin session not found" });
      return;
    }

    setUploadingBanner(true);
    
    let imageUrl = bannerForm.image_url;
    
    // Upload file if selected
    if (bannerFile) {
      const uploadedUrl = await uploadBannerImage(bannerFile);
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      } else {
        setUploadingBanner(false);
        return;
      }
    }

    if (!imageUrl) {
      toast({ variant: "destructive", title: "Error", description: "Please provide an image URL or upload a file" });
      setUploadingBanner(false);
      return;
    }

    const data = {
      title: bannerForm.title,
      image_url: imageUrl,
      link_url: bannerForm.link_url || null,
      position: bannerForm.position,
      sort_order: bannerForm.sort_order,
      image_fit: bannerForm.image_fit,
      image_position: bannerForm.image_position,
      is_active: true
    };

    try {
      if (editingBanner) {
        const { data: res, error } = await supabase.functions.invoke("admin-banners", {
          body: { action: "update", adminId: admin.id, bannerId: editingBanner.id, bannerData: data },
        });
        if (error || res?.error) throw new Error(res?.error || error?.message);
      } else {
        const { data: res, error } = await supabase.functions.invoke("admin-banners", {
          body: { action: "create", adminId: admin.id, bannerData: data },
        });
        if (error || res?.error) throw new Error(res?.error || error?.message);
      }

      setBannerDialogOpen(false);
      setEditingBanner(null);
      setBannerForm({ title: "", image_url: "", link_url: "", position: "hero", sort_order: 0, image_fit: "cover", image_position: "center" });
      setBannerFile(null);
      setBannerPreview("");
      fetchData();
      toast({ title: "Success", description: "Banner saved" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setUploadingBanner(false);
    }
  };

  const toggleBanner = async (id: string, isActive: boolean) => {
    if (!admin?.id) return;
    await supabase.functions.invoke("admin-banners", {
      body: { action: "toggle", adminId: admin.id, bannerId: id, bannerData: { is_active: !isActive } },
    });
    fetchData();
  };

  const deleteBanner = async (id: string) => {
    if (!confirm("Delete this banner?") || !admin?.id) return;
    await supabase.functions.invoke("admin-banners", {
      body: { action: "delete", adminId: admin.id, bannerId: id },
    });
    fetchData();
  };

  if (loading) {
    return (
      <AdminLayout title="Marketing Tools">
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Marketing Tools">
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Megaphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{campaigns.length}</p>
                  <p className="text-sm text-muted-foreground">Campaigns</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Zap className="h-5 w-5 text-orange-600" />
                </div>
              <div>
                  <p className="text-2xl font-bold">{campaigns.filter(c => c.is_active).length}</p>
                  <p className="text-sm text-muted-foreground">Active Sales</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Image className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{banners.length}</p>
                  <p className="text-sm text-muted-foreground">Banners</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Tag className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{coupons.filter(c => c.is_active).length}</p>
                  <p className="text-sm text-muted-foreground">Active Coupons</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="campaigns" className="space-y-4">
          <TabsList>
            <TabsTrigger value="campaigns">Campaigns & Flash Sales</TabsTrigger>
            <TabsTrigger value="banners">Banners</TabsTrigger>
            <TabsTrigger value="coupons">Recent Coupons</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Campaigns & Flash Sales</CardTitle>
                    <CardDescription>Create and manage promotional campaigns</CardDescription>
                  </div>
                  <Button onClick={() => setCampaignDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Campaign
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No campaigns yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      campaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell className="font-medium">{campaign.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {campaign.campaign_type === "flash_sale" ? "Flash Sale" : campaign.campaign_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {campaign.discount_value}
                            {campaign.discount_type === "percentage" ? "%" : "৳"}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{format(new Date(campaign.starts_at), "PP")}</p>
                              <p className="text-muted-foreground">to {format(new Date(campaign.ends_at), "PP")}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={campaign.is_active}
                              onCheckedChange={(v) => updateCampaignStatus(campaign.id, v)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingCampaign(campaign);
                                  setCampaignForm({
                                    name: campaign.name,
                                    campaign_type: campaign.campaign_type,
                                    starts_at: campaign.starts_at.split("T")[0],
                                    ends_at: campaign.ends_at.split("T")[0],
                                    discount_type: campaign.discount_type || "percentage",
                                    discount_value: campaign.discount_value || 0
                                  });
                                  setCampaignDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteCampaign(campaign.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="banners">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Banner Management</CardTitle>
                    <CardDescription>Manage homepage and promotional banners</CardDescription>
                  </div>
                  <Button onClick={() => setBannerDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Banner
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {banners.map((banner) => (
                    <Card key={banner.id} className="overflow-hidden">
                      <div className="aspect-video bg-muted relative">
                        {banner.image_url ? (
                          <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            No Image
                          </div>
                        )}
                        <Badge className="absolute top-2 right-2" variant={banner.is_active ? "default" : "secondary"}>
                          {banner.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-medium">{banner.title}</h3>
                        <p className="text-sm text-muted-foreground">Position: {banner.position}</p>
                        <div className="flex justify-between items-center mt-3">
                          <Switch
                            checked={banner.is_active}
                            onCheckedChange={() => toggleBanner(banner.id, banner.is_active)}
                          />
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingBanner(banner);
                                setBannerForm({
                                  title: banner.title,
                                  image_url: banner.image_url,
                                  link_url: banner.link_url || "",
                                  position: banner.position,
                                  sort_order: banner.sort_order || 0,
                                  image_fit: banner.image_fit || "cover",
                                  image_position: banner.image_position || "center"
                                });
                                setBannerDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteBanner(banner.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {banners.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No banners yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="coupons">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Recent Coupons</CardTitle>
                    <CardDescription>Quick overview of recent discount codes</CardDescription>
                  </div>
                  <Button variant="outline" asChild>
                    <a href="/admin/coupons">Manage All Coupons</a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coupons.map((coupon) => (
                      <TableRow key={coupon.id}>
                        <TableCell className="font-mono font-medium">{coupon.code}</TableCell>
                        <TableCell>
                          {coupon.discount_value}{coupon.discount_type === "percentage" ? "%" : "৳"}
                        </TableCell>
                        <TableCell>
                          {coupon.used_count} / {coupon.usage_limit || "∞"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={coupon.is_active ? "default" : "secondary"}>
                            {coupon.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Campaign Dialog */}
      <Dialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? "Edit Campaign" : "New Campaign"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input
                value={campaignForm.name}
                onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                placeholder="Summer Sale 2024"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={campaignForm.campaign_type} onValueChange={(v) => setCampaignForm({ ...campaignForm, campaign_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flash_sale">Flash Sale</SelectItem>
                  <SelectItem value="seasonal">Seasonal</SelectItem>
                  <SelectItem value="clearance">Clearance</SelectItem>
                  <SelectItem value="promotion">Promotion</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={campaignForm.starts_at}
                  onChange={(e) => setCampaignForm({ ...campaignForm, starts_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={campaignForm.ends_at}
                  onChange={(e) => setCampaignForm({ ...campaignForm, ends_at: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select
                  value={campaignForm.discount_type}
                  onValueChange={(v) => setCampaignForm({ ...campaignForm, discount_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Discount Value</Label>
                <Input
                  type="number"
                  value={campaignForm.discount_value}
                  onChange={(e) => setCampaignForm({ ...campaignForm, discount_value: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveCampaign}>Save Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Banner Dialog */}
      <Dialog open={bannerDialogOpen} onOpenChange={(open) => {
        setBannerDialogOpen(open);
        if (!open) {
          setBannerFile(null);
          setBannerPreview("");
        }
      }}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBanner ? "Edit Banner" : "Add Banner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={bannerForm.title}
                onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                placeholder="Banner Title"
              />
            </div>

            {/* Image Upload Section */}
            <div className="space-y-2">
              <Label>Banner Image *</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                {(bannerPreview || bannerForm.image_url) ? (
                  <div className="space-y-3">
                    <img 
                      src={bannerPreview || bannerForm.image_url} 
                      alt="Banner preview" 
                      className="max-h-32 mx-auto rounded object-cover"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => bannerInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Change Image
                    </Button>
                  </div>
                ) : (
                  <div 
                    className="py-6 cursor-pointer hover:bg-muted/50 transition-colors rounded"
                    onClick={() => bannerInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload image</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP up to 5MB</p>
                  </div>
                )}
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerFileSelect}
                />
              </div>
              <p className="text-xs text-muted-foreground">Or enter a URL directly:</p>
              <Input
                value={bannerForm.image_url}
                onChange={(e) => setBannerForm({ ...bannerForm, image_url: e.target.value })}
                placeholder="https://..."
                disabled={!!bannerFile}
              />
            </div>

            <div className="space-y-2">
              <Label>Link URL (Optional)</Label>
              <Input
                value={bannerForm.link_url}
                onChange={(e) => setBannerForm({ ...bannerForm, link_url: e.target.value })}
                placeholder="/products or https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Position</Label>
                <Select value={bannerForm.position} onValueChange={(v) => setBannerForm({ ...bannerForm, position: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hero">Hero Slider</SelectItem>
                    <SelectItem value="sidebar">Sidebar</SelectItem>
                    <SelectItem value="popup">Popup</SelectItem>
                    <SelectItem value="footer">Footer</SelectItem>
                    <SelectItem value="promo">Promo Section</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={bannerForm.sort_order}
                  onChange={(e) => setBannerForm({ ...bannerForm, sort_order: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* Image Adjustment Controls */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Image Fit</Label>
                <Select value={bannerForm.image_fit} onValueChange={(v) => setBannerForm({ ...bannerForm, image_fit: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cover">Cover (ক্রপ করে ফিট)</SelectItem>
                    <SelectItem value="contain">Contain (পুরো ছবি দেখায়)</SelectItem>
                    <SelectItem value="fill">Fill (স্ট্রেচ করে ফিট)</SelectItem>
                    <SelectItem value="none">None (আসল সাইজ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Image Position</Label>
                <Select value={bannerForm.image_position} onValueChange={(v) => setBannerForm({ ...bannerForm, image_position: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="top">Top</SelectItem>
                    <SelectItem value="bottom">Bottom</SelectItem>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                    <SelectItem value="top left">Top Left</SelectItem>
                    <SelectItem value="top right">Top Right</SelectItem>
                    <SelectItem value="bottom left">Bottom Left</SelectItem>
                    <SelectItem value="bottom right">Bottom Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Live Preview with Drag to Reposition */}
            {(bannerPreview || bannerForm.image_url) && (
              <div className="space-y-2">
                <Label>Preview — ছবি ড্র্যাগ করে পজিশন সেট করুন</Label>
                <div 
                  className="border rounded-lg overflow-hidden h-[140px] bg-muted relative cursor-grab active:cursor-grabbing select-none"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const container = e.currentTarget;
                    const rect = container.getBoundingClientRect();
                    const setPos = (clientX: number, clientY: number) => {
                      const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
                      const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
                      setBannerForm(prev => ({ ...prev, image_position: `${Math.round(x)}% ${Math.round(y)}%` }));
                    };
                    setPos(e.clientX, e.clientY);
                    const onMove = (ev: MouseEvent) => setPos(ev.clientX, ev.clientY);
                    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onUp);
                  }}
                  onTouchStart={(e) => {
                    const container = e.currentTarget;
                    const rect = container.getBoundingClientRect();
                    const setPos = (clientX: number, clientY: number) => {
                      const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
                      const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
                      setBannerForm(prev => ({ ...prev, image_position: `${Math.round(x)}% ${Math.round(y)}%` }));
                    };
                    const touch = e.touches[0];
                    setPos(touch.clientX, touch.clientY);
                    const onMove = (ev: TouchEvent) => { ev.preventDefault(); setPos(ev.touches[0].clientX, ev.touches[0].clientY); };
                    const onUp = () => { container.removeEventListener('touchmove', onMove); container.removeEventListener('touchend', onUp); };
                    container.addEventListener('touchmove', onMove, { passive: false });
                    container.addEventListener('touchend', onUp);
                  }}
                >
                  <img
                    src={bannerPreview || bannerForm.image_url}
                    alt="Preview"
                    className="w-full h-full pointer-events-none"
                    style={{
                      objectFit: bannerForm.image_fit as any,
                      objectPosition: bannerForm.image_position
                    }}
                  />
                  {/* Focal point indicator */}
                  {(() => {
                    const parts = bannerForm.image_position.split(/\s+/);
                    const xStr = parts[0] || '50%';
                    const yStr = parts[1] || '50%';
                    const xVal = xStr.includes('%') ? parseFloat(xStr) : (xStr === 'left' ? 0 : xStr === 'right' ? 100 : xStr === 'center' ? 50 : 50);
                    const yVal = yStr.includes('%') ? parseFloat(yStr) : (yStr === 'top' ? 0 : yStr === 'bottom' ? 100 : yStr === 'center' ? 50 : 50);
                    return (
                      <div
                        className="absolute w-5 h-5 border-2 border-white rounded-full shadow-lg pointer-events-none"
                        style={{
                          left: `${xVal}%`,
                          top: `${yVal}%`,
                          transform: 'translate(-50%, -50%)',
                          background: 'rgba(239,68,68,0.7)',
                        }}
                      />
                    );
                  })()}
                </div>
                <p className="text-xs text-muted-foreground">Position: {bannerForm.image_position}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBannerDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveBanner} disabled={uploadingBanner || !bannerForm.title}>
              {uploadingBanner ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Save Banner"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
