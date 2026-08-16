import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/firebaseAdapter";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Store, User, Building2, CreditCard, FileText, Upload, Loader2, CheckCircle2 } from "lucide-react";

interface SellerForm {
  // Shop Info
  shopName: string;
  shopDescription: string;
  // Business Info
  businessName: string;
  businessType: string;
  businessRegistrationNumber: string;
  taxId: string;
  tradeLicenseNumber: string;
  // Contact
  contactPhone: string;
  contactEmail: string;
  warehouseAddress: {
    street: string;
    city: string;
    district: string;
    postalCode: string;
  };
  // Identity
  idDocumentType: "nid" | "birth_certificate";
  nidNumber: string;
  birthCertNumber: string;
  // Payment
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankBranch: string;
  mobileBankingProvider: string;
  mobileBankingNumber: string;
}

const initialForm: SellerForm = {
  shopName: "",
  shopDescription: "",
  businessName: "",
  businessType: "individual",
  businessRegistrationNumber: "",
  taxId: "",
  tradeLicenseNumber: "",
  contactPhone: "",
  contactEmail: "",
  warehouseAddress: {
    street: "",
    city: "",
    district: "",
    postalCode: "",
  },
  idDocumentType: "nid",
  nidNumber: "",
  birthCertNumber: "",
  bankName: "",
  bankAccountName: "",
  bankAccountNumber: "",
  bankBranch: "",
  mobileBankingProvider: "",
  mobileBankingNumber: "",
};

