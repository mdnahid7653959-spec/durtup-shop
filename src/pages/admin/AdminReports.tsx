import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/firebaseAdapter";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  TrendingUp, ShoppingCart, Users, DollarSign, Package, ArrowUpRight,
  Download, Wallet, Store, Percent, Activity, AlertTriangle
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface RevenueStats {
  today_revenue: number;
  yesterday_revenue: number;
  monthly_revenue: number;
  yearly_revenue: number;
  total_revenue: number;
  gross_revenue: number;
  net_revenue: number;
  commission_revenue: number;
  platform_profit: number;
}

interface OrderBreakdown {
  total_orders: number;
  pending_count: number;
  processing_count: number;
  shipped_count: number;
  delivered_count: number;
  cancelled_count: number;
  packed_count: number;
  refunded_count: number;
  returned_count: number;
  pending_amount: number;
  processing_amount: number;
  shipped_amount: number;
  delivered_amount: number;
  cancelled_amount: number;
  packed_amount: number;
  refunded_amount: number;
  returned_amount: number;
}

interface TimeseriesPoint {
  period_date: string;
  total_revenue: number;
  net_revenue: number;
  order_count: number;
}

interface TopProduct {
  product_id: string;
  product_name: string;
  total_quantity_sold: number;
  total_revenue: number;
}

interface TopSeller {
  seller_id: string;
  shop_name: string;
  business_name: string;
  total_sales: number;
  total_commission: number;
  order_count: number;
}

interface ConversionMetrics {
  total_visitors: number;
  cart_additions: number;
  checkouts_initiated: number;
  completed_orders: number;
  conversion_rate: number;
  cart_abandonment_rate: number;
}

interface FinancialSummary {
  platform_balance: number;
  total_payouts: number;
  pending_payouts: number;
  vat_collected: number;
  tax_liability: number;
}

interface InventoryHealth {
  low_stock_count: number;
  out_of_stock_count: number;
  total_products_tracked: number;
  total_valuation: number;
}

