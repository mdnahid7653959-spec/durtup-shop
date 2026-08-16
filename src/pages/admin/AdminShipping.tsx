import { useState, useEffect, useCallback } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/lib/firebaseAdapter";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Truck,
  MapPin,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  DollarSign,
} from "lucide-react";

interface ShippingZone {
  id: string;
  name: string;
  areas: string[];
  is_active: boolean;
  created_at: string;
}

interface ShippingRate {
  id: string;
  zone_id: string;
  courier_name: string;
  base_rate: number;
  per_kg_rate: number;
  cod_charge: number;
  cod_percentage: number;
  estimated_days: string | null;
  is_active: boolean;
}

const courierOptions = [
  { value: "pathao", label: "Pathao" },
  { value: "redx", label: "RedX" },
  { value: "steadfast", label: "SteadFast" },
  { value: "manual", label: "Manual/Custom" },
];

export default function AdminShipping() {
  const { admin } = useAdminAuth();
  const { toast } = useToast();
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("zones");
  
  // Zone Dialog
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [zoneForm, setZoneForm] = useState({ name: "", areas: "" });
  
  // Rate Dialog
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ShippingRate | null>(null);
  const [rateForm, setRateForm] = useState({
    zone_id: "",
    courier_name: "manual",
    base_rate: "",
    per_kg_rate: "",
    cod_charge: "",
    cod_percentage: "",
    estimated_days: "",
  });
  
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [zonesRes, ratesRes] = await Promise.all([
        supabase.from("shipping_zones").select("*").order("name"),
        supabase.from("shipping_rates").select("*").order("created_at"),
      ]);

      if (zonesRes.error) throw zonesRes.error;
      if (ratesRes.error) throw ratesRes.error;

      setZones(zonesRes.data || []);
      setRates(ratesRes.data || []);
    } catch (error) {
      console.error("Error fetching shipping data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Zone Functions
  const openZoneDialog = (zone?: ShippingZone) => {
    if (zone) {
      setEditingZone(zone);
      setZoneForm({ name: zone.name, areas: zone.areas.join(", ") });
    } else {
      setEditingZone(null);
      setZoneForm({ name: "", areas: "" });
    }
    setZoneDialogOpen(true);
  };

  const handleSaveZone = async () => {
    if (!zoneForm.name || !zoneForm.areas) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const areasArray = zoneForm.areas.split(",").map((a) => a.trim()).filter(Boolean);

      if (editingZone) {
        const { error } = await supabase
          .from("shipping_zones")
          .update({ name: zoneForm.name, areas: areasArray })
          .eq("id", editingZone.id);

        if (error) throw error;
        toast({ title: "Success", description: "Zone updated successfully" });
      } else {
        const { error } = await supabase
          .from("shipping_zones")
          .insert({ name: zoneForm.name, areas: areasArray });

        if (error) throw error;
        toast({ title: "Success", description: "Zone created successfully" });
      }

      setZoneDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save zone",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleZoneStatus = async (zone: ShippingZone) => {
    try {
      const { error } = await supabase
        .from("shipping_zones")
        .update({ is_active: !zone.is_active })
        .eq("id", zone.id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error("Error toggling zone status:", error);
    }
  };

  const deleteZone = async (zone: ShippingZone) => {
    if (!confirm("Delete this zone? This will also delete all associated rates.")) return;

    try {
      const { error } = await supabase
        .from("shipping_zones")
        .delete()
        .eq("id", zone.id);

      if (error) throw error;
      toast({ title: "Success", description: "Zone deleted successfully" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete zone",
        variant: "destructive",
      });
    }
  };

  // Rate Functions
  const openRateDialog = (rate?: ShippingRate) => {
    if (rate) {
      setEditingRate(rate);
      setRateForm({
        zone_id: rate.zone_id,
        courier_name: rate.courier_name,
        base_rate: rate.base_rate.toString(),
        per_kg_rate: rate.per_kg_rate.toString(),
        cod_charge: rate.cod_charge.toString(),
        cod_percentage: rate.cod_percentage.toString(),
        estimated_days: rate.estimated_days || "",
      });
    } else {
      setEditingRate(null);
      setRateForm({
        zone_id: zones[0]?.id || "",
        courier_name: "manual",
        base_rate: "",
        per_kg_rate: "0",
        cod_charge: "0",
        cod_percentage: "0",
        estimated_days: "",
      });
    }
    setRateDialogOpen(true);
  };

  const handleSaveRate = async () => {
    if (!rateForm.zone_id || !rateForm.base_rate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const rateData = {
        zone_id: rateForm.zone_id,
        courier_name: rateForm.courier_name,
        base_rate: parseFloat(rateForm.base_rate) || 0,
        per_kg_rate: parseFloat(rateForm.per_kg_rate) || 0,
        cod_charge: parseFloat(rateForm.cod_charge) || 0,
        cod_percentage: parseFloat(rateForm.cod_percentage) || 0,
        estimated_days: rateForm.estimated_days || null,
      };

      if (editingRate) {
        const { error } = await supabase
          .from("shipping_rates")
          .update(rateData)
          .eq("id", editingRate.id);

        if (error) throw error;
        toast({ title: "Success", description: "Rate updated successfully" });
      } else {
        const { error } = await supabase.from("shipping_rates").insert(rateData);

        if (error) throw error;
        toast({ title: "Success", description: "Rate created successfully" });
      }

      setRateDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save rate",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleRateStatus = async (rate: ShippingRate) => {
    try {
      const { error } = await supabase
        .from("shipping_rates")
        .update({ is_active: !rate.is_active })
        .eq("id", rate.id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error("Error toggling rate status:", error);
    }
  };

  const deleteRate = async (rate: ShippingRate) => {
    if (!confirm("Delete this shipping rate?")) return;

    try {
      const { error } = await supabase
        .from("shipping_rates")
        .delete()
        .eq("id", rate.id);

      if (error) throw error;
      toast({ title: "Success", description: "Rate deleted successfully" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete rate",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Shipping & Delivery">
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Shipping & Delivery">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="zones">
                <MapPin className="h-4 w-4 mr-2" />
                Shipping Zones
              </TabsTrigger>
              <TabsTrigger value="rates">
                <DollarSign className="h-4 w-4 mr-2" />
                Shipping Rates
              </TabsTrigger>
              <TabsTrigger value="couriers">
                <Truck className="h-4 w-4 mr-2" />
                Courier Settings
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={fetchData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              {activeTab === "zones" && (
                <Button onClick={() => openZoneDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Zone
                </Button>
              )}
              {activeTab === "rates" && (
                <Button onClick={() => openRateDialog()} disabled={zones.length === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rate
                </Button>
              )}
            </div>
          </div>

          {/* Zones Tab */}
          <TabsContent value="zones">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Zones</CardTitle>
                <CardDescription>
                  Define delivery areas and districts for shipping calculation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zone Name</TableHead>
                      <TableHead>Areas/Districts</TableHead>
                      <TableHead>Rates</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zones.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No shipping zones configured. Add your first zone to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      zones.map((zone) => (
                        <TableRow key={zone.id}>
                          <TableCell className="font-medium">{zone.name}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {zone.areas.slice(0, 3).map((area, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {area}
                                </Badge>
                              ))}
                              {zone.areas.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{zone.areas.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {rates.filter((r) => r.zone_id === zone.id).length} rates
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={zone.is_active}
                              onCheckedChange={() => toggleZoneStatus(zone)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openZoneDialog(zone)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteZone(zone)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
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

          {/* Rates Tab */}
          <TabsContent value="rates">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Rates</CardTitle>
                <CardDescription>
                  Configure delivery charges for each zone and courier
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zone</TableHead>
                      <TableHead>Courier</TableHead>
                      <TableHead>Base Rate</TableHead>
                      <TableHead>Per KG</TableHead>
                      <TableHead>COD Charge</TableHead>
                      <TableHead>Delivery Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No shipping rates configured. Add zones first, then configure rates.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rates.map((rate) => {
                        const zone = zones.find((z) => z.id === rate.zone_id);
                        return (
                          <TableRow key={rate.id}>
                            <TableCell className="font-medium">{zone?.name || "Unknown"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {rate.courier_name}
                              </Badge>
                            </TableCell>
                            <TableCell>৳{rate.base_rate}</TableCell>
                            <TableCell>৳{rate.per_kg_rate}</TableCell>
                            <TableCell>
                              {rate.cod_charge > 0 && `৳${rate.cod_charge}`}
                              {rate.cod_percentage > 0 && ` + ${rate.cod_percentage}%`}
                              {rate.cod_charge === 0 && rate.cod_percentage === 0 && "Free"}
                            </TableCell>
                            <TableCell>{rate.estimated_days || "N/A"}</TableCell>
                            <TableCell>
                              <Switch
                                checked={rate.is_active}
                                onCheckedChange={() => toggleRateStatus(rate)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => openRateDialog(rate)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => deleteRate(rate)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Couriers Tab */}
          <TabsContent value="couriers">
            <div className="grid gap-6 md:grid-cols-2">
              {courierOptions.map((courier) => (
                <Card key={courier.value}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Truck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{courier.label}</CardTitle>
                          <CardDescription>
                            {courier.value === "manual"
                              ? "Manual delivery handling"
                              : `API integration with ${courier.label}`}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={courier.value === "manual" ? "secondary" : "outline"}>
                        {courier.value === "manual" ? "Active" : "Coming Soon"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {courier.value === "manual" ? (
                      <p className="text-sm text-muted-foreground">
                        Handle deliveries manually without courier API integration. Perfect for local
                        deliveries or when using your own delivery staff.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Integrate with {courier.label} API for automated order processing, tracking,
                          and delivery updates.
                        </p>
                        <Button variant="outline" disabled>
                          Configure API
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Zone Dialog */}
        <Dialog open={zoneDialogOpen} onOpenChange={setZoneDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingZone ? "Edit Zone" : "Add Shipping Zone"}</DialogTitle>
              <DialogDescription>
                Define a delivery zone with associated areas or districts
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="zoneName">Zone Name *</Label>
                <Input
                  id="zoneName"
                  value={zoneForm.name}
                  onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                  placeholder="e.g., Dhaka Metro, Chittagong Division"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zoneAreas">Areas/Districts *</Label>
                <Input
                  id="zoneAreas"
                  value={zoneForm.areas}
                  onChange={(e) => setZoneForm({ ...zoneForm, areas: e.target.value })}
                  placeholder="e.g., Gulshan, Banani, Dhanmondi, Mirpur"
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple areas with commas
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setZoneDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveZone} disabled={saving}>
                {saving ? "Saving..." : editingZone ? "Update Zone" : "Add Zone"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rate Dialog */}
        <Dialog open={rateDialogOpen} onOpenChange={setRateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRate ? "Edit Rate" : "Add Shipping Rate"}</DialogTitle>
              <DialogDescription>
                Configure shipping charges for a zone and courier
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rateZone">Zone *</Label>
                  <Select
                    value={rateForm.zone_id}
                    onValueChange={(value) => setRateForm({ ...rateForm, zone_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rateCourier">Courier</Label>
                  <Select
                    value={rateForm.courier_name}
                    onValueChange={(value) => setRateForm({ ...rateForm, courier_name: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select courier" />
                    </SelectTrigger>
                    <SelectContent>
                      {courierOptions.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="baseRate">Base Rate (৳) *</Label>
                  <Input
                    id="baseRate"
                    type="number"
                    value={rateForm.base_rate}
                    onChange={(e) => setRateForm({ ...rateForm, base_rate: e.target.value })}
                    placeholder="60"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="perKgRate">Per KG Rate (৳)</Label>
                  <Input
                    id="perKgRate"
                    type="number"
                    value={rateForm.per_kg_rate}
                    onChange={(e) => setRateForm({ ...rateForm, per_kg_rate: e.target.value })}
                    placeholder="10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codCharge">COD Flat Charge (৳)</Label>
                  <Input
                    id="codCharge"
                    type="number"
                    value={rateForm.cod_charge}
                    onChange={(e) => setRateForm({ ...rateForm, cod_charge: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="codPercentage">COD Percentage (%)</Label>
                  <Input
                    id="codPercentage"
                    type="number"
                    value={rateForm.cod_percentage}
                    onChange={(e) => setRateForm({ ...rateForm, cod_percentage: e.target.value })}
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedDays">Estimated Delivery Time</Label>
                <Input
                  id="estimatedDays"
                  value={rateForm.estimated_days}
                  onChange={(e) => setRateForm({ ...rateForm, estimated_days: e.target.value })}
                  placeholder="e.g., 1-2 days, 3-5 days"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveRate} disabled={saving}>
                {saving ? "Saving..." : editingRate ? "Update Rate" : "Add Rate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