export default function SellerRegister() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState<SellerForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("shop");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [nidFrontImage, setNidFrontImage] = useState<File | null>(null);
  const [nidBackImage, setNidBackImage] = useState<File | null>(null);
  const [birthCertImage, setBirthCertImage] = useState<File | null>(null);
  const [tradeLicenseImage, setTradeLicenseImage] = useState<File | null>(null);
  const [shopLogo, setShopLogo] = useState<File | null>(null);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${path}/${user?.id ?? "anon"}/${fileName}`;

    const { error } = await supabase.storage.from("product-media").upload(filePath, file);
    if (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: `${file.name}: ${error.message}`,
        variant: "destructive",
      });
      throw error;
    }
    // Store the object path; consumers generate a signed URL to view it.
    return filePath;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Please login first",
        description: "You need to be logged in to register as a seller",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (!agreedToTerms) {
      toast({
        title: "Terms Required",
        description: "Please agree to the seller terms and conditions",
        variant: "destructive",
      });
      return;
    }

    if (!form.shopName || !form.contactPhone || !form.contactEmail) {
      toast({
        title: "Required Fields",
        description: "Please fill in shop name, contact phone and email",
        variant: "destructive",
      });
      return;
    }

    // Identity: require at least ONE — NID number, or Birth Certificate (number + image).
    // Seller can also provide BOTH; whichever is provided will be sent to the admin panel.
    const hasNid = !!form.nidNumber.trim();
    const hasBirthCert = !!form.birthCertNumber.trim() && !!birthCertImage;
    if (!hasNid && !hasBirthCert) {
      toast({
        title: "Identity Document Required",
        description: "Please provide your NID number, or a Birth Certificate number with its photo. You may also provide both.",
        variant: "destructive",
      });
      setActiveTab("identity");
      return;
    }

    // Trade License: required for partnership / private_limited / limited / other non-individual
    if (form.businessType && form.businessType !== "individual") {
      if (!form.tradeLicenseNumber.trim() || !tradeLicenseImage) {
        toast({
          title: "Trade License Required",
          description: "Partnership / Limited companies must provide a Trade License number and upload the document.",
          variant: "destructive",
        });
        setActiveTab("business");
        return;
      }
    }


    setLoading(true);

    try {
      // Upload images if provided
      let nidFrontUrl = null;
      let nidBackUrl = null;
      let birthCertUrl = null;
      let tradeLicenseUrl = null;
      let logoUrl = null;

      if (nidFrontImage) {
        nidFrontUrl = await uploadFile(nidFrontImage, "seller-documents");
      }
      if (nidBackImage) {
        nidBackUrl = await uploadFile(nidBackImage, "seller-documents");
      }
      if (birthCertImage) {
        birthCertUrl = await uploadFile(birthCertImage, "seller-documents");
      }
      if (tradeLicenseImage) {
        tradeLicenseUrl = await uploadFile(tradeLicenseImage, "seller-documents");
      }
      if (shopLogo) {
        logoUrl = await uploadFile(shopLogo, "seller-logos");
      }

      // Check if user already has a seller record
      const { data: existing } = await supabase
        .from("sellers")
        .select("id, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing && (existing.status === "pending" || existing.status === "approved" || existing.status === "suspended" || existing.status === "banned")) {
        toast({
          title: "Application already exists",
          description:
            existing.status === "approved"
              ? "You are already an approved seller."
              : existing.status === "pending"
              ? "Your application is under review."
              : `Your seller account is ${existing.status}. Contact support.`,
        });
        navigate(existing.status === "approved" ? "/seller/dashboard" : "/seller/pending");
        return;
      }

      const payload = {
        user_id: user.id,
        shop_name: form.shopName,
        shop_slug: generateSlug(form.shopName),
        shop_description: form.shopDescription,
        shop_logo: logoUrl,
        business_name: form.businessName,
        business_type: form.businessType,
        business_registration_number: form.businessRegistrationNumber,
        tax_id: form.taxId,
        trade_license_number: form.tradeLicenseNumber || null,
        trade_license_image: tradeLicenseUrl,
        contact_phone: form.contactPhone,
        contact_email: form.contactEmail,
        warehouse_address: form.warehouseAddress,
        return_address: form.warehouseAddress,
        id_document_type: form.idDocumentType,
        // Save whichever documents the seller provided — both NID and Birth Certificate
        // can be uploaded together, and all of them will show up in the admin panel.
        nid_number: form.nidNumber?.trim() ? form.nidNumber.trim() : null,
        nid_front_image: nidFrontUrl,
        nid_back_image: nidBackUrl,
        birth_certificate_number: form.birthCertNumber?.trim() ? form.birthCertNumber.trim() : null,
        birth_certificate_image: birthCertUrl,
        bank_name: form.bankName,
        bank_account_name: form.bankAccountName,
        bank_account_number: form.bankAccountNumber,
        bank_branch: form.bankBranch,
        mobile_banking_provider: form.mobileBankingProvider,
        mobile_banking_number: form.mobileBankingNumber,
        status: "pending" as const,
        rejection_reason: null,
      };

      const { error } = existing
        ? await supabase.from("sellers").update(payload).eq("id", existing.id)
        : await supabase.from("sellers").insert(payload);

      if (error) throw error;


      toast({
        title: "Application Submitted! 🎉",
        description: "Your seller application has been submitted for review. We'll notify you once approved.",
      });

      navigate("/seller/pending");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to submit application",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateAddress = (field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      warehouseAddress: { ...prev.warehouseAddress, [field]: value },
    }));
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-12">
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <Store className="h-12 w-12 mx-auto text-primary mb-4" />
              <CardTitle>Become a Seller</CardTitle>
              <CardDescription>Please login to register as a seller</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/login")} className="w-full">
                Login to Continue
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-6 md:py-12 pb-32 md:pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Store className="h-12 w-12 mx-auto text-primary mb-4" />
            <h1 className="text-3xl font-bold">Become a Seller</h1>
            <p className="text-muted-foreground mt-2">
              Start selling your products to millions of customers
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5 mb-6">
                <TabsTrigger value="shop" className="text-xs md:text-sm">
                  <Store className="h-4 w-4 mr-1 md:mr-2" />
                  <span className="hidden md:inline">Shop</span>
                </TabsTrigger>
                <TabsTrigger value="business" className="text-xs md:text-sm">
                  <Building2 className="h-4 w-4 mr-1 md:mr-2" />
                  <span className="hidden md:inline">Business</span>
                </TabsTrigger>
                <TabsTrigger value="identity" className="text-xs md:text-sm">
                  <User className="h-4 w-4 mr-1 md:mr-2" />
                  <span className="hidden md:inline">Identity</span>
                </TabsTrigger>
                <TabsTrigger value="payment" className="text-xs md:text-sm">
                  <CreditCard className="h-4 w-4 mr-1 md:mr-2" />
                  <span className="hidden md:inline">Payment</span>
                </TabsTrigger>
                <TabsTrigger value="documents" className="text-xs md:text-sm">
                  <FileText className="h-4 w-4 mr-1 md:mr-2" />
                  <span className="hidden md:inline">Docs</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="shop">
                <Card>
                  <CardHeader>
                    <CardTitle>Shop Information</CardTitle>
                    <CardDescription>Tell us about your shop</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="shopName">Shop Name *</Label>
                      <Input
                        id="shopName"
                        value={form.shopName}
                        onChange={(e) => updateForm("shopName", e.target.value)}
                        placeholder="Your Shop Name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="shopDescription">Shop Description</Label>
                      <Textarea
                        id="shopDescription"
                        value={form.shopDescription}
                        onChange={(e) => updateForm("shopDescription", e.target.value)}
                        placeholder="Describe your shop and what you sell..."
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="shopLogo">Shop Logo</Label>
                      <div className="flex items-center gap-4">
                        {shopLogo && (
                          <img
                            src={URL.createObjectURL(shopLogo)}
                            alt="Logo preview"
                            className="h-16 w-16 rounded-lg object-cover"
                          />
                        )}
                        <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-muted transition-colors">
                          <Upload className="h-4 w-4" />
                          Upload Logo
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => setShopLogo(e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contactEmail">Contact Email *</Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          value={form.contactEmail}
                          onChange={(e) => updateForm("contactEmail", e.target.value)}
                          placeholder="shop@example.com"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactPhone">Contact Phone *</Label>
                        <Input
                          id="contactPhone"
                          value={form.contactPhone}
                          onChange={(e) => updateForm("contactPhone", e.target.value)}
                          placeholder="+880 1XXX-XXXXXX"
                          required
                        />
                      </div>
                    </div>

                    <div className="pt-4">
                      <Button type="button" onClick={() => setActiveTab("business")}>
                        Next: Business Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="business">
                <Card>
                  <CardHeader>
                    <CardTitle>Business Information</CardTitle>
                    <CardDescription>Your business details (optional for individuals)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessType">Business Type</Label>
                      <Select
                        value={form.businessType}
                        onValueChange={(value) => updateForm("businessType", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">Individual / Sole Proprietor</SelectItem>
                          <SelectItem value="partnership">Partnership</SelectItem>
                          <SelectItem value="company">Private Limited Company</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {form.businessType !== "individual" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="businessName">Registered Business Name</Label>
                          <Input
                            id="businessName"
                            value={form.businessName}
                            onChange={(e) => updateForm("businessName", e.target.value)}
                            placeholder="Legal business name"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="businessRegistrationNumber">Registration Number</Label>
                            <Input
                              id="businessRegistrationNumber"
                              value={form.businessRegistrationNumber}
                              onChange={(e) => updateForm("businessRegistrationNumber", e.target.value)}
                              placeholder="Business registration number"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="taxId">TIN / Tax ID</Label>
                            <Input
                              id="taxId"
                              value={form.taxId}
                              onChange={(e) => updateForm("taxId", e.target.value)}
                              placeholder="Tax identification number"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="tradeLicenseNumber">
                        Trade License Number{" "}
                        {form.businessType !== "individual" && <span className="text-destructive">*</span>}
                      </Label>
                      <Input
                        id="tradeLicenseNumber"
                        value={form.tradeLicenseNumber}
                        onChange={(e) => updateForm("tradeLicenseNumber", e.target.value)}
                        placeholder={
                          form.businessType === "individual"
                            ? "Trade license number (optional)"
                            : "Trade license number (required)"
                        }
                        required={form.businessType !== "individual"}
                      />
                      <p className="text-xs text-muted-foreground">
                        {form.businessType === "individual"
                          ? "Optional for individuals / sole proprietors."
                          : "Required for Partnership and Limited companies."}
                      </p>
                    </div>


                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-medium mb-4">Warehouse / Pickup Address</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                          <Label>Street Address</Label>
                          <Input
                            value={form.warehouseAddress.street}
                            onChange={(e) => updateAddress("street", e.target.value)}
                            placeholder="House/Building, Street, Area"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>City</Label>
                          <Input
                            value={form.warehouseAddress.city}
                            onChange={(e) => updateAddress("city", e.target.value)}
                            placeholder="City"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>District</Label>
                          <Input
                            value={form.warehouseAddress.district}
                            onChange={(e) => updateAddress("district", e.target.value)}
                            placeholder="District"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Postal Code</Label>
                          <Input
                            value={form.warehouseAddress.postalCode}
                            onChange={(e) => updateAddress("postalCode", e.target.value)}
                            placeholder="Postal code"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setActiveTab("shop")}>
                        Previous
                      </Button>
                      <Button type="button" onClick={() => setActiveTab("identity")}>
                        Next: Identity
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="identity">
                <Card>
                  <CardHeader>
                    <CardTitle>Identity Verification</CardTitle>
                    <CardDescription>
                      Provide your National ID (NID) OR Birth Certificate. You can also upload both — everything you provide will be sent to the admin panel for review.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* NID Section */}
                    <div className="space-y-4 rounded-lg border p-4">
                      <div>
                        <h3 className="font-semibold">National ID (NID)</h3>
                        <p className="text-xs text-muted-foreground">Optional if you provide a Birth Certificate below.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nidNumber">NID Number</Label>
                        <Input
                          id="nidNumber"
                          value={form.nidNumber}
                          onChange={(e) => updateForm("nidNumber", e.target.value)}
                          placeholder="Enter your NID number"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>NID Front Side</Label>
                          <div className="border-2 border-dashed rounded-lg p-4 text-center">
                            {nidFrontImage ? (
                              <div className="space-y-2">
                                <img src={URL.createObjectURL(nidFrontImage)} alt="NID Front" className="max-h-32 mx-auto rounded" />
                                <p className="text-sm text-muted-foreground">{nidFrontImage.name}</p>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setNidFrontImage(null)}>Remove</Button>
                              </div>
                            ) : (
                              <label className="cursor-pointer">
                                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">Click to upload NID front</p>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => setNidFrontImage(e.target.files?.[0] || null)} />
                              </label>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>NID Back Side</Label>
                          <div className="border-2 border-dashed rounded-lg p-4 text-center">
                            {nidBackImage ? (
                              <div className="space-y-2">
                                <img src={URL.createObjectURL(nidBackImage)} alt="NID Back" className="max-h-32 mx-auto rounded" />
                                <p className="text-sm text-muted-foreground">{nidBackImage.name}</p>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setNidBackImage(null)}>Remove</Button>
                              </div>
                            ) : (
                              <label className="cursor-pointer">
                                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">Click to upload NID back</p>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => setNidBackImage(e.target.files?.[0] || null)} />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Birth Certificate Section */}
                    <div className="space-y-4 rounded-lg border p-4">
                      <div>
                        <h3 className="font-semibold">Birth Certificate</h3>
                        <p className="text-xs text-muted-foreground">Optional if you provided an NID above. Number + photo both required if used.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="birthCertNumber">Birth Certificate Number</Label>
                        <Input
                          id="birthCertNumber"
                          value={form.birthCertNumber}
                          onChange={(e) => updateForm("birthCertNumber", e.target.value)}
                          placeholder="Enter your birth certificate number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Birth Certificate Photo</Label>
                        <div className="border-2 border-dashed rounded-lg p-4 text-center">
                          {birthCertImage ? (
                            <div className="space-y-2">
                              <img src={URL.createObjectURL(birthCertImage)} alt="Birth Certificate" className="max-h-40 mx-auto rounded" />
                              <p className="text-sm text-muted-foreground">{birthCertImage.name}</p>
                              <Button type="button" variant="ghost" size="sm" onClick={() => setBirthCertImage(null)}>Remove</Button>
                            </div>
                          ) : (
                            <label className="cursor-pointer">
                              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                              <p className="text-sm font-medium">Upload Birth Certificate</p>
                              <p className="text-xs text-muted-foreground mt-1">JPG or PNG</p>
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => setBirthCertImage(e.target.files?.[0] || null)} />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      At least one document (NID number or Birth Certificate with photo) is required to continue.
                    </p>

                    <div className="flex gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setActiveTab("business")}>
                        Previous
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          const hasNid = !!form.nidNumber.trim();
                          const hasBirthCert = !!form.birthCertNumber.trim() && !!birthCertImage;
                          if (!hasNid && !hasBirthCert) {
                            toast({
                              title: "Identity document required",
                              description: "Provide your NID number, or a Birth Certificate number with photo. You can also provide both.",
                              variant: "destructive",
                            });
                            return;
                          }
                          setActiveTab("payment");
                        }}
                      >
                        Next: Payment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payment">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Information</CardTitle>
                    <CardDescription>How you'll receive your payouts</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">Bank Account (Recommended)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="bankName">Bank Name</Label>
                          <Input
                            id="bankName"
                            value={form.bankName}
                            onChange={(e) => updateForm("bankName", e.target.value)}
                            placeholder="Select your bank"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bankBranch">Branch Name</Label>
                          <Input
                            id="bankBranch"
                            value={form.bankBranch}
                            onChange={(e) => updateForm("bankBranch", e.target.value)}
                            placeholder="Branch name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bankAccountName">Account Holder Name</Label>
                          <Input
                            id="bankAccountName"
                            value={form.bankAccountName}
                            onChange={(e) => updateForm("bankAccountName", e.target.value)}
                            placeholder="Name as on bank account"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bankAccountNumber">Account Number</Label>
                          <Input
                            id="bankAccountNumber"
                            value={form.bankAccountNumber}
                            onChange={(e) => updateForm("bankAccountNumber", e.target.value)}
                            placeholder="Bank account number"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-4">
                      <h4 className="font-medium">Mobile Banking (Alternative)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="mobileBankingProvider">Provider</Label>
                          <Select
                            value={form.mobileBankingProvider}
                            onValueChange={(value) => updateForm("mobileBankingProvider", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bkash">bKash</SelectItem>
                              <SelectItem value="nagad">Nagad</SelectItem>
                              <SelectItem value="rocket">Rocket</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="mobileBankingNumber">Mobile Number</Label>
                          <Input
                            id="mobileBankingNumber"
                            value={form.mobileBankingNumber}
                            onChange={(e) => updateForm("mobileBankingNumber", e.target.value)}
                            placeholder="01XXX-XXXXXX"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setActiveTab("identity")}>
                        Previous
                      </Button>
                      <Button type="button" onClick={() => setActiveTab("documents")}>
                        Next: Documents
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents">
                <Card>
                  <CardHeader>
                    <CardTitle>Supporting Documents</CardTitle>
                    <CardDescription>Upload required documents for verification</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>
                        Trade License{" "}
                        {form.businessType !== "individual" ? (
                          <span className="text-destructive">* (Required for {form.businessType.replace("_", " ")})</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">(optional for individuals)</span>
                        )}
                      </Label>
                      <div className="border-2 border-dashed rounded-lg p-6 text-center">
                        {tradeLicenseImage ? (
                          <div className="space-y-2">
                            <CheckCircle2 className="h-8 w-8 mx-auto text-green-500" />
                            <p className="text-sm font-medium">{tradeLicenseImage.name}</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setTradeLicenseImage(null)}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <label className="cursor-pointer">
                            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm font-medium">Upload Trade License</p>
                            <p className="text-xs text-muted-foreground mt-1">PDF, JPG, or PNG (max 5MB)</p>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => setTradeLicenseImage(e.target.files?.[0] || null)}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="terms"
                          checked={agreedToTerms}
                          onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                        />
                        <label htmlFor="terms" className="text-sm leading-relaxed">
                          I agree to the{" "}
                          <a href="/terms" className="text-primary hover:underline">
                            Terms of Service
                          </a>{" "}
                          and{" "}
                          <a href="/seller/terms" className="text-primary hover:underline">
                            Seller Agreement
                          </a>
                          . I confirm that all information provided is accurate and I am authorized to sell
                          products on this platform.
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setActiveTab("payment")}>
                        Previous
                      </Button>
                      <Button type="submit" disabled={loading || !agreedToTerms} className="flex-1">
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Store className="h-4 w-4 mr-2" />
                            Submit Application
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
