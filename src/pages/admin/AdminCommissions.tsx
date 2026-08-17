import { useState, useEffect, useCallback } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { adminDb } from "@/lib/adminDb";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Percent,
  RefreshCw,
  Edit,
  Save,
  DollarSign,
  TrendingUp,
  Tag,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

interface CategoryCommission {
  id: string;
  category_id: string;
  commission_rate: number;
  created_at: string;
}

interface CombinedCategory extends Category {
  commission_rate: number | null;
  commission_id: string | null;
}

export default function AdminCommissions() {
  const { admin } = useAdminAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<CombinedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultRate, setDefaultRate] = useState("10");
  const [editingCategory, setEditingCategory] = useState<CombinedCategory | null>(null);
  const [editRate, setEditRate] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [categoriesRes, commissionsRes] = await Promise.all([
        adminDb.select<Category>("categories", { filters: [{ col: "is_active", value: true }], orderBy: { col: "name" } }),
        adminDb.select<CategoryCommission>("category_commissions"),
      ]);
      if (categoriesRes.error) throw categoriesRes.error;
      if (commissionsRes.error) throw commissionsRes.error;

      const commissionMap = new Map<string, CategoryCommission>();
      commissionsRes.data?.forEach((c) => { commissionMap.set(c.category_id, c); });

      const combined: CombinedCategory[] = (categoriesRes.data || []).map((cat) => {
        const commission = commissionMap.get(cat.id);
        return {
          ...cat,
          commission_rate: commission?.commission_rate || null,
          commission_id: commission?.id || null,
        };
      });
      setCategories(combined);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openEditDialog = (category: CombinedCategory) => {
    setEditingCategory(category);
    setEditRate(category.commission_rate?.toString() || defaultRate);
    setDialogOpen(true);
  };

  const handleSaveCommission = async () => {
    if (!editingCategory) return;

    const rate = parseFloat(editRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast({
        title: "Invalid Rate",
        description: "Please enter a valid percentage between 0 and 100",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingCategory.commission_id) {
        const { error } = await adminDb.update("category_commissions", { commission_rate: rate }, { id: editingCategory.commission_id });
        if (error) throw error;
      } else {
        const { error } = await adminDb.insert("category_commissions", { category_id: editingCategory.id, commission_rate: rate });
        if (error) throw error;
      }
      toast({ title: "Success", description: "Commission rate saved successfully" });
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save commission rate", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const applyDefaultToAll = async () => {
    const rate = parseFloat(defaultRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast({
        title: "Invalid Rate",
        description: "Please enter a valid default percentage",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Apply ${rate}% commission rate to all categories without custom rates?`)) return;

    setSaving(true);
    try {
      const categoriesWithoutRate = categories.filter((c) => !c.commission_id);
      if (categoriesWithoutRate.length === 0) {
        toast({ title: "Info", description: "All categories already have custom rates" });
        return;
      }
      const insertData = categoriesWithoutRate.map((c) => ({ category_id: c.id, commission_rate: rate }));
      const { error } = await adminDb.insert("category_commissions", insertData);
      if (error) throw error;

      toast({
        title: "Success",
        description: `Applied ${rate}% to ${categoriesWithoutRate.length} categories`,
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to apply default rate",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Calculate stats
  const avgCommission =
    categories.filter((c) => c.commission_rate !== null).reduce((sum, c) => sum + (c.commission_rate || 0), 0) /
      Math.max(categories.filter((c) => c.commission_rate !== null).length, 1) || 0;

  const categoriesWithRate = categories.filter((c) => c.commission_rate !== null).length;

  if (loading) {
    return (
      <AdminLayout title="Commission Management">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Commission Management">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Tag className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{categories.length}</p>
                  <p className="text-xs text-muted-foreground">Total Categories</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/10">
                  <Percent className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{avgCommission.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Average Commission</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{categoriesWithRate}</p>
                  <p className="text-xs text-muted-foreground">Categories with Custom Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Default Rate Card */}
        <Card>
          <CardHeader>
            <CardTitle>Default Commission Rate</CardTitle>
            <CardDescription>
              Set a default commission rate to apply to categories without custom rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="space-y-2">
                <Label>Default Rate (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={defaultRate}
                    onChange={(e) => setDefaultRate(e.target.value)}
                    className="w-24"
                    min="0"
                    max="100"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
              <Button onClick={applyDefaultToAll} disabled={saving}>
                Apply to All Unconfigured Categories
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Category Commissions Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Category Commission Rates</CardTitle>
                <CardDescription>
                  Set custom commission rates for each product category
                </CardDescription>
              </div>
              <Button variant="outline" size="icon" onClick={fetchData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Commission Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => {
                  const parent = categories.find((c) => c.id === category.parent_id);
                  return (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {parent?.name || "—"}
                      </TableCell>
                      <TableCell>
                        {category.commission_rate !== null ? (
                          <span className="text-lg font-semibold">{category.commission_rate}%</span>
                        ) : (
                          <span className="text-muted-foreground">
                            Using default ({defaultRate}%)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {category.commission_rate !== null ? (
                          <Badge className="bg-green-500/10 text-green-600">Custom</Badge>
                        ) : (
                          <Badge variant="secondary">Default</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(category)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Commission Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Commission Rate</DialogTitle>
              <DialogDescription>
                Set the commission rate for {editingCategory?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <p className="text-sm font-medium">{editingCategory?.name}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="commissionRate"
                    type="number"
                    value={editRate}
                    onChange={(e) => setEditRate(e.target.value)}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-32"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  This percentage will be deducted from seller earnings for products in this category
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCommission} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
