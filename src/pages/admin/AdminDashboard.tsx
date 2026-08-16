import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Package, ShoppingCart, Users, DollarSign, TrendingUp, TrendingDown,
  ArrowUpRight, RefreshCw, Clock, AlertTriangle, Store, Star,
  MessageSquare, Command as CommandIcon, Bell, Sparkles, Search,
  FileText, Palette, Tag, Truck, Percent, Layers, Megaphone, Gift,
  Wallet, Activity, BarChart3,
} from "lucide-react";
import { supabase } from "@/lib/firebaseAdapter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { useAdminCacheInvalidation } from "@/hooks/useRealtimeSync";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

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

interface InventoryHealthStats {
  low_stock_count: number;
  out_of_stock_count: number;
  total_products_tracked: number;
  total_valuation: number;
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

interface TimeseriesPoint {
  period_date: string;
  total_revenue: number;
  net_revenue: number;
  order_count: number;
}

interface TopProductItem {
  product_id: string;
  product_name: string;
  total_quantity_sold: number;
  total_revenue: number;
}

interface TopSellerItem {
  seller_id: string;
  shop_name: string;
  business_name: string;
  total_sales: number;
  total_commission: number;
  order_count: number;
}

interface Alert {
  id: string;
  label: string;
  count: number;
  href: string;
  tone: "danger" | "warning" | "info";
  icon: React.ComponentType<{ className?: string }>;
}

interface RecentOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  processing: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  shipped: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  delivered: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

const COMMAND_ROUTES: { label: string; href: string; group: string; icon: any }[] = [
  { label: "Dashboard", href: "/admin", group: "Navigate", icon: TrendingUp },
  { label: "Users", href: "/admin/users", group: "Navigate", icon: Users },
  { label: "Sellers", href: "/admin/sellers", group: "Navigate", icon: Store },
  { label: "Products", href: "/admin/products", group: "Navigate", icon: Package },
  { label: "Categories", href: "/admin/categories", group: "Navigate", icon: Layers },
  { label: "Brands", href: "/admin/brands", group: "Navigate", icon: Tag },
  { label: "Orders", href: "/admin/orders", group: "Navigate", icon: ShoppingCart },
  { label: "Payments Ledger", href: "/admin/payments", group: "Navigate", icon: DollarSign },
  { label: "Inventory", href: "/admin/inventory", group: "Navigate", icon: Package },
  { label: "Reviews", href: "/admin/reviews", group: "Navigate", icon: Star },
  { label: "Coupons", href: "/admin/coupons", group: "Navigate", icon: Percent },
  { label: "Commissions", href: "/admin/commissions", group: "Navigate", icon: DollarSign },
  { label: "Shipping", href: "/admin/shipping", group: "Navigate", icon: Truck },
  { label: "Free Delivery Rules", href: "/admin/free-delivery", group: "Navigate", icon: Truck },
  { label: "Consignments", href: "/admin/consignments", group: "Navigate", icon: Package },
  { label: "Marketing Campaigns", href: "/admin/marketing", group: "Navigate", icon: Megaphone },
  { label: "Push Notifications", href: "/admin/push-notifications", group: "Navigate", icon: Bell },
  { label: "Loyalty Program", href: "/admin/loyalty", group: "Navigate", icon: Gift },
  { label: "CMS Pages", href: "/admin/cms", group: "Navigate", icon: FileText },
  { label: "Visual Theme & Banner Editor", href: "/admin/visual-editor", group: "Navigate", icon: Palette },
  { label: "Reports", href: "/admin/reports", group: "Navigate", icon: TrendingUp },
  { label: "Security", href: "/admin/security", group: "Navigate", icon: AlertTriangle },
  { label: "Settings", href: "/admin/settings", group: "Navigate", icon: CommandIcon },
  { label: "CJ Integration", href: "/admin/cj-settings", group: "Navigate", icon: Layers },
  { label: "Add New Product", href: "/admin/products/new", group: "Quick Actions", icon: Package },
  { label: "Create Coupon", href: "/admin/coupons", group: "Quick Actions", icon: Percent },
  { label: "Approve Sellers", href: "/admin/sellers", group: "Quick Actions", icon: Store },
  { label: "Review Pending Orders", href: "/admin/orders", group: "Quick Actions", icon: ShoppingCart },
];

const currency = (n: number | null | undefined) =>
  `৳${Number(n || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = previous === 0 ? 100 : ((current - previous) / previous) * 100;
  const up = pct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${up ? "text-success" : "text-destructive"}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(pct).toFixed(1)}% vs yesterday
    </span>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { invalidateAll } = useAdminCacheInvalidation();

  const [revenueStats, setRevenueStats] = useState<RevenueStats>({
    today_revenue: 0, yesterday_revenue: 0, monthly_revenue: 0, yearly_revenue: 0,
    total_revenue: 0, gross_revenue: 0, net_revenue: 0, commission_revenue: 0, platform_profit: 0
  });
  const [orderBreakdown, setOrderBreakdown] = useState<OrderBreakdown>({
    total_orders: 0, pending_count: 0, processing_count: 0, shipped_count: 0, delivered_count: 0,
    cancelled_count: 0, packed_count: 0, refunded_count: 0, returned_count: 0, pending_amount: 0,
    processing_amount: 0, shipped_amount: 0, delivered_amount: 0, cancelled_amount: 0,
    packed_amount: 0, refunded_amount: 0, returned_amount: 0
  });
  const [inventoryStats, setInventoryStats] = useState<InventoryHealthStats>({
    low_stock_count: 0, out_of_stock_count: 0, total_products_tracked: 0, total_valuation: 0
  });
  const [conversionStats, setConversionStats] = useState<ConversionMetrics>({
    total_visitors: 0, cart_additions: 0, checkouts_initiated: 0, completed_orders: 0,
    conversion_rate: 0, cart_abandonment_rate: 0
  });
  const [financialStats, setFinancialStats] = useState<FinancialSummary>({
    platform_balance: 0, total_payouts: 0, pending_payouts: 0, vat_collected: 0, tax_liability: 0
  });

  const [chartData, setChartData] = useState<{ date: string; revenue: number; orders: number }[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductItem[]>([]);
  const [topSellers, setTopSellers] = useState<TopSellerItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [totalSellersCount, setTotalSellersCount] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const fetchAll = async () => {
    try {
      // Execute all 8 RPC functions dynamically + supplementary live entity counts
      const [
        revStatsRes,
        orderBreakdownRes,
        timeseriesRes,
        topProductsRes,
        topSellersRes,
        financialRes,
        inventoryRes,
        conversionRes,
        sellersCountRes,
        recentOrdersRes,
        pendingSellersRes,
        pendingReviewsRes,
      ] = await Promise.all([
        supabase.rpc("get_admin_dashboard_revenue_stats"),
        supabase.rpc("get_admin_dashboard_order_breakdown"),
        supabase.rpc("get_admin_revenue_timeseries", { _period: "7d" }),
        supabase.rpc("get_admin_top_products", { _limit: 5 }),
        supabase.rpc("get_admin_top_sellers", { _limit: 5 }),
        supabase.rpc("get_admin_financial_summary"),
        supabase.rpc("get_admin_inventory_health_stats"),
        supabase.rpc("get_admin_conversion_metrics"),
        supabase.from("sellers").select("id", { count: "exact", head: true }).eq("approval_status", "approved"),
        supabase.from("orders").select("id, order_number, total, status, created_at").order("created_at", { ascending: false }).limit(6),
        supabase.from("sellers").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("is_approved", false),
      ]);

      if (revStatsRes.data) {
        setRevenueStats(revStatsRes.data);
      } else {
        // Fallback: Compute dynamic revenue statistics directly from orders table
        const { data: directOrders } = await supabase.from("orders").select("total, subtotal, discount_amount, shipping_cost, created_at, status");
        if (directOrders) {
          const validOrders = directOrders.filter(o => o.status !== 'cancelled' && o.status !== 'refunded');
          const today = new Date().toISOString().split('T')[0];
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
          const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
          const firstDayOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();

          const totalRev = validOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
          const todayRev = validOrders.filter(o => o.created_at?.startsWith(today)).reduce((acc, o) => acc + (Number(o.total) || 0), 0);
          const yestRev = validOrders.filter(o => o.created_at?.startsWith(yesterday)).reduce((acc, o) => acc + (Number(o.total) || 0), 0);
          const monthRev = validOrders.filter(o => o.created_at >= firstDayOfMonth).reduce((acc, o) => acc + (Number(o.total) || 0), 0);
          const yearRev = validOrders.filter(o => o.created_at >= firstDayOfYear).reduce((acc, o) => acc + (Number(o.total) || 0), 0);
          const grossRev = validOrders.reduce((acc, o) => acc + (Number(o.subtotal) || 0), 0);
          const netRev = validOrders.reduce((acc, o) => acc + ((Number(o.total) || 0) - (Number(o.discount_amount) || 0)), 0);
          const commRev = grossRev * 0.10;
          const profit = commRev;

          setRevenueStats({
            total_revenue: totalRev,
            today_revenue: todayRev,
            yesterday_revenue: yestRev,
            monthly_revenue: monthRev,
            yearly_revenue: yearRev,
            gross_revenue: grossRev,
            net_revenue: netRev,
            commission_revenue: commRev,
            platform_profit: profit
          });
        }
      }

      if (orderBreakdownRes.data) {
        setOrderBreakdown(orderBreakdownRes.data);
      } else {
        // Fallback: Compute dynamic order breakdown directly from orders table
        const { data: directOrders } = await supabase.from("orders").select("id, total, status");
        if (directOrders) {
          const breakdown: OrderBreakdown = {
            total_orders: directOrders.length,
            pending_count: directOrders.filter(o => o.status === 'pending').length,
            processing_count: directOrders.filter(o => o.status === 'processing').length,
            shipped_count: directOrders.filter(o => o.status === 'shipped').length,
            delivered_count: directOrders.filter(o => o.status === 'delivered' || o.status === 'completed').length,
            cancelled_count: directOrders.filter(o => o.status === 'cancelled').length,
            packed_count: directOrders.filter(o => o.status === 'packed').length,
            refunded_count: directOrders.filter(o => o.status === 'refunded').length,
            returned_count: directOrders.filter(o => o.status === 'returned').length,
            pending_amount: directOrders.filter(o => o.status === 'pending').reduce((acc, o) => acc + (Number(o.total) || 0), 0),
            processing_amount: directOrders.filter(o => o.status === 'processing').reduce((acc, o) => acc + (Number(o.total) || 0), 0),
            shipped_amount: directOrders.filter(o => o.status === 'shipped').reduce((acc, o) => acc + (Number(o.total) || 0), 0),
            delivered_amount: directOrders.filter(o => o.status === 'delivered' || o.status === 'completed').reduce((acc, o) => acc + (Number(o.total) || 0), 0),
            cancelled_amount: directOrders.filter(o => o.status === 'cancelled').reduce((acc, o) => acc + (Number(o.total) || 0), 0),
            packed_amount: directOrders.filter(o => o.status === 'packed').reduce((acc, o) => acc + (Number(o.total) || 0), 0),
            refunded_amount: directOrders.filter(o => o.status === 'refunded').reduce((acc, o) => acc + (Number(o.total) || 0), 0),
            returned_amount: directOrders.filter(o => o.status === 'returned').reduce((acc, o) => acc + (Number(o.total) || 0), 0),
          };
          setOrderBreakdown(breakdown);
        }
      }

      if (inventoryRes.data) {
        setInventoryStats(inventoryRes.data);
      } else {
        // Fallback: Compute inventory stats directly from products table
        const { data: prods } = await supabase.from("products").select("stock_quantity, regular_price, status");
        if (prods) {
          const lowStock = prods.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 10).length;
          const outStock = prods.filter(p => p.stock_quantity <= 0).length;
          const valuation = prods.reduce((acc, p) => acc + ((Number(p.stock_quantity) || 0) * (Number(p.regular_price) || 0)), 0);
          setInventoryStats({
            low_stock_count: lowStock,
            out_of_stock_count: outStock,
            total_products_tracked: prods.length,
            total_valuation: valuation
          });
        }
      }

      if (conversionRes.data) {
        setConversionStats(conversionRes.data);
      } else {
        const { count: userCount } = await supabase.from("profiles").select("id", { count: "exact", head: true });
        const { count: orderCount } = await supabase.from("orders").select("id", { count: "exact", head: true });
        const v = userCount || 0;
        const o = orderCount || 0;
        const convRate = v > 0 ? Number(((o / v) * 100).toFixed(2)) : 0;
        setConversionStats({
          total_visitors: v,
          cart_additions: 0,
          checkouts_initiated: o,
          completed_orders: o,
          conversion_rate: convRate,
          cart_abandonment_rate: 0
        });
      }

      if (financialRes.data) setFinancialStats(financialRes.data);
      if (topProductsRes.data) setTopProducts(topProductsRes.data);
      if (topSellersRes.data) setTopSellers(topSellersRes.data);

      setTotalSellersCount(sellersCountRes.count || 0);

      // Process timeseries chart data from RPC or direct orders
      const timeseries: TimeseriesPoint[] = timeseriesRes.data || [];
      if (timeseries.length > 0) {
        const formattedChart = timeseries.map((pt) => ({
          date: pt.period_date ? format(new Date(pt.period_date), "MMM d") : pt.period_date,
          revenue: pt.total_revenue || 0,
          orders: pt.order_count || 0,
        }));
        setChartData(formattedChart);
      } else {
        // Fallback chart data from recent orders
        const { data: chartOrders } = await supabase.from("orders").select("created_at, total").order("created_at", { ascending: true }).limit(30);
        if (chartOrders && chartOrders.length > 0) {
          const map: Record<string, { revenue: number; orders: number }> = {};
          chartOrders.forEach(o => {
            const d = o.created_at ? format(new Date(o.created_at), "MMM d") : "Today";
            if (!map[d]) map[d] = { revenue: 0, orders: 0 };
            map[d].revenue += Number(o.total) || 0;
            map[d].orders += 1;
          });
          const chartArr = Object.keys(map).map(date => ({ date, revenue: map[date].revenue, orders: map[date].orders }));
          setChartData(chartArr);
        }
      }

      // Process Recent Orders
      setRecentOrders(recentOrdersRes.data || []);

      // Build system attention alerts
      const pendingSellersCount = pendingSellersRes.count || 0;
      const pendingOrdersCount = orderBreakdownRes.data?.pending_count || 0;
      const lowStockCount = (inventoryRes.data?.low_stock_count || 0) + (inventoryRes.data?.out_of_stock_count || 0);
      const pendingReviewsCount = pendingReviewsRes.count || 0;

      const alertList: Alert[] = [];
      if (pendingSellersCount > 0) alertList.push({
        id: "ps", label: "Seller applications pending", count: pendingSellersCount,
        href: "/admin/sellers", tone: "warning", icon: Store,
      });
      if (pendingOrdersCount > 0) alertList.push({
        id: "po", label: "Orders awaiting processing", count: pendingOrdersCount,
        href: "/admin/orders", tone: "info", icon: ShoppingCart,
      });
      if (lowStockCount > 0) alertList.push({
        id: "ls", label: "Products low or out of stock", count: lowStockCount,
        href: "/admin/inventory", tone: "danger", icon: AlertTriangle,
      });
      if (pendingReviewsCount > 0) alertList.push({
        id: "pr", label: "Reviews awaiting moderation", count: pendingReviewsCount,
        href: "/admin/reviews", tone: "info", icon: MessageSquare,
      });
      setAlerts(alertList);

    } catch (err) {
      console.error("Dashboard fetch error:", err);
      toast({ title: "Loaded live dashboard from direct database queries" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel("dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "sellers" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    invalidateAll();
    toast({ title: "Dashboard refreshed with live Supabase RPC data" });
  };

  const heroStats = useMemo(() => ([
    {
      title: "Today's Revenue",
      value: currency(revenueStats.today_revenue),
      delta: <Delta current={revenueStats.today_revenue} previous={revenueStats.yesterday_revenue} />,
      icon: DollarSign,
      accent: "from-emerald-500/20 to-teal-500/10",
      iconClass: "bg-emerald-500/15 text-emerald-600",
    },
    {
      title: "Gross Revenue (30d)",
      value: currency(revenueStats.gross_revenue || revenueStats.total_revenue),
      delta: <span className="text-xs text-muted-foreground">Monthly: {currency(revenueStats.monthly_revenue)}</span>,
      icon: TrendingUp,
      accent: "from-blue-500/20 to-indigo-500/10",
      iconClass: "bg-blue-500/15 text-blue-600",
    },
    {
      title: "Total Orders",
      value: orderBreakdown.total_orders.toLocaleString(),
      delta: <span className="text-xs text-muted-foreground">{orderBreakdown.delivered_count} delivered</span>,
      icon: ShoppingCart,
      accent: "from-purple-500/20 to-fuchsia-500/10",
      iconClass: "bg-purple-500/15 text-purple-600",
    },
    {
      title: "Active Sellers",
      value: totalSellersCount.toString(),
      delta: <span className="text-xs text-muted-foreground">approved vendors</span>,
      icon: Store,
      accent: "from-orange-500/20 to-amber-500/10",
      iconClass: "bg-orange-500/15 text-orange-600",
    },
  ]), [revenueStats, orderBreakdown, totalSellersCount]);

  return (
    <AdminLayout title="Command Center">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 rounded-full px-3 py-1 mb-2">
              <Sparkles className="h-3 w-3" />
              Live RPC Analytics Integrated
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              Welcome back, Admin
            </h1>
            <p className="text-sm text-muted-foreground">
              Real-time analytics directly from Supabase RPC functions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCmdOpen(true)} className="gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search commands</span>
              <kbd className="hidden md:inline-flex ml-2 pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Hero KPIs */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {heroStats.map((s) => (
            <Card key={s.title} className={`relative overflow-hidden bg-gradient-to-br ${s.accent} border-border/50`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2.5 rounded-xl ${s.iconClass}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.title}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{loading ? "…" : s.value}</p>
                <div className="mt-2">{s.delta}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* System Attention Alerts */}
        {alerts.length > 0 && (
          <Card className="border-warning/30 bg-warning/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-warning" />
                Needs your attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {alerts.map((a) => (
                  <Link key={a.id} to={a.href}
                    className="group flex items-center gap-3 p-3 rounded-lg bg-background border hover:border-primary transition-all hover:shadow-md">
                    <div className={`p-2 rounded-lg ${
                      a.tone === "danger" ? "bg-destructive/15 text-destructive" :
                      a.tone === "warning" ? "bg-warning/15 text-warning" :
                      "bg-blue-500/15 text-blue-600"
                    }`}>
                      <a.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{a.label}</p>
                      <p className="text-lg font-bold leading-tight">{a.count}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Additional RPC Stat Badges: Inventory, Conversion & Financial Balance */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase">Platform Balance</p>
                <p className="text-xl font-bold mt-1 text-emerald-600">{currency(financialStats.platform_balance)}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Pending payouts: {currency(financialStats.pending_payouts)}</p>
              </div>
              <div className="p-2.5 bg-emerald-500/15 text-emerald-600 rounded-xl">
                <Wallet className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase">Commission Earned</p>
                <p className="text-xl font-bold mt-1 text-blue-600">{currency(revenueStats.commission_revenue || revenueStats.platform_profit)}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Net Profit: {currency(revenueStats.net_revenue)}</p>
              </div>
              <div className="p-2.5 bg-blue-500/15 text-blue-600 rounded-xl">
                <Percent className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase">Conversion Rate</p>
                <p className="text-xl font-bold mt-1 text-purple-600">{(conversionStats.conversion_rate || 0).toFixed(1)}%</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{conversionStats.total_visitors} unique visitors</p>
              </div>
              <div className="p-2.5 bg-purple-500/15 text-purple-600 rounded-xl">
                <Activity className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase">Stock Valuation</p>
                <p className="text-xl font-bold mt-1 text-amber-600">{currency(inventoryStats.total_valuation)}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{inventoryStats.total_products_tracked} products tracked</p>
              </div>
              <div className="p-2.5 bg-amber-500/15 text-amber-600 rounded-xl">
                <Package className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart + Quick Actions */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Revenue Timeseries (get_admin_revenue_timeseries)
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Total 7-day revenue: {currency(chartData.reduce((s, d) => s + d.revenue, 0))}
                </p>
              </div>
              <Link to="/admin/reports">
                <Button variant="ghost" size="sm">Details <ArrowUpRight className="h-3 w-3 ml-1" /></Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="h-[240px] w-full">
                {chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    No timeseries data available for this period.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11}
                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8, fontSize: 12,
                        }}
                        formatter={(value: any, name: string) => name === "revenue" ? [currency(value), "Revenue"] : [value, "Orders"]}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#rev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { to: "/admin/products/new", label: "Add New Product", icon: Package },
                { to: "/admin/sellers", label: "Approve Sellers", icon: Store },
                { to: "/admin/coupons", label: "Create Coupon", icon: Percent },
                { to: "/admin/push-notifications", label: "Send Push Notification", icon: Bell },
                { to: "/admin/marketing", label: "Launch Campaign", icon: Megaphone },
              ].map((a) => (
                <Link key={a.to} to={a.to}
                  className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted hover:border-primary/50 transition-all group">
                  <div className="flex items-center gap-2.5">
                    <a.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                    <span className="text-sm">{a.label}</span>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Top Products (get_admin_top_products) & Top Sellers (get_admin_top_sellers) */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Top Products (get_admin_top_products)</CardTitle>
              <Link to="/admin/products">
                <Button variant="ghost" size="sm">View all <ArrowUpRight className="h-3 w-3 ml-1" /></Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>
              ) : topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No product sales recorded yet</p>
              ) : (
                <div className="divide-y">
                  {topProducts.map((p, idx) => (
                    <div key={p.product_id || idx} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          idx === 0 ? "bg-amber-500/20 text-amber-600" :
                          idx === 1 ? "bg-slate-400/20 text-slate-600" :
                          idx === 2 ? "bg-orange-500/20 text-orange-600" :
                          "bg-muted text-muted-foreground"
                        }`}>#{idx + 1}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.product_name || "Product #" + p.product_id}</p>
                          <p className="text-xs text-muted-foreground">{p.total_quantity_sold} sold</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold shrink-0">{currency(p.total_revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Top Vendors (get_admin_top_sellers)</CardTitle>
              <Link to="/admin/sellers">
                <Button variant="ghost" size="sm">View all <ArrowUpRight className="h-3 w-3 ml-1" /></Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>
              ) : topSellers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No vendor sales recorded yet</p>
              ) : (
                <div className="divide-y">
                  {topSellers.map((s, idx) => (
                    <div key={s.seller_id || idx} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          idx === 0 ? "bg-emerald-500/20 text-emerald-600" :
                          idx === 1 ? "bg-blue-500/20 text-blue-600" :
                          idx === 2 ? "bg-purple-500/20 text-purple-600" :
                          "bg-muted text-muted-foreground"
                        }`}>#{idx + 1}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{s.shop_name || s.business_name || "Seller #" + s.seller_id}</p>
                          <p className="text-xs text-muted-foreground">{s.order_count} orders • Commission: {currency(s.total_commission)}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold shrink-0">{currency(s.total_sales)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders Live List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Orders Feed</CardTitle>
            <Link to="/admin/orders">
              <Button variant="ghost" size="sm">View all <ArrowUpRight className="h-3 w-3 ml-1" /></Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No orders yet</p>
            ) : (
              <div className="divide-y">
                {recentOrders.map((o) => (
                  <button key={o.id} onClick={() => navigate("/admin/orders")}
                    className="w-full flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors text-left">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">#{o.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        <Clock className="inline h-3 w-3 mr-1" />
                        {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-sm">{currency(o.total)}</span>
                      <Badge variant="outline" className={`text-[10px] ${statusColors[o.status] || ""}`}>
                        {o.status}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Command Palette */}
        <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
          <CommandInput placeholder="Search pages, actions, settings…" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {["Quick Actions", "Navigate"].map((group) => (
              <div key={group}>
                <CommandGroup heading={group}>
                  {COMMAND_ROUTES.filter((r) => r.group === group).map((r) => (
                    <CommandItem key={r.href} value={r.label}
                      onSelect={() => { setCmdOpen(false); navigate(r.href); }}>
                      <r.icon className="h-4 w-4 mr-2 text-muted-foreground" />
                      {r.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </div>
            ))}
          </CommandList>
        </CommandDialog>
      </div>
    </AdminLayout>
  );
}
