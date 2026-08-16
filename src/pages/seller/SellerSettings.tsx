import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Save, Store, MapPin, Loader2, Upload, User, Lock, Bell, RefreshCw, DollarSign } from "lucide-react";
import { supabase } from "@/lib/firebaseAdapter";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface SellerProfile {
  id: string;
  shop_name: string;
  shop_slug: string;
  shop_description: string;
  shop_logo: string | null;
  shop_banner: string | null;
  contact_email: string;
  contact_phone: string;
  return_address: {
    street: string;
    city: string;
    district: string;
    postalCode: string;
  };
  warehouse_address: {
    street: string;
    city: string;
    district: string;
    postalCode: string;
  };
  mobile_banking_provider: string;
  mobile_banking_number: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_branch: string;
}

interface UserProfile {
  full_name: string;
  email: string;
  avatar_url: string | null;
}

export default function SellerSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState({
    orderAlerts: true,
    stockAlerts: true,
    paymentAlerts: true,
    promotionAlerts: false,
  });

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    if (!user) return;

    // Fetch seller data
    const { data: sellerData, error: sellerError } = await supabase
      .from("sellers")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (sellerError || !sellerData) {
      navigate("/seller/register");
      return;
    }

    if (sellerData.status !== "approved") {
      navigate("/seller/pending");
      return;
    }

    const returnAddr = sellerData.return_address as { street?: string; city?: string; district?: string; postalCode?: string } | null;
    const warehouseAddr = sellerData.warehouse_address as { street?: string; city?: string; district?: string; postalCode?: string } | null;

    setSeller({
      id: sellerData.id,
      shop_name: sellerData.shop_name || "",
      shop_slug: sellerData.shop_slug || "",
      shop_description: sellerData.shop_description || "",
      shop_logo: sellerData.shop_logo,
      shop_banner: sellerData.shop_banner,
      contact_email: sellerData.contact_email || "",
      contact_phone: sellerData.contact_phone || "",
      return_address: {
        street: returnAddr?.street || "",
        city: returnAddr?.city || "",
        district: returnAddr?.district || "",
        postalCode: returnAddr?.postalCode || "",
      },
      warehouse_address: {
        street: warehouseAddr?.street || "",
        city: warehouseAddr?.city || "",
        district: warehouseAddr?.district || "",
        postalCode: warehouseAddr?.postalCode || "",
      },
      mobile_banking_provider: sellerData.mobile_banking_provider || "",
      mobile_banking_number: sellerData.mobile_banking_number || "",
      bank_name: sellerData.bank_name || "",
      bank_account_name: sellerData.bank_account_name || "",
      bank_account_number: sellerData.bank_account_number || "",
      bank_branch: sellerData.bank_branch || "",
    });

    // Fetch user profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, email, avatar_url")
      .eq("user_id", user.id)
      .single();

    if (profileData) {
      setUserProfile(profileData);
    }

    setLoading(false);
  };

  const handleSaveShop = async () => {
    if (!seller) return;

    setSaving(true);

    const { error } = await supabase
      .from("sellers")
      .update({
        shop_name: seller.shop_name,
        shop_description: seller.shop_description,
        contact_email: seller.contact_email,
        contact_phone: seller.contact_phone,
        return_address: seller.return_address,
        warehouse_address: seller.warehouse_address,
        updated_at: new Date().toISOString(),
      })
      .eq("id", seller.id);

    if (error) {
      toast({ variant: "destructive", title: "Failed to save settings" });
    } else {
      toast({ title: "Shop settings saved successfully!" });
    }

    setSaving(false);
  };

  const handleSavePayment = async () => {
    if (!seller) return;

    setSaving(true);

    const { error } = await supabase
      .from("sellers")
      .update({
        mobile_banking_provider: seller.mobile_banking_provider,
        mobile_banking_number: seller.mobile_banking_number,
        bank_name: seller.bank_name,
        bank_account_name: seller.bank_account_name,
        bank_account_number: seller.bank_account_number,
        bank_branch: seller.bank_branch,
        updated_at: new Date().toISOString(),
      })
      .eq("id", seller.id);

    if (error) {
      toast({ variant: "destructive", title: "Failed to save payment settings" });
    } else {
      toast({ title: "Payment settings saved!" });
    }

    setSaving(false);
  };

  const handleSaveProfile = async () => {
    if (!user || !userProfile) return;

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: userProfile.full_name,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) {
      toast({ variant: "destructive", title: "Failed to save profile" });
    } else {
      toast({ title: "Profile saved successfully!" });
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <SellerLayout title="Shop Settings">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout title="Shop Settings">
      <Tabs defaultValue="shop" className="space-y-6">
        <TabsList className="w-full flex flex-wrap h-auto gap-1">
          <TabsTrigger value="shop" className="flex-1 gap-2">
            <Store className="h-4 w-4" />
            Shop Info
          </TabsTrigger>
          <TabsTrigger value="addresses" className="flex-1 gap-2">
            <MapPin className="h-4 w-4" />
            Addresses
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex-1 gap-2">
            <DollarSign className="h-4 w-4" />
            Payment
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex-1 gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex-1 gap-2">
            <Bell className="h-4 w-4" />
            Alerts
          </TabsTrigger>
        </TabsList>

        {/* Shop Info Tab */}
        <TabsContent value="shop" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Shop Information</CardTitle>
              <CardDescription>Update your shop details visible to customers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shop_name">Shop Name</Label>
                  <Input
                    id="shop_name"
                    value={seller?.shop_name || ""}
                    onChange={(e) => setSeller((s) => s ? { ...s, shop_name: e.target.value } : s)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="shop_slug">Shop URL</Label>
                  <Input
                    id="shop_slug"
                    value={seller?.shop_slug || ""}
                    disabled
                    className="mt-1 bg-muted"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="shop_description">Shop Description</Label>
                <Textarea
                  id="shop_description"
                  value={seller?.shop_description || ""}
                  onChange={(e) => setSeller((s) => s ? { ...s, shop_description: e.target.value } : s)}
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={seller?.contact_email || ""}
                    onChange={(e) => setSeller((s) => s ? { ...s, contact_email: e.target.value } : s)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input
                    id="contact_phone"
                    value={seller?.contact_phone || ""}
                    onChange={(e) => setSeller((s) => s ? { ...s, contact_phone: e.target.value } : s)}
                    className="mt-1"
                  />
                </div>
              </div>

              <Button onClick={handleSaveShop} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Shop Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Addresses Tab */}
        <TabsContent value="addresses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Return Address</CardTitle>
              <CardDescription>Where customers should send returns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Street Address</Label>
                <Input
                  value={seller?.return_address?.street || ""}
                  onChange={(e) =>
                    setSeller((s) =>
                      s ? { ...s, return_address: { ...s.return_address, street: e.target.value } } : s
                    )
                  }
                  className="mt-1"
                />
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <Label>City</Label>
                  <Input
                    value={seller?.return_address?.city || ""}
                    onChange={(e) =>
                      setSeller((s) =>
                        s ? { ...s, return_address: { ...s.return_address, city: e.target.value } } : s
                      )
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>District</Label>
                  <Input
                    value={seller?.return_address?.district || ""}
                    onChange={(e) =>
                      setSeller((s) =>
                        s ? { ...s, return_address: { ...s.return_address, district: e.target.value } } : s
                      )
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Postal Code</Label>
                  <Input
                    value={seller?.return_address?.postalCode || ""}
                    onChange={(e) =>
                      setSeller((s) =>
                        s ? { ...s, return_address: { ...s.return_address, postalCode: e.target.value } } : s
                      )
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Warehouse Address</CardTitle>
              <CardDescription>Where you ship products from</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Street Address</Label>
                <Input
                  value={seller?.warehouse_address?.street || ""}
                  onChange={(e) =>
                    setSeller((s) =>
                      s ? { ...s, warehouse_address: { ...s.warehouse_address, street: e.target.value } } : s
                    )
                  }
                  className="mt-1"
                />
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <Label>City</Label>
                  <Input
                    value={seller?.warehouse_address?.city || ""}
                    onChange={(e) =>
                      setSeller((s) =>
                        s ? { ...s, warehouse_address: { ...s.warehouse_address, city: e.target.value } } : s
                      )
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>District</Label>
                  <Input
                    value={seller?.warehouse_address?.district || ""}
                    onChange={(e) =>
                      setSeller((s) =>
                        s ? { ...s, warehouse_address: { ...s.warehouse_address, district: e.target.value } } : s
                      )
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Postal Code</Label>
                  <Input
                    value={seller?.warehouse_address?.postalCode || ""}
                    onChange={(e) =>
                      setSeller((s) =>
                        s ? { ...s, warehouse_address: { ...s.warehouse_address, postalCode: e.target.value } } : s
                      )
                    }
                    className="mt-1"
                  />
                </div>
              </div>
              <Button onClick={handleSaveShop} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Addresses
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Tab */}
        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mobile Banking</CardTitle>
              <CardDescription>For receiving payouts via mobile banking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Provider</Label>
                  <Input
                    placeholder="bKash / Nagad / Rocket"
                    value={seller?.mobile_banking_provider || ""}
                    onChange={(e) =>
                      setSeller((s) => (s ? { ...s, mobile_banking_provider: e.target.value } : s))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Mobile Number</Label>
                  <Input
                    placeholder="01XXXXXXXXX"
                    value={seller?.mobile_banking_number || ""}
                    onChange={(e) =>
                      setSeller((s) => (s ? { ...s, mobile_banking_number: e.target.value } : s))
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bank Account</CardTitle>
              <CardDescription>For receiving payouts via bank transfer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Bank Name</Label>
                  <Input
                    value={seller?.bank_name || ""}
                    onChange={(e) => setSeller((s) => (s ? { ...s, bank_name: e.target.value } : s))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Branch</Label>
                  <Input
                    value={seller?.bank_branch || ""}
                    onChange={(e) => setSeller((s) => (s ? { ...s, bank_branch: e.target.value } : s))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Account Holder Name</Label>
                  <Input
                    value={seller?.bank_account_name || ""}
                    onChange={(e) => setSeller((s) => (s ? { ...s, bank_account_name: e.target.value } : s))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Account Number</Label>
                  <Input
                    value={seller?.bank_account_number || ""}
                    onChange={(e) => setSeller((s) => (s ? { ...s, bank_account_number: e.target.value } : s))}
                    className="mt-1"
                  />
                </div>
              </div>
              <Button onClick={handleSavePayment} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Payment Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={userProfile?.avatar_url || ""} />
                  <AvatarFallback className="text-lg">
                    {userProfile?.full_name?.charAt(0) || "S"}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Change Avatar
                </Button>
              </div>

              <Separator />

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={userProfile?.full_name || ""}
                    onChange={(e) =>
                      setUserProfile((p) => (p ? { ...p, full_name: e.target.value } : p))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={userProfile?.email || ""} disabled className="mt-1 bg-muted" />
                </div>
              </div>

              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Profile
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose which alerts you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">New Order Alerts</p>
                  <p className="text-sm text-muted-foreground">Get notified when you receive new orders</p>
                </div>
                <Switch
                  checked={notifications.orderAlerts}
                  onCheckedChange={(checked) =>
                    setNotifications((n) => ({ ...n, orderAlerts: checked }))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Low Stock Alerts</p>
                  <p className="text-sm text-muted-foreground">Get notified when products are running low</p>
                </div>
                <Switch
                  checked={notifications.stockAlerts}
                  onCheckedChange={(checked) =>
                    setNotifications((n) => ({ ...n, stockAlerts: checked }))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Payment Alerts</p>
                  <p className="text-sm text-muted-foreground">Get notified about payout status changes</p>
                </div>
                <Switch
                  checked={notifications.paymentAlerts}
                  onCheckedChange={(checked) =>
                    setNotifications((n) => ({ ...n, paymentAlerts: checked }))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Promotional Updates</p>
                  <p className="text-sm text-muted-foreground">Receive tips and platform updates</p>
                </div>
                <Switch
                  checked={notifications.promotionAlerts}
                  onCheckedChange={(checked) =>
                    setNotifications((n) => ({ ...n, promotionAlerts: checked }))
                  }
                />
              </div>

              <Button onClick={() => toast({ title: "Notification preferences saved!" })}>
                <Save className="h-4 w-4 mr-2" />
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </SellerLayout>
  );
}
