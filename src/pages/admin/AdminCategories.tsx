import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, MoreHorizontal, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/firebaseAdapter";
import { adminDb } from "@/lib/adminDb";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAdminCacheInvalidation } from "@/hooks/useRealtimeSync";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", is_active: true });
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  const { invalidateCategories, invalidateProducts } = useAdminCacheInvalidation();

  const defaultMasterCategories: Category[] = [
    { id: "cat-electronics", name: "Electronics & Gadgets", slug: "electronics", description: "Mobiles, Laptops, Accessories", is_active: true, sort_order: 1 },
    { id: "cat-home", name: "Home & Kitchen", slug: "home", description: "Home appliances and kitchenware", is_active: true, sort_order: 2 },
    { id: "cat-fashion", name: "Fashion & Clothing", slug: "fashion", description: "Men and Women Fashion", is_active: true, sort_order: 3 },
    { id: "cat-beauty", name: "Health & Beauty", slug: "beauty", description: "Skincare, Makeup & Personal Care", is_active: true, sort_order: 4 },
    { id: "cat-watches", name: "Watches & Accessories", slug: "watches", description: "Watches, Jewelry, Sunglasses", is_active: true, sort_order: 5 },
    { id: "cat-kids", name: "Toys & Baby Care", slug: "kids", description: "Toys, Baby products & Clothing", is_active: true, sort_order: 6 },
  ];

  const fetchCategories = async () => {
    const { data, error } = await adminDb.select<Category>("categories", {
      columns: "*",
      orderBy: { col: "sort_order", ascending: true },
    });
    if (error || !data || data.length === 0) {
      setCategories(defaultMasterCategories);
    } else {
      setCategories(data);
    }
    setLoading(false);
  };


  useEffect(() => {
    fetchCategories();

    // Set up real-time subscription
    const channel = supabase
      .channel("admin-categories-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
        },
        (payload) => {
          console.log("[Admin] Categories changed:", payload.eventType);
          fetchCategories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCategories();
    invalidateCategories();
    invalidateProducts(); // Products depend on categories
    toast({ title: "Categories synced" });
    setRefreshing(false);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      name: form.name,
      slug: form.slug || generateSlug(form.name),
      description: form.description || null,
      is_active: form.is_active,
    };

    let error: any = null;
    if (editingCategory) {
      ({ error } = await adminDb.update("categories", data, { id: editingCategory.id }));
    } else {
      ({ error } = await adminDb.insert("categories", data));
    }


    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: `Category ${editingCategory ? "updated" : "created"}` });
      setDialogOpen(false);
      setForm({ name: "", slug: "", description: "", is_active: true });
      setEditingCategory(null);
      fetchCategories();
      invalidateCategories(); // Sync with user pages
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      is_active: category.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    
    const { error } = await adminDb.remove("categories", { id });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Category deleted" });
      fetchCategories();
      invalidateCategories(); // Sync with user pages
    }
  };

  return (
    <AdminLayout title="Categories">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Categories</h1>
            <p className="text-muted-foreground">Manage product categories</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Sync
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditingCategory(null);
                setForm({ name: "", slug: "", description: "", is_active: true });
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCategory ? "Edit" : "Add"} Category</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value, slug: generateSlug(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                      id="slug"
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="is_active"
                      checked={form.is_active}
                      onCheckedChange={(c) => setForm({ ...form, is_active: c })}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                  <Button type="submit" className="w-full">
                    {editingCategory ? "Update" : "Create"} Category
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No categories found
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-muted-foreground">/{category.slug}</TableCell>
                    <TableCell>
                      <Badge variant={category.is_active ? "default" : "secondary"}>
                        {category.is_active ? "Active" : "Inactive"}
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
                          <DropdownMenuItem onClick={() => handleEdit(category)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(category.id)}
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
