import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bbfusyiykxxrsnhqgzrh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZnVzeWl5a3h4cnNuaHFnenJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzIyNTAsImV4cCI6MjEwMDkwODI1MH0.FCkYFlH9dlIa4z6TFHB0MTvOuBafYlFo4XxlR5lkkiQ";
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: pData } = await supabase.from("products").select("id").limit(1).single();
  console.log("Product ID:", pData.id);

  const { data, error } = await supabase.from("supplier_product_mappings").insert({
    product_id: pData.id,
    supplier_id: "00000000-0000-0000-0000-000000000000",
    supplier_sku: "TEST-123",
    sync_status: "synced"
  }).select();

  console.log("Mapping test result:", { data, error });
}

test();
