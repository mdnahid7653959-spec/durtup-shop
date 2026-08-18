import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, MoreHorizontal, Copy } from "lucide-react";
import { supabase } from "@/lib/firebaseAdapter";
import { adminDb } from "@/lib/adminDb";
import { db } from "@/integrations/firebase/client";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: "",
    description: "",
    discount_type: "percentage",
    discount_value: "",
    min_order_amount: "",
    max_discount_amount: "",
    usage_limit: "",
    start_date: "",
    end_date: "",
    is_active: true,
  });
  const { toast } = useToast();

  const fetchCoupons = async () => {
    const firestoreCoupons: Coupon[] = [];
    try {
      const snap = await getDocs(collection(db, "coupons"));
      snap.forEach((d) => {
        const data = d.data();
        firestoreCoupons.push({
          id: d.id,
          code: data.code || d.id,
          description: data.description || null,
          discount_type: data.discount_type || data.discountType || "percentage",
          discount_value: Number(data.discount_value || data.discountValue || 0),
          min_order_amount: data.min_order_amount !== undefined ? Number(data.min_order_amount) : null,
          max_discount_amount: data.max_discount_amount !== undefined ? Number(data.max_discount_amount) : null,
          usage_limit: data.usage_limit !== undefined ? Number(data.usage_limit) : null,
          used_count: Number(data.used_count || 0),
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          is_active: data.is_active ?? true,
        });
      });
    } catch (e) {
      console.warn("Firestore coupons fetch warning:", e);
    }

    if (firestoreCoupons.length > 0) {
      setCoupons(firestoreCoupons);
    } else {
      const { data, error } = await adminDb.select<Coupon>("coupons", {
        columns: "*",
        orderBy: { col: "created_at", ascending: false },
      });

      if (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Error", description: "Failed to fetch coupons" });
      } else {
        setCoupons(data || []);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm({ ...form, code });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const rawCode = form.code.trim().toUpperCase();
    const couponId = editingCoupon ? editingCoupon.id : `coup_${rawCode}_${Date.now()}`;
    const data = {
      id: couponId,
      code: rawCode,
      description: form.description || null,
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value) || 0,
      min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : null,
      max_discount_amount: form.max_discount_amount ? parseFloat(form.max_discount_amount) : null,
      usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
      used_count: editingCoupon?.used_count || 0,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    // 1. Sync to Firestore
    try {
      await setDoc(doc(db, "coupons", couponId), data, { merge: true });
      await setDoc(doc(db, "coupons", rawCode), data, { merge: true });
    } catch (e) {
      console.warn("Firestore coupon save warning:", e);
    }

    // 2. Sync to DB & Supabase
    let error: any = null;
    if (editingCoupon) {
      ({ error } = await adminDb.update("coupons", data, { id: editingCoupon.id }));
      await supabase.from("coupons").update(data).eq("id", editingCoupon.id);
    } else {
      ({ error } = await adminDb.insert("coupons", data));
      await supabase.from("coupons").insert(data);
    }

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: `Coupon ${editingCoupon ? "updated" : "created"} successfully` });
      setDialogOpen(false);
      resetForm();
      fetchCoupons();
    }
    setSaving(false);
  };

  const resetForm = () => {
    setForm({
      code: "",
      description: "",
      discount_type: "percentage",
      discount_value: "",
      min_order_amount: "",
      max_discount_amount: "",
      usage_limit: "",
      start_date: "",
      end_date: "",
      is_active: true,
    });
    setEditingCoupon(null);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      description: coupon.description || "",
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value.toString(),
      min_order_amount: coupon.min_order_amount?.toString() || "",
      max_discount_amount: coupon.max_discount_amount?.toString() || "",
      usage_limit: coupon.usage_limit?.toString() || "",
      start_date: coupon.start_date?.split("T")[0] || "",
      end_date: coupon.end_date?.split("T")[0] || "",
      is_active: coupon.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;
    
    const targetCoupon = coupons.find(c => c.id === id);
    try {
      await deleteDoc(doc(db, "coupons", id));
      if (targetCoupon?.code) {
        await deleteDoc(doc(db, "coupons", targetCoupon.code));
      }
    } catch (e) {}

    const { error } = await adminDb.remove("coupons", { id });
    await supabase.from("coupons").delete().eq("id", id);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Coupon deleted successfully" });
      fetchCoupons();
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Coupon code copied!" });
  };

  return (
    <AdminLayout title="Coupons">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Coupons</h1>
            <p className="text-muted-foreground">Manage discount coupons and promotions</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Coupon
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCoupon ? "Edit" : "Create"} Coupon</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="code">Coupon Code *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      placeholder="SAVE20"
                      required
                    />
                    <Button type="button" variant="outline" onClick={generateCode}>
                      Generate
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="20% off all orders"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Discount Type</Label>
                    <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="discount_value">Discount Value *</Label>
                    <Input
                      id="discount_value"
                      type="number"
                      step="0.01"
                      value={form.discount_value}
                      onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                      placeholder={form.discount_type === "percentage" ? "20" : "10.00"}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="min_order_amount">Min Order Amount</Label>
                    <Input
                      id="min_order_amount"
                      type="number"
                      step="0.01"
                      value={form.min_order_amount}
                      onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
                      placeholder="50.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_discount_amount">Max Discount</Label>
                    <Input
                      id="max_discount_amount"
                      type="number"
                      step="0.01"
                      value={form.max_discount_amount}
                      onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })}
                      placeholder="100.00"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="usage_limit">Usage Limit</Label>
                  <Input
                    id="usage_limit"
                    type="number"
                    value={form.usage_limit}
                    onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                    placeholder="Unlimited"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="is_active"
                    checked={form.is_active}
                    onCheckedChange={(c) => setForm({ ...form, is_active: c })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Saving..." : editingCoupon ? "Update Coupon" : "Create Coupon"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : coupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No coupons found
                  </TableCell>
                </TableRow>
              ) : (
                coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold text-primary">{coupon.code}</code>
                        <button onClick={() => copyCode(coupon.code)} className="text-muted-foreground hover:text-foreground">
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                      {coupon.description && (
                        <p className="text-xs text-muted-foreground">{coupon.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {coupon.discount_type === "percentage" 
                          ? `${coupon.discount_value}%` 
                          : `$${coupon.discount_value.toFixed(2)}`}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {coupon.used_count} / {coupon.usage_limit || "∞"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={coupon.is_active ? "default" : "secondary"}>
                        {coupon.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => handleEdit(coupon)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(coupon.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
