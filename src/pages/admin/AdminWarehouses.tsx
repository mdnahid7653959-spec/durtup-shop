import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminDb } from "@/lib/adminDb";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Warehouse as WarehouseIcon,
  MapPin,
  Phone,
  Loader2,
  ArrowRightLeft,
  Users,
  ShoppingCart,
  Layers,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Package,
} from "lucide-react";

// Types
interface Warehouse {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
}

interface WarehouseStock {
  id: string;
  warehouse_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  reserved_quantity: number;
  rack_location: string | null;
}

interface Product {
  id: string;
  name: string;
  sku: string | null;
  stock_quantity: number;
}

interface StockTransfer {
  id: string;
  transfer_number: string;
  source_warehouse_id: string;
  dest_warehouse_id: string;
  status: string;
  notes: string | null;
  created_by: string | null;
  received_by: string | null;
  created_at: string;
}

interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  warehouse_id: string;
  total_amount: number;
  status: string;
  expected_date: string | null;
  created_by: string | null;
  created_at: string;
}

export default function AdminWarehouses() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("warehouses");

  // State: Warehouse Dialog
  const [warehouseDialogOpen, setWarehouseDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [warehouseForm, setWarehouseForm] = useState({
    name: "",
    address: "",
    city: "",
    country: "BD",
    contact_phone: "",
    is_active: true,
  });
  const [deleteWarehouseTarget, setDeleteWarehouseTarget] = useState<Warehouse | null>(null);

  // State: Stock Allocation Dialog
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<WarehouseStock | null>(null);
  const [stockForm, setStockForm] = useState({
    warehouse_id: "",
    product_id: "",
    quantity: 0,
    reserved_quantity: 0,
    rack_location: "",
  });

  // State: Stock Transfer Dialog
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    transfer_number: "",
    source_warehouse_id: "",
    dest_warehouse_id: "",
    status: "pending",
    notes: "",
  });

  // State: Supplier Dialog
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    tax_id: "",
    is_active: true,
  });
  const [deleteSupplierTarget, setDeleteSupplierTarget] = useState<Supplier | null>(null);

  // State: Purchase Order Dialog
  const [poDialogOpen, setPoDialogOpen] = useState(false);
  const [poForm, setPoForm] = useState({
    po_number: "",
    supplier_id: "",
    warehouse_id: "",
    total_amount: 0,
    status: "draft",
    expected_date: "",
  });

  // -------------------------------------------------------------
  // QUERIES
  // -------------------------------------------------------------
  const { data: warehouses = [], isLoading: warehousesLoading } = useQuery({
    queryKey: ["admin-warehouses"],
    queryFn: async () => {
      const { data, error } = await adminDb.select<Warehouse>("warehouses", {
        orderBy: { col: "created_at", ascending: false },
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: stocks = [], isLoading: stocksLoading } = useQuery({
    queryKey: ["admin-warehouse-stocks"],
    queryFn: async () => {
      const { data, error } = await adminDb.select<WarehouseStock>("warehouse_stock");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin-products-list"],
    queryFn: async () => {
      const { data, error } = await adminDb.select<Product>("products", {
        columns: "id, name, sku, stock_quantity",
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: transfers = [], isLoading: transfersLoading } = useQuery({
    queryKey: ["admin-stock-transfers"],
    queryFn: async () => {
      const { data, error } = await adminDb.select<StockTransfer>("stock_transfers", {
        orderBy: { col: "created_at", ascending: false },
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ["admin-suppliers"],
    queryFn: async () => {
      const { data, error } = await adminDb.select<Supplier>("suppliers", {
        orderBy: { col: "created_at", ascending: false },
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: purchaseOrders = [], isLoading: poLoading } = useQuery({
    queryKey: ["admin-purchase-orders"],
    queryFn: async () => {
      const { data, error } = await adminDb.select<PurchaseOrder>("purchase_orders", {
        orderBy: { col: "created_at", ascending: false },
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Maps for fast lookups
  const warehouseMap = new Map(warehouses.map((w) => [w.id, w.name]));
  const productMap = new Map(products.map((p) => [p.id, p]));
  const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));

  // -------------------------------------------------------------
  // MUTATIONS
  // -------------------------------------------------------------

  // Warehouses
  const saveWarehouseMutation = useMutation({
    mutationFn: async () => {
      if (!warehouseForm.name.trim()) throw new Error("Warehouse name is required");
      const payload = {
        name: warehouseForm.name.trim(),
        address: warehouseForm.address.trim() || null,
        city: warehouseForm.city.trim() || null,
        country: warehouseForm.country.trim() || "BD",
        contact_phone: warehouseForm.contact_phone.trim() || null,
        is_active: warehouseForm.is_active,
      };
      if (editingWarehouse) {
        const { error } = await adminDb.update("warehouses", payload, { id: editingWarehouse.id });
        if (error) throw error;
      } else {
        const { error } = await adminDb.insert("warehouses", payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editingWarehouse ? "Warehouse updated" : "Warehouse created" });
      qc.invalidateQueries({ queryKey: ["admin-warehouses"] });
      setWarehouseDialogOpen(false);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteWarehouseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await adminDb.remove("warehouses", { id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Warehouse deleted" });
      qc.invalidateQueries({ queryKey: ["admin-warehouses"] });
      setDeleteWarehouseTarget(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Stock Allocations
  const saveStockMutation = useMutation({
    mutationFn: async () => {
      if (!stockForm.warehouse_id || !stockForm.product_id) {
        throw new Error("Warehouse and Product are required");
      }
      const payload = {
        warehouse_id: stockForm.warehouse_id,
        product_id: stockForm.product_id,
        quantity: Number(stockForm.quantity) || 0,
        reserved_quantity: Number(stockForm.reserved_quantity) || 0,
        rack_location: stockForm.rack_location.trim() || null,
      };
      if (editingStock) {
        const { error } = await adminDb.update("warehouse_stock", payload, { id: editingStock.id });
        if (error) throw error;
      } else {
        const { error } = await adminDb.upsert("warehouse_stock", payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Stock allocation saved" });
      qc.invalidateQueries({ queryKey: ["admin-warehouse-stocks"] });
      setStockDialogOpen(false);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Stock Transfers
  const saveTransferMutation = useMutation({
    mutationFn: async () => {
      if (!transferForm.source_warehouse_id || !transferForm.dest_warehouse_id) {
        throw new Error("Source and Destination warehouses are required");
      }
      if (transferForm.source_warehouse_id === transferForm.dest_warehouse_id) {
        throw new Error("Source and Destination warehouses must be different");
      }
      const transferNumber =
        transferForm.transfer_number.trim() || `TRF-${Date.now().toString().slice(-6)}`;
      const payload = {
        transfer_number: transferNumber,
        source_warehouse_id: transferForm.source_warehouse_id,
        dest_warehouse_id: transferForm.dest_warehouse_id,
        status: transferForm.status,
        notes: transferForm.notes.trim() || null,
      };
      const { error } = await adminDb.insert("stock_transfers", payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Stock transfer created" });
      qc.invalidateQueries({ queryKey: ["admin-stock-transfers"] });
      setTransferDialogOpen(false);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateTransferStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await adminDb.update("stock_transfers", { status }, { id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Transfer status updated" });
      qc.invalidateQueries({ queryKey: ["admin-stock-transfers"] });
    },
  });

  // Suppliers
  const saveSupplierMutation = useMutation({
    mutationFn: async () => {
      if (!supplierForm.name.trim()) throw new Error("Supplier name is required");
      const payload = {
        name: supplierForm.name.trim(),
        contact_person: supplierForm.contact_person.trim() || null,
        email: supplierForm.email.trim() || null,
        phone: supplierForm.phone.trim() || null,
        address: supplierForm.address.trim() || null,
        tax_id: supplierForm.tax_id.trim() || null,
        is_active: supplierForm.is_active,
      };
      if (editingSupplier) {
        const { error } = await adminDb.update("suppliers", payload, { id: editingSupplier.id });
        if (error) throw error;
      } else {
        const { error } = await adminDb.insert("suppliers", payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editingSupplier ? "Supplier updated" : "Supplier created" });
      qc.invalidateQueries({ queryKey: ["admin-suppliers"] });
      setSupplierDialogOpen(false);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await adminDb.remove("suppliers", { id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Supplier deleted" });
      qc.invalidateQueries({ queryKey: ["admin-suppliers"] });
      setDeleteSupplierTarget(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Purchase Orders
  const savePoMutation = useMutation({
    mutationFn: async () => {
      if (!poForm.supplier_id || !poForm.warehouse_id) {
        throw new Error("Supplier and Warehouse are required");
      }
      const poNumber = poForm.po_number.trim() || `PO-${Date.now().toString().slice(-6)}`;
      const payload = {
        po_number: poNumber,
        supplier_id: poForm.supplier_id,
        warehouse_id: poForm.warehouse_id,
        total_amount: Number(poForm.total_amount) || 0,
        status: poForm.status,
        expected_date: poForm.expected_date || null,
      };
      const { error } = await adminDb.insert("purchase_orders", payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Purchase order created" });
      qc.invalidateQueries({ queryKey: ["admin-purchase-orders"] });
      setPoDialogOpen(false);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updatePoStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await adminDb.update("purchase_orders", { status }, { id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Purchase order status updated" });
      qc.invalidateQueries({ queryKey: ["admin-purchase-orders"] });
    },
  });

  // -------------------------------------------------------------
  // OPEN DIALOG HELPERS
  // -------------------------------------------------------------
  const openCreateWarehouse = () => {
    setEditingWarehouse(null);
    setWarehouseForm({ name: "", address: "", city: "", country: "BD", contact_phone: "", is_active: true });
    setWarehouseDialogOpen(true);
  };

  const openEditWarehouse = (w: Warehouse) => {
    setEditingWarehouse(w);
    setWarehouseForm({
      name: w.name || "",
      address: w.address || "",
      city: w.city || "",
      country: w.country || "BD",
      contact_phone: w.contact_phone || "",
      is_active: w.is_active,
    });
    setWarehouseDialogOpen(true);
  };

  const openCreateStock = () => {
    setEditingStock(null);
    setStockForm({
      warehouse_id: warehouses[0]?.id || "",
      product_id: products[0]?.id || "",
      quantity: 0,
      reserved_quantity: 0,
      rack_location: "",
    });
    setStockDialogOpen(true);
  };

  const openEditStock = (stk: WarehouseStock) => {
    setEditingStock(stk);
    setStockForm({
      warehouse_id: stk.warehouse_id,
      product_id: stk.product_id,
      quantity: stk.quantity,
      reserved_quantity: stk.reserved_quantity,
      rack_location: stk.rack_location || "",
    });
    setStockDialogOpen(true);
  };

  const openCreateTransfer = () => {
    setTransferForm({
      transfer_number: `TRF-${Date.now().toString().slice(-6)}`,
      source_warehouse_id: warehouses[0]?.id || "",
      dest_warehouse_id: warehouses[1]?.id || warehouses[0]?.id || "",
      status: "pending",
      notes: "",
    });
    setTransferDialogOpen(true);
  };

  const openCreateSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm({
      name: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
      tax_id: "",
      is_active: true,
    });
    setSupplierDialogOpen(true);
  };

  const openEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup);
    setSupplierForm({
      name: sup.name,
      contact_person: sup.contact_person || "",
      email: sup.email || "",
      phone: sup.phone || "",
      address: sup.address || "",
      tax_id: sup.tax_id || "",
      is_active: sup.is_active,
    });
    setSupplierDialogOpen(true);
  };

  const openCreatePo = () => {
    setPoForm({
      po_number: `PO-${Date.now().toString().slice(-6)}`,
      supplier_id: suppliers[0]?.id || "",
      warehouse_id: warehouses[0]?.id || "",
      total_amount: 0,
      status: "ordered",
      expected_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    });
    setPoDialogOpen(true);
  };

  return (
    <AdminLayout title="Warehouse & Supply Chain Management">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <WarehouseIcon className="h-6 w-6 text-primary" />
            Warehouses & Logistics
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage multi-warehouse allocations, stock transfers, suppliers, and purchase orders.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
            <TabsTrigger value="warehouses" className="flex items-center gap-2">
              <WarehouseIcon className="h-4 w-4" /> Warehouses
            </TabsTrigger>
            <TabsTrigger value="stocks" className="flex items-center gap-2">
              <Layers className="h-4 w-4" /> Stock Allocations
            </TabsTrigger>
            <TabsTrigger value="transfers" className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" /> Transfers
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Suppliers
            </TabsTrigger>
            <TabsTrigger value="po" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Purchase Orders
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: WAREHOUSES */}
          <TabsContent value="warehouses" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Fulfillment Warehouses</h2>
                <p className="text-xs text-muted-foreground">Active locations where inventory is stored</p>
              </div>
              <Button onClick={openCreateWarehouse}>
                <Plus className="h-4 w-4 mr-2" /> Add Warehouse
              </Button>
            </div>

            {warehousesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : warehouses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No warehouses created yet. Click <b>Add Warehouse</b> above.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {warehouses.map((w) => (
                  <Card key={w.id} className="flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">{w.name}</CardTitle>
                        <Badge variant={w.is_active ? "default" : "secondary"}>
                          {w.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 flex-1 flex flex-col">
                      <div className="space-y-2 text-sm flex-1">
                        {(w.address || w.city) && (
                          <div className="flex items-start gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>{[w.address, w.city, w.country].filter(Boolean).join(", ")}</span>
                          </div>
                        )}
                        {w.contact_phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4 shrink-0" />
                            <span>{w.contact_phone}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t">
                        <span className="text-xs text-muted-foreground">ID: {w.id.slice(0, 8)}...</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditWarehouse(w)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteWarehouseTarget(w)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: STOCK ALLOCATIONS */}
          <TabsContent value="stocks" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Multi-Warehouse Stock Allocations</h2>
                <p className="text-xs text-muted-foreground">Track inventory levels and rack locations per warehouse</p>
              </div>
              <Button onClick={openCreateStock} disabled={warehouses.length === 0 || products.length === 0}>
                <Plus className="h-4 w-4 mr-2" /> Allocate Stock
              </Button>
            </div>

            {stocksLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Warehouse</TableHead>
                        <TableHead>Total Quantity</TableHead>
                        <TableHead>Reserved</TableHead>
                        <TableHead>Available</TableHead>
                        <TableHead>Rack Location</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stocks.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No warehouse stock allocations recorded yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        stocks.map((stk) => {
                          const prod = productMap.get(stk.product_id);
                          const whName = warehouseMap.get(stk.warehouse_id) || "Unknown Warehouse";
                          const avail = (stk.quantity || 0) - (stk.reserved_quantity || 0);

                          return (
                            <TableRow key={stk.id}>
                              <TableCell>
                                <div className="font-medium">{prod?.name || "Unknown Product"}</div>
                                {prod?.sku && <div className="text-xs text-muted-foreground">SKU: {prod.sku}</div>}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-normal">
                                  {whName}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-semibold">{stk.quantity}</TableCell>
                              <TableCell className="text-muted-foreground">{stk.reserved_quantity}</TableCell>
                              <TableCell>
                                <Badge variant={avail > 0 ? "default" : "destructive"}>
                                  {avail} available
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {stk.rack_location ? (
                                  <code className="bg-muted px-2 py-0.5 rounded text-xs">
                                    {stk.rack_location}
                                  </code>
                                ) : (
                                  <span className="text-muted-foreground text-xs">Not specified</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => openEditStock(stk)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB 3: STOCK TRANSFERS */}
          <TabsContent value="transfers" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Stock Transfers</h2>
                <p className="text-xs text-muted-foreground">Manage inventory movements between fulfillment centers</p>
              </div>
              <Button onClick={openCreateTransfer} disabled={warehouses.length < 2}>
                <Plus className="h-4 w-4 mr-2" /> New Transfer
              </Button>
            </div>

            {transfersLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transfer #</TableHead>
                        <TableHead>Source Warehouse</TableHead>
                        <TableHead>Destination Warehouse</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Created Date</TableHead>
                        <TableHead className="w-28"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No stock transfers recorded yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        transfers.map((trf) => (
                          <TableRow key={trf.id}>
                            <TableCell className="font-mono font-medium">{trf.transfer_number}</TableCell>
                            <TableCell>{warehouseMap.get(trf.source_warehouse_id) || "Source N/A"}</TableCell>
                            <TableCell>{warehouseMap.get(trf.dest_warehouse_id) || "Dest N/A"}</TableCell>
                            <TableCell>
                              <Select
                                value={trf.status}
                                onValueChange={(status) =>
                                  updateTransferStatusMutation.mutate({ id: trf.id, status })
                                }
                              >
                                <SelectTrigger className="w-32 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="draft">Draft</SelectItem>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in_transit">In Transit</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                              {trf.notes || "No notes"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(trf.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  trf.status === "completed"
                                    ? "bg-green-500/10 text-green-600"
                                    : trf.status === "in_transit"
                                    ? "bg-blue-500/10 text-blue-600"
                                    : "bg-gray-500/10 text-gray-600"
                                }
                              >
                                {trf.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB 4: SUPPLIERS */}
          <TabsContent value="suppliers" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Suppliers Directory</h2>
                <p className="text-xs text-muted-foreground">Manage vendors and inventory procurement partners</p>
              </div>
              <Button onClick={openCreateSupplier}>
                <Plus className="h-4 w-4 mr-2" /> Add Supplier
              </Button>
            </div>

            {suppliersLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplier Name</TableHead>
                        <TableHead>Contact Person</TableHead>
                        <TableHead>Contact Info</TableHead>
                        <TableHead>Tax ID / BIN</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No suppliers registered. Click <b>Add Supplier</b>.
                          </TableCell>
                        </TableRow>
                      ) : (
                        suppliers.map((sup) => (
                          <TableRow key={sup.id}>
                            <TableCell className="font-medium">{sup.name}</TableCell>
                            <TableCell>{sup.contact_person || "N/A"}</TableCell>
                            <TableCell>
                              <div className="text-xs">{sup.email}</div>
                              <div className="text-xs text-muted-foreground">{sup.phone}</div>
                            </TableCell>
                            <TableCell className="text-xs font-mono">{sup.tax_id || "N/A"}</TableCell>
                            <TableCell>
                              <Badge variant={sup.is_active ? "default" : "secondary"}>
                                {sup.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openEditSupplier(sup)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteSupplierTarget(sup)}
                                >
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
            )}
          </TabsContent>

          {/* TAB 5: PURCHASE ORDERS */}
          <TabsContent value="po" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Purchase Orders (POs)</h2>
                <p className="text-xs text-muted-foreground">Issue and track procurement orders to suppliers</p>
              </div>
              <Button onClick={openCreatePo} disabled={suppliers.length === 0 || warehouses.length === 0}>
                <Plus className="h-4 w-4 mr-2" /> New Purchase Order
              </Button>
            </div>

            {poLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO #</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Target Warehouse</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Expected Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No purchase orders created yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        purchaseOrders.map((po) => (
                          <TableRow key={po.id}>
                            <TableCell className="font-mono font-medium">{po.po_number}</TableCell>
                            <TableCell>{supplierMap.get(po.supplier_id) || "Supplier N/A"}</TableCell>
                            <TableCell>{warehouseMap.get(po.warehouse_id) || "Warehouse N/A"}</TableCell>
                            <TableCell className="font-bold">৳{po.total_amount?.toLocaleString() || 0}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {po.expected_date ? new Date(po.expected_date).toLocaleDateString() : "N/A"}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={po.status}
                                onValueChange={(status) => updatePoStatusMutation.mutate({ id: po.id, status })}
                              >
                                <SelectTrigger className="w-36 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="draft">Draft</SelectItem>
                                  <SelectItem value="ordered">Ordered</SelectItem>
                                  <SelectItem value="partially_received">Partially Received</SelectItem>
                                  <SelectItem value="received">Received</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* DIALOG 1: Create/Edit Warehouse */}
      <Dialog open={warehouseDialogOpen} onOpenChange={setWarehouseDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingWarehouse ? "Edit Warehouse" : "Add Warehouse"}</DialogTitle>
            <DialogDescription>Enter warehouse fulfillment location details.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveWarehouseMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="w-name">Warehouse Name *</Label>
              <Input
                id="w-name"
                value={warehouseForm.name}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                placeholder="e.g. Central Dhaka Hub"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="w-address">Address</Label>
              <Textarea
                id="w-address"
                value={warehouseForm.address}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })}
                placeholder="Street address..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="w-city">City</Label>
                <Input
                  id="w-city"
                  value={warehouseForm.city}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, city: e.target.value })}
                  placeholder="Dhaka"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="w-phone">Contact Phone</Label>
                <Input
                  id="w-phone"
                  value={warehouseForm.contact_phone}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, contact_phone: e.target.value })}
                  placeholder="+8801700000000"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="w-active">Is Active</Label>
              <Switch
                id="w-active"
                checked={warehouseForm.is_active}
                onCheckedChange={(checked) => setWarehouseForm({ ...warehouseForm, is_active: checked })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setWarehouseDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveWarehouseMutation.isPending}>
                {saveWarehouseMutation.isPending ? "Saving..." : "Save Warehouse"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Stock Allocation */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingStock ? "Edit Stock Allocation" : "Allocate Warehouse Stock"}</DialogTitle>
            <DialogDescription>Assign stock quantity and location for a product in a warehouse.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveStockMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Product *</Label>
              <Select
                value={stockForm.product_id}
                onValueChange={(val) => setStockForm({ ...stockForm, product_id: val })}
                disabled={!!editingStock}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.sku ? `(${p.sku})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Warehouse *</Label>
              <Select
                value={stockForm.warehouse_id}
                onValueChange={(val) => setStockForm({ ...stockForm, warehouse_id: val })}
                disabled={!!editingStock}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="stk-qty">Quantity</Label>
                <Input
                  id="stk-qty"
                  type="number"
                  min="0"
                  value={stockForm.quantity}
                  onChange={(e) => setStockForm({ ...stockForm, quantity: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stk-reserved">Reserved Quantity</Label>
                <Input
                  id="stk-reserved"
                  type="number"
                  min="0"
                  value={stockForm.reserved_quantity}
                  onChange={(e) => setStockForm({ ...stockForm, reserved_quantity: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stk-rack">Rack Location / Aisle</Label>
              <Input
                id="stk-rack"
                value={stockForm.rack_location}
                onChange={(e) => setStockForm({ ...stockForm, rack_location: e.target.value })}
                placeholder="e.g. Aisle 4, Shelf B-2"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStockDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveStockMutation.isPending}>
                {saveStockMutation.isPending ? "Saving..." : "Save Stock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: Stock Transfer */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Stock Transfer</DialogTitle>
            <DialogDescription>Move inventory between fulfillment warehouses.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveTransferMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="trf-num">Transfer Number</Label>
              <Input
                id="trf-num"
                value={transferForm.transfer_number}
                onChange={(e) => setTransferForm({ ...transferForm, transfer_number: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Source Warehouse *</Label>
                <Select
                  value={transferForm.source_warehouse_id}
                  onValueChange={(val) => setTransferForm({ ...transferForm, source_warehouse_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Destination Warehouse *</Label>
                <Select
                  value={transferForm.dest_warehouse_id}
                  onValueChange={(val) => setTransferForm({ ...transferForm, dest_warehouse_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Initial Status</Label>
              <Select
                value={transferForm.status}
                onValueChange={(val) => setTransferForm({ ...transferForm, status: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trf-notes">Transfer Notes</Label>
              <Textarea
                id="trf-notes"
                value={transferForm.notes}
                onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                placeholder="Items list, tracking info or reason..."
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTransferDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveTransferMutation.isPending}>
                {saveTransferMutation.isPending ? "Creating..." : "Create Transfer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: Create/Edit Supplier */}
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
            <DialogDescription>Register procurement supplier details.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveSupplierMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="sup-name">Supplier Name *</Label>
              <Input
                id="sup-name"
                value={supplierForm.name}
                onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                placeholder="e.g. Apex Global Distributors"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-contact">Contact Person</Label>
              <Input
                id="sup-contact"
                value={supplierForm.contact_person}
                onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                placeholder="Contact name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="sup-email">Email</Label>
                <Input
                  id="sup-email"
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  placeholder="supplier@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sup-phone">Phone</Label>
                <Input
                  id="sup-phone"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  placeholder="+8801700000000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-tax">Tax ID / BIN</Label>
              <Input
                id="sup-tax"
                value={supplierForm.tax_id}
                onChange={(e) => setSupplierForm({ ...supplierForm, tax_id: e.target.value })}
                placeholder="123456789"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="sup-active">Is Active</Label>
              <Switch
                id="sup-active"
                checked={supplierForm.is_active}
                onCheckedChange={(checked) => setSupplierForm({ ...supplierForm, is_active: checked })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSupplierDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveSupplierMutation.isPending}>
                {saveSupplierMutation.isPending ? "Saving..." : "Save Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 5: Purchase Order */}
      <Dialog open={poDialogOpen} onOpenChange={setPoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Purchase Order</DialogTitle>
            <DialogDescription>Issue PO to supplier for inventory replenishment.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              savePoMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="po-num">PO Number</Label>
              <Input
                id="po-num"
                value={poForm.po_number}
                onChange={(e) => setPoForm({ ...poForm, po_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Supplier *</Label>
              <Select
                value={poForm.supplier_id}
                onValueChange={(val) => setPoForm({ ...poForm, supplier_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Warehouse *</Label>
              <Select
                value={poForm.warehouse_id}
                onValueChange={(val) => setPoForm({ ...poForm, warehouse_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="po-amt">Total Amount (৳)</Label>
                <Input
                  id="po-amt"
                  type="number"
                  min="0"
                  value={poForm.total_amount}
                  onChange={(e) => setPoForm({ ...poForm, total_amount: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="po-date">Expected Delivery Date</Label>
                <Input
                  id="po-date"
                  type="date"
                  value={poForm.expected_date}
                  onChange={(e) => setPoForm({ ...poForm, expected_date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPoDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savePoMutation.isPending}>
                {savePoMutation.isPending ? "Creating..." : "Create PO"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Warehouse Alert */}
      <AlertDialog open={!!deleteWarehouseTarget} onOpenChange={() => setDeleteWarehouseTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Warehouse</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <b>{deleteWarehouseTarget?.name}</b>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteWarehouseTarget && deleteWarehouseMutation.mutate(deleteWarehouseTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Supplier Alert */}
      <AlertDialog open={!!deleteSupplierTarget} onOpenChange={() => setDeleteSupplierTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <b>{deleteSupplierTarget?.name}</b>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSupplierTarget && deleteSupplierMutation.mutate(deleteSupplierTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
