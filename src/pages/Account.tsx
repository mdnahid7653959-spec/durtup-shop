import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Mail, Phone, MapPin, Lock, Camera, Save, Eye, EyeOff, Store, Clock, CheckCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useSellerStatus } from "@/hooks/useSellerStatus";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { supabase } from "@/lib/firebaseAdapter";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/integrations/firebase/client";

export default function Account() {
  const { user, profile, loading } = useAuth();
  const { status: sellerStatus, sellerInfo, isApprovedSeller, isPendingSeller, hasApplied } = useSellerStatus();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Address fields
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("");
  
  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Theme
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  const [savingAddress, setSavingAddress] = useState(false);
  const [defaultAddressId, setDefaultAddressId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone((profile as any).phone || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  // Load default address from DB
  useEffect(() => {
    const loadAddress = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_default", true)
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setDefaultAddressId(data.id);
        setAddress(data.address_line1 || "");
        setCity(data.city || "");
        setState(data.state || "");
        setZipCode(data.postal_code || "");
        setCountry(data.country || "Bangladesh");
      }
    };
    loadAddress();
  }, [user]);

  useEffect(() => {
    // Force light theme
    localStorage.setItem("theme", "light");
    document.documentElement.classList.remove("dark");
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please choose an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB.", variant: "destructive" });
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const { error: dbError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (dbError) throw dbError;

      setAvatarUrl(publicUrl);
      toast({ title: "Profile photo updated!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);


    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Profile updated!",
        description: "Your profile information has been saved."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    } finally {
      setSaving(false);
    }
  };

  const [sendingResetEmail, setSendingResetEmail] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleSendResetEmail = async () => {
    const targetEmail = user?.email;
    if (!targetEmail) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No registered email found for this account."
      });
      return;
    }

    setSendingResetEmail(true);
    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setResetEmailSent(true);
      toast({
        title: "Verification email sent!",
        description: `Check your Gmail inbox (${targetEmail}) for the password reset link.`
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to send email",
        description: error.message || "Could not send verification email."
      });
    } finally {
      setSendingResetEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-4 sm:py-6 lg:py-8 pb-24 md:pb-8">
        <div className="container max-w-4xl px-3 sm:px-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6 lg:mb-8">Account Settings</h1>

          <Tabs defaultValue="profile" className="space-y-4 sm:space-y-6">
            {/* Mobile-friendly horizontal scroll tabs */}
            <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
              <TabsList className="grid w-full grid-cols-3 min-w-[280px] h-10 sm:h-11">
                <TabsTrigger value="profile" className="text-[11px] sm:text-sm px-2 sm:px-4">Profile</TabsTrigger>
                <TabsTrigger value="address" className="text-[11px] sm:text-sm px-2 sm:px-4">Address</TabsTrigger>
                <TabsTrigger value="password" className="text-[11px] sm:text-sm px-2 sm:px-4">Password</TabsTrigger>
              </TabsList>
            </div>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card className="border-0 sm:border shadow-sm">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Profile Information</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Update your personal details here.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
                  {/* Avatar - Centered on mobile */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                    <div className="relative">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden ring-4 ring-primary/10">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground" />
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 shadow-lg touch-manipulation active:scale-95 cursor-pointer">
                        {uploadingAvatar ? (
                          <span className="block w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
                          disabled={uploadingAvatar}
                        />
                      </label>

                    </div>
                    <div className="text-center sm:text-left">
                      <h3 className="font-semibold text-sm sm:text-base">{fullName || "Your Name"}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="fullName" className="text-xs sm:text-sm">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pl-10 h-11 sm:h-10 text-sm"
                          placeholder="Enter your full name"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="email" className="text-xs sm:text-sm">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          value={user.email || ""}
                          disabled
                          className="pl-10 bg-muted h-11 sm:h-10 text-sm"
                        />
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>

                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="phone" className="text-xs sm:text-sm">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="pl-10 h-11 sm:h-10 text-sm"
                          placeholder="+880 1XXX-XXXXXX"
                        />
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleSaveProfile} disabled={saving} className="w-full sm:w-auto h-11 sm:h-10 text-sm touch-manipulation active:scale-[0.98]">
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Address Tab */}
            <TabsContent value="address">
              <Card className="border-0 sm:border shadow-sm">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Shipping Address</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Manage your default shipping address.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="address" className="text-xs sm:text-sm">Street Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Textarea
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="pl-10 min-h-[70px] sm:min-h-[80px] text-sm"
                        placeholder="House/Flat No., Street, Area"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="city" className="text-xs sm:text-sm">City</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Dhaka"
                        className="h-11 sm:h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="state" className="text-xs sm:text-sm">State/Division</Label>
                      <Input
                        id="state"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="Dhaka Division"
                        className="h-11 sm:h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="zipCode" className="text-xs sm:text-sm">Postal/ZIP Code</Label>
                      <Input
                        id="zipCode"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        placeholder="1205"
                        className="h-11 sm:h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="country" className="text-xs sm:text-sm">Country</Label>
                      <Input
                        id="country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="Bangladesh"
                        className="h-11 sm:h-10 text-sm"
                      />
                    </div>
                  </div>

                  <Button onClick={async () => {
                    if (!user) return;
                    if (!address || !city || !zipCode) {
                      toast({ title: "Error", description: "Please fill in street address, city, and postal code.", variant: "destructive" });
                      return;
                    }
                    setSavingAddress(true);
                    try {
                      const addressData = {
                        address_line1: address,
                        city,
                        state,
                        postal_code: zipCode,
                        country: country || "Bangladesh",
                        full_name: fullName || profile?.full_name || "",
                        phone: phone || (profile as any)?.phone || "",
                        is_default: true,
                        user_id: user.id,
                      };

                      if (defaultAddressId) {
                        const { error } = await supabase.from("addresses").update({ ...addressData, updated_at: new Date().toISOString() }).eq("id", defaultAddressId);
                        if (error) throw error;
                      } else {
                        const { data, error } = await supabase.from("addresses").insert(addressData).select("id").single();
                        if (error) throw error;
                        setDefaultAddressId(data.id);
                      }
                      toast({ title: "Address saved!", description: "Your shipping address has been updated." });
                    } catch (error: any) {
                      toast({ title: "Error", description: error.message || "Failed to save address", variant: "destructive" });
                    } finally {
                      setSavingAddress(false);
                    }
                  }} className="w-full sm:w-auto h-11 sm:h-10 text-sm touch-manipulation active:scale-[0.98]" disabled={savingAddress}>
                    <Save className="w-4 h-4 mr-2" />
                    {savingAddress ? "Saving..." : "Save Address"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Password Tab */}
            <TabsContent value="password">
              <Card className="border-0 sm:border shadow-sm">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Change Password via Gmail
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    For your account security, a password reset verification link will be sent to your registered Gmail address.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
                  {resetEmailSent ? (
                    <div className="p-5 sm:p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto">
                        <CheckCircle className="h-6 w-6" />
                      </div>
                      <h3 className="font-bold text-base text-foreground">
                        Verification Email Sent!
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        We have sent a secure password reset link to <span className="font-semibold text-foreground">{user?.email}</span>. Check your inbox (or spam folder) and click the link to set your new password.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                        <a
                          href="https://mail.google.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                        >
                          <Mail className="h-4 w-4" /> Open Gmail Inbox
                        </a>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSendResetEmail}
                          disabled={sendingResetEmail}
                          className="text-xs"
                        >
                          {sendingResetEmail ? "Resending..." : "Resend Link"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 max-w-md">
                      <div className="p-3.5 rounded-xl bg-muted/50 border space-y-1">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Registered Gmail Address
                        </span>
                        <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                          <Mail className="h-4 w-4 text-primary" />
                          <span>{user?.email || "No email available"}</span>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Click the button below and we will send a password change link to your Gmail. You can then verify your identity and set a new password safely.
                      </p>

                      <Button
                        onClick={handleSendResetEmail}
                        className="w-full sm:w-auto h-11 sm:h-10 text-sm font-semibold touch-manipulation active:scale-[0.98] bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
                        disabled={sendingResetEmail || !user?.email}
                      >
                        <Mail className="w-4 h-4" />
                        {sendingResetEmail ? "Sending Link..." : "Send Verification Link to Gmail"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