const currency = (n: number | null | undefined) =>
  `৳${Number(n || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

export default function AdminReports() {
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [orderBreakdown, setOrderBreakdown] = useState<OrderBreakdown | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);
  const [conversionMetrics, setConversionMetrics] = useState<ConversionMetrics | null>(null);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [inventoryHealth, setInventoryHealth] = useState<InventoryHealth | null>(null);
  const [totalUsers, setTotalUsers] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");
  const { toast } = useToast();

  useEffect(() => {
    fetchReports();
  }, [period]);

  const fetchReports = async () => {
    setLoading(true);
    const periodArg = `${period}d`;

    try {
      // Execute live Supabase RPC calls
      const [
        revRes,
        orderRes,
        timeseriesRes,
        topProdRes,
        topSellerRes,
        convRes,
        finRes,
        invRes,
        usersCountRes,
      ] = await Promise.all([
        supabase.rpc("get_admin_dashboard_revenue_stats"),
        supabase.rpc("get_admin_dashboard_order_breakdown"),
        supabase.rpc("get_admin_revenue_timeseries", { _period: periodArg }),
        supabase.rpc("get_admin_top_products", { _limit: 10 }),
        supabase.rpc("get_admin_top_sellers", { _limit: 10 }),
        supabase.rpc("get_admin_conversion_metrics"),
        supabase.rpc("get_admin_financial_summary"),
        supabase.rpc("get_admin_inventory_health_stats"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);

      if (revRes.data) setRevenueStats(revRes.data);
      if (orderRes.data) setOrderBreakdown(orderRes.data);
      if (timeseriesRes.data) setTimeseries(timeseriesRes.data);
      if (topProdRes.data) setTopProducts(topProdRes.data);
      if (topSellerRes.data) setTopSellers(topSellerRes.data);
      if (convRes.data) setConversionMetrics(convRes.data);
      if (finRes.data) setFinancialSummary(finRes.data);
      if (invRes.data) setInventoryHealth(invRes.data);
      setTotalUsers(usersCountRes.count || 0);

    } catch (error) {
      console.error("Error fetching admin reports via RPC:", error);
      toast({ title: "Failed to load report analytics", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const exportReports = () => {
    const csvData = [
      ["Date", "Total Revenue (BDT)", "Net Revenue (BDT)", "Orders"],
      ...timeseries.map(d => [
        d.period_date ? format(new Date(d.period_date), "yyyy-MM-dd") : d.period_date,
        d.total_revenue,
        d.net_revenue,
        d.order_count
      ])
    ];

    const csvContent = csvData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `admin-sales-report-${period}days.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Report exported successfully" });
  };

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#64748b"];

  // Orders by Status chart data directly derived from RPC get_admin_dashboard_order_breakdown
  const ordersByStatus = orderBreakdown ? [
    { name: "Delivered", value: orderBreakdown.delivered_count },
    { name: "Pending", value: orderBreakdown.pending_count },
    { name: "Processing", value: orderBreakdown.processing_count },
    { name: "Shipped", value: orderBreakdown.shipped_count },
    { name: "Packed", value: orderBreakdown.packed_count },
    { name: "Cancelled", value: orderBreakdown.cancelled_count },
    { name: "Refunded", value: orderBreakdown.refunded_count },
    { name: "Returned", value: orderBreakdown.returned_count },
  ].filter(item => item.value > 0) : [];

  const chartTimeseries = timeseries.map(d => ({
    date: d.period_date ? format(new Date(d.period_date), "MMM dd") : d.period_date,
    revenue: d.total_revenue || 0,
    netRevenue: d.net_revenue || 0,
    orders: d.order_count || 0,
  }));

  const totalPeriodRevenue = timeseries.reduce((sum, d) => sum + (d.total_revenue || 0), 0);
  const totalPeriodOrders = timeseries.reduce((sum, d) => sum + (d.order_count || 0), 0);
  const avgOrderValue = totalPeriodOrders > 0 ? totalPeriodRevenue / totalPeriodOrders : 0;

  if (loading) {
    return (
      <AdminLayout title="Reports & Analytics">
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
    <AdminLayout title="Reports & Analytics">
      <div className="space-y-6">
        {/* Period Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Analytics Overview</h2>
            <p className="text-muted-foreground text-sm">
              Live reports generated dynamically from Supabase RPC functions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportReports}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards powered by RPC */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Total Revenue ({period}d)</p>
                  <p className="text-2xl font-bold mt-1">{currency(totalPeriodRevenue || revenueStats?.total_revenue)}</p>
                </div>
                <div className="p-2.5 bg-emerald-500/15 text-emerald-600 rounded-lg">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Net: <span className="font-semibold text-foreground">{currency(revenueStats?.net_revenue)}</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Total Orders ({period}d)</p>
                  <p className="text-2xl font-bold mt-1">{(totalPeriodOrders || orderBreakdown?.total_orders || 0).toLocaleString()}</p>
                </div>
                <div className="p-2.5 bg-blue-500/15 text-blue-600 rounded-lg">
                  <ShoppingCart className="h-5 w-5" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Delivered: <span className="font-semibold text-foreground">{orderBreakdown?.delivered_count || 0}</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Avg. Order Value</p>
                  <p className="text-2xl font-bold mt-1">{currency(avgOrderValue)}</p>
                </div>
                <div className="p-2.5 bg-purple-500/15 text-purple-600 rounded-lg">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Commission: <span className="font-semibold text-foreground">{currency(revenueStats?.commission_revenue)}</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Conversion Rate</p>
                  <p className="text-2xl font-bold mt-1">{(conversionMetrics?.conversion_rate || 0).toFixed(1)}%</p>
                </div>
                <div className="p-2.5 bg-orange-500/15 text-orange-600 rounded-lg">
                  <Activity className="h-5 w-5" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Visitors: <span className="font-semibold text-foreground">{(conversionMetrics?.total_visitors || 0).toLocaleString()}</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Tabs */}
        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto p-1 bg-muted">
            <TabsTrigger value="sales">Sales Report</TabsTrigger>
            <TabsTrigger value="products">Product Performance</TabsTrigger>
            <TabsTrigger value="sellers">Seller Analytics</TabsTrigger>
            <TabsTrigger value="customers">Customer Analytics</TabsTrigger>
            <TabsTrigger value="finance">Financial & Stock Health</TabsTrigger>
          </TabsList>

          {/* Sales Report Tab */}
          <TabsContent value="sales">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Revenue Over Time (get_admin_revenue_timeseries)
                  </CardTitle>
                  <CardDescription>Daily revenue and order trend for the selected {period}-day period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    {chartTimeseries.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        No sales data found for the selected period.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartTimeseries}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted opacity-40" />
                          <XAxis dataKey="date" className="text-xs" />
                          <YAxis className="text-xs" tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                          <Tooltip formatter={(val: any, name: string) => name === "orders" ? [val, "Orders"] : [currency(val), name]} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            name="Total Revenue"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="netRevenue"
                            name="Net Revenue"
                            stroke="#10b981"
                            strokeWidth={1.5}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Orders by Status (get_admin_dashboard_order_breakdown)</CardTitle>
                  <CardDescription>Distribution of order statuses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {ordersByStatus.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        No orders recorded yet.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={ordersByStatus}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {ordersByStatus.map((_, index) => (
                              <Cell key={index} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(val: any) => [val, "Orders"]} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Product Performance Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Top Selling Products (get_admin_top_products)
                </CardTitle>
                <CardDescription>Products ranked dynamically by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                {topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">No top products data found.</p>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topProducts} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted opacity-40" />
                        <XAxis type="number" tickFormatter={(v) => currency(v)} />
                        <YAxis dataKey="product_name" type="category" width={180} className="text-xs" />
                        <Tooltip formatter={(val: any) => [currency(val), "Revenue"]} />
                        <Bar dataKey="total_revenue" name="Total Revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Seller Analytics Tab */}
          <TabsContent value="sellers">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Store className="h-4 w-4 text-primary" />
                  Top Performing Vendors (get_admin_top_sellers)
                </CardTitle>
                <CardDescription>Sellers ranked by total gross sales and platform commission</CardDescription>
              </CardHeader>
              <CardContent>
                {topSellers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">No seller sales data recorded.</p>
                ) : (
                  <div className="divide-y border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-4 p-3 bg-muted font-semibold text-xs text-muted-foreground uppercase">
                      <span>Shop / Business</span>
                      <span className="text-right">Orders</span>
                      <span className="text-right">Total Sales</span>
                      <span className="text-right">Commission</span>
                    </div>
                    {topSellers.map((s, idx) => (
                      <div key={s.seller_id || idx} className="grid grid-cols-4 p-3 items-center text-sm">
                        <div className="font-medium truncate">
                          #{idx + 1} {s.shop_name || s.business_name || `Seller #${s.seller_id}`}
                        </div>
                        <div className="text-right">{s.order_count}</div>
                        <div className="text-right font-semibold">{currency(s.total_sales)}</div>
                        <div className="text-right text-emerald-600 font-semibold">{currency(s.total_commission)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customer Analytics Tab */}
          <TabsContent value="customers">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{totalUsers.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Total Registered Users</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/15 rounded-lg">
                      <Activity className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{(conversionMetrics?.total_visitors || 0).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Total Visitors</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/15 rounded-lg">
                      <ShoppingCart className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{(conversionMetrics?.cart_additions || 0).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Cart Additions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-500/15 rounded-lg">
                      <Percent className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{(conversionMetrics?.conversion_rate || 0).toFixed(1)}%</p>
                      <p className="text-sm text-muted-foreground">Conversion Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Financial & Stock Health Tab */}
          <TabsContent value="finance">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-emerald-600" />
                    Financial Overview (get_admin_financial_summary)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-muted-foreground text-sm">Platform Available Balance</span>
                    <span className="font-bold text-lg text-emerald-600">{currency(financialSummary?.platform_balance)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-muted-foreground text-sm">Total Disbursed Payouts</span>
                    <span className="font-semibold text-sm">{currency(financialSummary?.total_payouts)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-muted-foreground text-sm">Pending Seller Payouts</span>
                    <span className="font-semibold text-sm text-amber-600">{currency(financialSummary?.pending_payouts)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">VAT Collected / Tax Liability</span>
                    <span className="font-semibold text-sm">{currency(financialSummary?.vat_collected ?? financialSummary?.tax_liability)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4 text-amber-600" />
                    Inventory Health Overview (get_admin_inventory_health_stats)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-muted-foreground text-sm">Total Inventory Valuation</span>
                    <span className="font-bold text-lg text-amber-600">{currency(inventoryHealth?.total_valuation)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-muted-foreground text-sm">Total Products Tracked</span>
                    <span className="font-semibold text-sm">{(inventoryHealth?.total_products_tracked || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-muted-foreground text-sm">Low Stock Items</span>
                    <span className="font-semibold text-sm text-amber-600">{inventoryHealth?.low_stock_count || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">Out of Stock Items</span>
                    <span className="font-semibold text-sm text-destructive">{inventoryHealth?.out_of_stock_count || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
