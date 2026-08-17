import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/firebaseAdapter";
import { Truck, Plus, Trash2, Edit, MapPin, Package, ShoppingCart, Crown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface FreeDeliveryRule {
  id: string;
  name: string;
  rule_type: string;
  conditions: any;
  is_active: boolean;
  priority: number;
  start_date: string | null;
  end_date: string | null;
}

export default function AdminFreeDelivery() {
  const [rules, setRules] = useState<FreeDeliveryRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<FreeDeliveryRule | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState<{
    name: string;
    rule_type: string;
    conditions: Record<string, any>;
    priority: number;
    start_date: string;
    end_date: string;
  }>({
    name: "",
    rule_type: "minimum_order",
    conditions: { minimum_amount: 1000 },
    priority: 0,
    start_date: "",
    end_date: ""
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("free_delivery_rules")
      .select("*")
      .order("priority", { ascending: false });
    if (data) setRules(data);
    setLoading(false);
  };

  const saveRule = async () => {
    const data = {
      name: form.name,
      rule_type: form.rule_type,
      conditions: form.conditions,
      priority: form.priority,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      is_active: true
    };

    if (editingRule) {
      await supabase.from("free_delivery_rules").update(data).eq("id", editingRule.id);
      toast({ title: "Rule updated" });
    } else {
      await supabase.from("free_delivery_rules").insert(data);
      toast({ title: "Rule created" });
    }

    setDialogOpen(false);
    setEditingRule(null);
    resetForm();
    fetchRules();
  };

  const resetForm = () => {
    setForm({
      name: "",
      rule_type: "minimum_order",
      conditions: { minimum_amount: 1000 },
      priority: 0,
      start_date: "",
      end_date: ""
    });
  };

  const toggleRule = async (id: string, isActive: boolean) => {
    await supabase.from("free_delivery_rules").update({ is_active: !isActive }).eq("id", id);
    fetchRules();
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    await supabase.from("free_delivery_rules").delete().eq("id", id);
    fetchRules();
  };

  const getRuleIcon = (type: string) => {
    switch (type) {
      case "minimum_order": return ShoppingCart;
      case "category": return Package;
      case "location": return MapPin;
      case "membership": return Crown;
      default: return Truck;
    }
  };

  const getRuleDescription = (rule: FreeDeliveryRule) => {
    const conditions = rule.conditions as any;
    switch (rule.rule_type) {
      case "minimum_order":
        return `Orders over ৳${conditions?.minimum_amount || 0}`;
      case "category":
        return `Specific categories`;
      case "location":
        return `Specific delivery areas`;
      case "membership":
        return `Loyalty members only`;
      case "product":
        return `Selected products`;
      default:
        return "-";
    }
  };

  const updateConditions = (key: string, value: any) => {
    setForm({
      ...form,
      conditions: { ...form.conditions, [key]: value }
    });
  };

  if (loading) {
    return (
      <AdminLayout title="Free Delivery Settings">
        <div className="space-y-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-96" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Free Delivery Settings">
      <div className="space-y-6">
        {/* Info Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Free Delivery Rules</h3>
                <p className="text-muted-foreground">
                  Configure when customers qualify for free shipping. Rules are evaluated in priority order - 
                  higher priority rules are checked first.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rules Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Delivery Rules</CardTitle>
                <CardDescription>{rules.filter(r => r.is_active).length} active rules</CardDescription>
              </div>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No delivery rules configured
                    </TableCell>
                  </TableRow>
                ) : (
                  rules.map((rule) => {
                    const Icon = getRuleIcon(rule.rule_type);
                    return (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-muted rounded-lg">
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="font-medium">{rule.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {rule.rule_type.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {getRuleDescription(rule)}
                        </TableCell>
                        <TableCell>{rule.priority}</TableCell>
                        <TableCell>
                          <Switch
                            checked={rule.is_active}
                            onCheckedChange={() => toggleRule(rule.id, rule.is_active)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingRule(rule);
                                setForm({
                                  name: rule.name,
                                  rule_type: rule.rule_type,
                                  conditions: rule.conditions || {},
                                  priority: rule.priority,
                                  start_date: rule.start_date?.split("T")[0] || "",
                                  end_date: rule.end_date?.split("T")[0] || ""
                                });
                                setDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteRule(rule.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
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

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Truck className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{rules.filter(r => r.is_active).length}</p>
                  <p className="text-sm text-muted-foreground">Active Rules</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {rules.filter(r => r.rule_type === "minimum_order").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Minimum Order Rules</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Crown className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {rules.filter(r => r.rule_type === "membership").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Membership Rules</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rule Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Rule" : "Add Free Delivery Rule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Free delivery over ৳1000"
              />
            </div>
            <div className="space-y-2">
              <Label>Rule Type</Label>
              <Select value={form.rule_type} onValueChange={(v) => setForm({ ...form, rule_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimum_order">Minimum Order Amount</SelectItem>
                  <SelectItem value="category">Specific Category</SelectItem>
                  <SelectItem value="product">Specific Products</SelectItem>
                  <SelectItem value="location">Delivery Location</SelectItem>
                  <SelectItem value="membership">Loyalty Membership</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.rule_type === "minimum_order" && (
              <div className="space-y-2">
                <Label>Minimum Order Amount (৳)</Label>
                <Input
                  type="number"
                  value={form.conditions?.minimum_amount || 0}
                  onChange={(e) => updateConditions("minimum_amount", Number(e.target.value))}
                />
              </div>
            )}

            {form.rule_type === "membership" && (
              <div className="space-y-2">
                <Label>Minimum Tier</Label>
                <Select
                  value={form.conditions?.minimum_tier || "bronze"}
                  onValueChange={(v) => updateConditions("minimum_tier", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bronze">Bronze</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Priority (Higher = Checked First)</Label>
              <Input
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date (Optional)</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingRule(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={saveRule}>Save Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
