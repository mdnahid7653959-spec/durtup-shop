import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bbfusyiykxxrsnhqgzrh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZnVzeWl5a3h4cnNuaHFnenJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzIyNTAsImV4cCI6MjEwMDkwODI1MH0.FCkYFlH9dlIa4z6TFHB0MTvOuBafYlFo4XxlR5lkkiQ";
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: pData } = await supabase.from("products").select("id").limit(1).single();
  console.log("Product:", pData);

  const { data, error } = await supabase.from("supplier_integrations").insert({
    name: "Mohasagor Test",
    api_base_url: "https://mohasagor.com.bd",
    auth_type: "apikey"
  }).select();
  console.log("Supplier insert:", { data, error });

  // Clean up test product
  await supabase.from("products").delete().eq("name", "Test Product RLS Check");
}

test();
