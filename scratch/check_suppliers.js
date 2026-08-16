import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bbfusyiykxxrsnhqgzrh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZnVzeWl5a3h4cnNuaHFnenJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzIyNTAsImV4cCI6MjEwMDkwODI1MH0.FCkYFlH9dlIa4z6TFHB0MTvOuBafYlFo4XxlR5lkkiQ";

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("--- SUPPLIER INTEGRATIONS ---");
  const { data: suppliers, error: sErr } = await supabase.from("supplier_integrations").select("*");
  console.log("Suppliers error:", sErr);
  console.log("Suppliers:", suppliers);

  console.log("\n--- PRODUCTS COUNT ---");
  const { count, error: pErr } = await supabase.from("products").select("*", { count: "exact", head: true });
  console.log("Products error:", pErr);
  console.log("Products count:", count);

  console.log("\n--- CJ SETTINGS ---");
  const { data: cj, error: cjErr } = await supabase.from("cj_settings").select("*");
  console.log("CJ error:", cjErr);
  console.log("CJ Settings:", cj);

  console.log("\n--- SUPPLIER SYNC LOGS ---");
  const { data: logs, error: lErr } = await supabase.from("supplier_sync_logs").select("*").order("created_at", { ascending: false }).limit(5);
  console.log("Sync logs error:", lErr);
  console.log("Sync logs:", logs);
}

run();
