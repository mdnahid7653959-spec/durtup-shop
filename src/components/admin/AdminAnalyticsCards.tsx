import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/firebaseAdapter";
import {
  DollarSign, ShoppingCart, TrendingUp, Users, Package, AlertTriangle,
  Wallet, PieChart as PieChartIcon, Percent, ArrowUpRight, TrendingDown
} from "lucide-react";

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

interface InventoryHealth {
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

const currency = (n: number | null | undefined) =>
  `৳${Number(n || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

export function AdminAnalyticsCards() {
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [orderBreakdown, setOrderBreakdown] = useState<OrderBreakdown | null>(null);
  const [inventoryHealth, setInventoryHealth] = useState<InventoryHealth | null>(null);
  const [conversionMetrics, setConversionMetrics] = useState<ConversionMetrics | null>(null);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      try {
        const [
          revRes,
          orderRes,
          invRes,
          convRes,
          finRes
        ] = await Promise.all([
          supabase.rpc("get_admin_dashboard_revenue_stats"),
          supabase.rpc("get_admin_dashboard_order_breakdown"),
          supabase.rpc("get_admin_inventory_health_stats"),
          supabase.rpc("get_admin_conversion_metrics"),
          supabase.rpc("get_admin_financial_summary")
        ]);

        if (revRes.data) setRevenueStats(revRes.data);
        if (orderRes.data) setOrderBreakdown(orderRes.data);
        if (invRes.data) setInventoryHealth(invRes.data);
        if (convRes.data) setConversionMetrics(convRes.data);
        if (finRes.data) setFinancialSummary(finRes.data);
      } catch (err) {
        console.error("Error loading admin analytics cards:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  const todayRev = revenueStats?.today_revenue ?? 0;
  const yesterdayRev = revenueStats?.yesterday_revenue ?? 0;
  const revDiff = todayRev - yesterdayRev;
  const revPct = yesterdayRev > 0 ? (revDiff / yesterdayRev) * 100 : todayRev > 0 ? 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <Card className="border-border/60 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Gross Revenue</p>
                <p className="text-2xl font-bold mt-1">
                  {loading ? "…" : currency(revenueStats?.gross_revenue ?? revenueStats?.total_revenue)}
                </p>
              </div>
              <div className="p-2.5 bg-emerald-500/15 text-emerald-600 rounded-xl">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Today: {currency(todayRev)}</span>
              {yesterdayRev > 0 || todayRev > 0 ? (
                <span className={`inline-flex items-center text-[11px] font-semibold ${revDiff >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {revDiff >= 0 ? <ArrowUpRight className="h-3 w-3 inline" /> : <TrendingDown className="h-3 w-3 inline" />}
                  {Math.abs(revPct).toFixed(1)}% vs yesterday
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Commission Revenue */}
        <Card className="border-border/60 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Commission Profit</p>
                <p className="text-2xl font-bold mt-1">
                  {loading ? "…" : currency(revenueStats?.commission_revenue ?? revenueStats?.platform_profit)}
                </p>
              </div>
              <div className="p-2.5 bg-blue-500/15 text-blue-600 rounded-xl">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Platform Balance: <span className="font-semibold text-foreground">{currency(financialSummary?.platform_balance)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card className="border-border/60 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Orders</p>
                <p className="text-2xl font-bold mt-1">
                  {loading ? "…" : (orderBreakdown?.total_orders ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="p-2.5 bg-indigo-500/15 text-indigo-600 rounded-xl">
                <ShoppingCart className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground flex gap-2">
              <span className="text-amber-600 font-medium">Pending: {orderBreakdown?.pending_count ?? 0}</span>
              <span>•</span>
              <span className="text-emerald-600 font-medium">Delivered: {orderBreakdown?.delivered_count ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card className="border-border/60 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Conversion Rate</p>
                <p className="text-2xl font-bold mt-1">
                  {loading ? "…" : `${(conversionMetrics?.conversion_rate ?? 0).toFixed(1)}%`}
                </p>
              </div>
              <div className="p-2.5 bg-purple-500/15 text-purple-600 rounded-xl">
                <Percent className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Visitors: <span className="font-semibold text-foreground">{(conversionMetrics?.total_visitors ?? 0).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Financial & Inventory Summary row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Inventory Valuation & Health */}
        <Card className="border-border/60 bg-card">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-amber-500" />
              Inventory Health
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Total Stock Valuation:</span>
              <span className="font-semibold">{currency(inventoryHealth?.total_valuation)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Products Tracked:</span>
              <span className="font-semibold">{(inventoryHealth?.total_products_tracked ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Low / Out of Stock:</span>
              <span className="font-semibold text-destructive">
                {(inventoryHealth?.low_stock_count ?? 0) + (inventoryHealth?.out_of_stock_count ?? 0)} items
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Financial & Payout Summary */}
        <Card className="border-border/60 bg-card">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-500" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Pending Seller Payouts:</span>
              <span className="font-semibold text-amber-600">{currency(financialSummary?.pending_payouts)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Total Disbursed Payouts:</span>
              <span className="font-semibold">{currency(financialSummary?.total_payouts)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">VAT Collected / Tax Liability:</span>
              <span className="font-semibold">{currency(financialSummary?.vat_collected ?? financialSummary?.tax_liability)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Order Conversion Funnel */}
        <Card className="border-border/60 bg-card">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-indigo-500" />
              Funnel Conversion
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Cart Additions:</span>
              <span className="font-semibold">{(conversionMetrics?.cart_additions ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Checkouts Initiated:</span>
              <span className="font-semibold">{(conversionMetrics?.checkouts_initiated ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Cart Abandonment Rate:</span>
              <span className="font-semibold text-amber-600">{(conversionMetrics?.cart_abandonment_rate ?? 0).toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
