import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { adminDb } from "@/lib/adminDb";
import { Package, AlertTriangle, TrendingDown, Bell, Settings, Search, RefreshCw, Warehouse, Layers, ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  stock_quantity: number;
  status: string;
}

interface InventoryAlert {
  id: string;
  product_id: string;
  alert_type: string;
  threshold: number;
  is_active: boolean;
  product?: Product;
}

interface WarehouseStock {
  id: string;
  warehouse_id: string;
  product_id: string;
  quantity: number;
  reserved_quantity: number;
  rack_location: string | null;
}

interface WarehouseInfo {
  id: string;
  name: string;
}

export default function AdminInventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [warehouseStocks, setWarehouseStocks] = useState<WarehouseStock[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [alertThreshold, setAlertThreshold] = useState(10);
  const [globalLowStockThreshold, setGlobalLowStockThreshold] = useState(10);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    loadThreshold();
  }, []);

  const loadThreshold = async () => {
    const { data } = await adminDb.select<{ key: string; value: any }>("site_settings", {
      filters: [{ col: "key", op: "eq", value: "low_stock_threshold" }],
      limit: 1,
    });
    const v = data?.[0]?.value;
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n) && n > 0) setGlobalLowStockThreshold(n);
  };

  const saveThreshold = async (value: number) => {
    const { error } = await adminDb.upsert("site_settings", {
      key: "low_stock_threshold",
      value,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save threshold" });
    } else {
      toast({ title: "Saved", description: "Threshold updated" });
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsRes, alertsRes, stocksRes, warehousesRes] = await Promise.all([
        adminDb.select<Product>("products", { columns: "id, name, sku, stock_quantity, status", orderBy: { col: "stock_quantity", ascending: true } }),
        adminDb.select<InventoryAlert>("inventory_alerts"),
        adminDb.select<WarehouseStock>("warehouse_stock"),
        adminDb.select<WarehouseInfo>("warehouses", { columns: "id, name" }),
      ]);
      if (productsRes.data) setProducts(productsRes.data);
      if (alertsRes.data) setAlerts(alertsRes.data);
      if (stocksRes.data) setWarehouseStocks(stocksRes.data);
      if (warehousesRes.data) setWarehouses(warehousesRes.data);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  const warehouseNameMap = new Map(warehouses.map((w) => [w.id, w.name]));

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (quantity <= globalLowStockThreshold) return { label: "Low Stock", variant: "secondary" as const };
    return { label: "In Stock", variant: "default" as const };
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku?.toLowerCase().includes(search.toLowerCase());
    
    if (filter === "out_of_stock") return matchesSearch && product.stock_quantity === 0;
    if (filter === "low_stock") return matchesSearch && product.stock_quantity > 0 && product.stock_quantity <= globalLowStockThreshold;
    if (filter === "in_stock") return matchesSearch && product.stock_quantity > globalLowStockThreshold;
    return matchesSearch;
  });

  const stats = {
    total: products.length,
    inStock: products.filter(p => p.stock_quantity > globalLowStockThreshold).length,
    lowStock: products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= globalLowStockThreshold).length,
    outOfStock: products.filter(p => p.stock_quantity === 0).length
  };

  const commitStock = async (product: Product, newQuantity: number) => {
    if (!Number.isFinite(newQuantity) || newQuantity < 0) {
      toast({ variant: "destructive", title: "Invalid", description: "Stock must be a non-negative number" });
      fetchData();
      return;
    }
    if (newQuantity === product.stock_quantity) return;

    const previous = product.stock_quantity;
    const { error } = await adminDb.update("products", { stock_quantity: newQuantity }, { id: product.id });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update stock" });
      fetchData();
      return;
    }

    // Write audit trail
    await adminDb.insert("inventory_logs", {
      product_id: product.id,
      previous_quantity: previous,
      new_quantity: newQuantity,
      quantity_change: newQuantity - previous,
      change_type: newQuantity > previous ? "restock" : "adjustment",
      notes: "Manual update from admin inventory page",
    });

    toast({ title: "Success", description: "Stock updated" });
    fetchData();
  };

  const createAlert = async () => {
    if (!selectedProduct) return;
    const existing = alerts.find(a => a.product_id === selectedProduct.id);
    if (existing) {
      const { error } = await adminDb.update("inventory_alerts", {
        alert_type: "low_stock",
        threshold: alertThreshold,
        is_active: true,
      }, { id: existing.id });
      if (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to update alert" });
        return;
      }
      toast({ title: "Success", description: "Alert updated" });
    } else {
      const { error } = await adminDb.insert("inventory_alerts", {
        product_id: selectedProduct.id,
        alert_type: "low_stock",
        threshold: alertThreshold,
        is_active: true,
      });
      if (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to create alert" });
        return;
      }
      toast({ title: "Success", description: "Alert created" });
    }
    setAlertDialogOpen(false);
    fetchData();
  };

  const toggleAlert = async (alertId: string, isActive: boolean) => {
    const { error } = await adminDb.update("inventory_alerts", { is_active: !isActive }, { id: alertId });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to toggle alert" });
    }
    fetchData();
  };

  if (loading) {
    return (
      <AdminLayout title="Inventory Management">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Inventory Management">
      <div className="space-y-6">
        {/* Header link to Warehouses */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              Stock & Inventory Control
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor catalog stock levels, set alerts, and track multi-warehouse allocations.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/admin/warehouses">
              <Warehouse className="h-4 w-4 mr-2" /> Multi-Warehouse Manager <ArrowUpRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Package className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.inStock}</p>
                  <p className="text-sm text-muted-foreground">In Stock</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
                  <p className="text-sm text-muted-foreground">Out of Stock</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Alert Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Label>Global Low Stock Threshold:</Label>
              <Input
                type="number"
                min={1}
                value={globalLowStockThreshold}
                onChange={(e) => setGlobalLowStockThreshold(Number(e.target.value))}
                onBlur={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n > 0) saveThreshold(n);
                }}
                className="w-24"
              />

              <span className="text-sm text-muted-foreground">Products with stock below this will be flagged</span>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <CardTitle>Stock Tracking & Multi-Warehouse Breakdown</CardTitle>
                <CardDescription>Monitor product inventory and warehouse distribution</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-[200px]"
                  />
                </div>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={fetchData}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Total Stock</TableHead>
                  <TableHead>Warehouse Allocations</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const status = getStockStatus(product.stock_quantity);
                  const hasAlert = alerts.some(a => a.product_id === product.id && a.is_active);
                  const productWhStocks = warehouseStocks.filter((s) => s.product_id === product.id);

                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.sku || "-"}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          defaultValue={product.stock_quantity}
                          key={`stock-${product.id}-${product.stock_quantity}`}
                          onBlur={(e) => commitStock(product, Number(e.target.value))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          }}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        {productWhStocks.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">Unallocated</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {productWhStocks.map((stk) => (
                              <Badge key={stk.id} variant="outline" className="text-xs">
                                {warehouseNameMap.get(stk.warehouse_id) || "WH"}: {stk.quantity}
                                {stk.rack_location ? ` (${stk.rack_location})` : ""}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={hasAlert ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => {
                            setSelectedProduct(product);
                            setAlertDialogOpen(true);
                          }}
                        >
                          <Bell className="h-4 w-4 mr-1" />
                          {hasAlert ? "Alert Set" : "Set Alert"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Active Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Active Alerts ({alerts.filter(a => a.is_active).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.filter(a => a.is_active).length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No active alerts</p>
            ) : (
              <div className="space-y-2">
                {alerts.filter(a => a.is_active).map((alert) => {
                  const product = products.find(p => p.id === alert.product_id);
                  return (
                    <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{product?.name || "Unknown Product"}</p>
                        <p className="text-sm text-muted-foreground">
                          Alert when stock falls below {alert.threshold}
                        </p>
                      </div>
                      <Switch
                        checked={alert.is_active}
                        onCheckedChange={() => toggleAlert(alert.id, alert.is_active)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alert Dialog */}
      <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Stock Alert for {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Alert Threshold</Label>
              <Input
                type="number"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(Number(e.target.value))}
                placeholder="Enter threshold quantity"
              />
              <p className="text-sm text-muted-foreground">
                You'll be notified when stock falls below this quantity
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlertDialogOpen(false)}>Cancel</Button>
            <Button onClick={createAlert}>Create Alert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
