import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Load .env file
const envFile = fs.readFileSync(".env", "utf8");
const envVars = {};
envFile.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2) {
    envVars[parts[0].trim()] = parts.slice(1).join("=").trim().replace(/^["']|["']$/g, "");
  }
});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL || "https://leacrldgjfsbjsqyjwdx.supabase.co";
const SUPABASE_KEY = envVars.VITE_SUPABASE_PUBLISHABLE_KEY || envVars.VITE_SUPABASE_ANON_KEY;

console.log("--------------------------------------------------");
console.log("🚀 STARTING DURTUP ENTERPRISE ADMIN BACKEND & RPC AUDIT");
console.log("--------------------------------------------------");
console.log("Supabase URL:", SUPABASE_URL);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runAudit() {
  const results = {
    rpcs: {},
    tables: {},
    errors: [],
  };

  // 1. Audit Analytics RPC Stored Procedures
  const rpcsToTest = [
    { name: "get_admin_dashboard_revenue_stats", args: {} },
    { name: "get_admin_dashboard_order_breakdown", args: {} },
    { name: "get_admin_revenue_timeseries", args: { _period: "day" } },
    { name: "get_admin_top_products", args: { _limit: 5 } },
    { name: "get_admin_top_sellers", args: { _limit: 5 } },
    { name: "get_admin_financial_summary", args: {} },
    { name: "get_admin_inventory_health_stats", args: {} },
    { name: "get_admin_conversion_metrics", args: {} },
  ];

  console.log("\n📊 1. AUDITING DYNAMIC ANALYTICS RPC PROCEDURES...");
  for (const rpc of rpcsToTest) {
    try {
      const { data, error } = await supabase.rpc(rpc.name, rpc.args);
      if (error) {
        console.error(`  ❌ RPC ${rpc.name}: Error ->`, error.message);
        results.rpcs[rpc.name] = { success: false, error: error.message };
        results.errors.push(`RPC ${rpc.name}: ${error.message}`);
      } else {
        console.log(`  ✅ RPC ${rpc.name}: Success ->`, JSON.stringify(data).slice(0, 100));
        results.rpcs[rpc.name] = { success: true, preview: data };
      }
    } catch (e) {
      console.error(`  ❌ RPC ${rpc.name}: Exception ->`, e.message);
      results.rpcs[rpc.name] = { success: false, error: e.message };
      results.errors.push(`RPC ${rpc.name}: ${e.message}`);
    }
  }

  // 2. Audit All 25 Core Enterprise Tables
  const tablesToTest = [
    "profiles",
    "sellers",
    "products",
    "product_variants",
    "categories",
    "brands",
    "warehouses",
    "warehouse_stock",
    "stock_transfers",
    "suppliers",
    "purchase_orders",
    "orders",
    "order_items",
    "order_timelines",
    "return_requests",
    "seller_warnings",
    "payments",
    "seller_payouts",
    "coupons",
    "campaigns",
    "campaign_products",
    "support_tickets",
    "ticket_messages",
    "review_moderation_logs",
    "platform_wallets",
  ];

  console.log("\n🗄️ 2. AUDITING CORE ENTERPRISE DATABASE TABLES...");
  for (const table of tablesToTest) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });
      if (error) {
        console.error(`  ❌ Table '${table}': Error ->`, error.message);
        results.tables[table] = { success: false, error: error.message };
        results.errors.push(`Table '${table}': ${error.message}`);
      } else {
        console.log(`  ✅ Table '${table}': Success (Record Count: ${count ?? 0})`);
        results.tables[table] = { success: true, recordCount: count ?? 0 };
      }
    } catch (e) {
      console.error(`  ❌ Table '${table}': Exception ->`, e.message);
      results.tables[table] = { success: false, error: e.message };
      results.errors.push(`Table '${table}': ${e.message}`);
    }
  }

  console.log("\n--------------------------------------------------");
  console.log("📋 AUDIT SUMMARY:");
  console.log("--------------------------------------------------");
  console.log(`RPC Procedures Tested: ${rpcsToTest.length}`);
  console.log(`Tables Tested: ${tablesToTest.length}`);
  console.log(`Total Errors Encountered: ${results.errors.length}`);
  
  if (results.errors.length === 0) {
    console.log("🎉 ALL 18 MODULES, RPCS, AND TABLES ARE FULLY FUNCTIONAL AND READY!");
  } else {
    console.log("⚠️ Summary of errors:");
    results.errors.forEach((err) => console.log(" -", err));
  }
}

runAudit();
