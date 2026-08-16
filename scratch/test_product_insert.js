import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bbfusyiykxxrsnhqgzrh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZnVzeWl5a3h4cnNuaHFnenJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzIyNTAsImV4cCI6MjEwMDkwODI1MH0.FCkYFlH9dlIa4z6TFHB0MTvOuBafYlFo4XxlR5lkkiQ";
const supabase = createClient(supabaseUrl, supabaseKey);

async function testProductInsert() {
  const { data, error } = await supabase.from("products").insert({
    name: "Test Product RLS Check",
    slug: "test-product-rls-check-" + Date.now(),
    sku: "TEST-SKU-" + Date.now(),
    regular_price: 1000,
    status: "active"
  }).select();

  console.log("Insert result:", { data, error });
}

testProductInsert();
