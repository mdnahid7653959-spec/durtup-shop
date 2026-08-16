import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bbfusyiykxxrsnhqgzrh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZnVzeWl5a3h4cnNuaHFnenJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzIyNTAsImV4cCI6MjEwMDkwODI1MH0.FCkYFlH9dlIa4z6TFHB0MTvOuBafYlFo4XxlR5lkkiQ";
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectMappings() {
  const { data: mappings, error } = await supabase
    .from("supplier_product_mappings")
    .select(`
      id,
      product_id,
      supplier_id,
      supplier_sku,
      sync_status,
      last_synced_at
    `)
    .limit(10);

  if (error) {
    console.error("Error fetching mappings:", error);
    return;
  }

  console.log(`Fetched ${mappings?.length} mappings:\n`);
  for (const m of mappings) {
    console.log(`Mapping ID: ${m.id}`);
    console.log(`Product ID: ${m.product_id}`);
    console.log(`Supplier ID: ${m.supplier_id}`);
    console.log(`Supplier SKU: ${m.supplier_sku}`);
    console.log(`Sync Status: ${m.sync_status}`);
    console.log("-".repeat(50));
  }
}

inspectMappings();
