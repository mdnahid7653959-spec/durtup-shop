import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bbfusyiykxxrsnhqgzrh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZnVzeWl5a3h4cnNuaHFnenJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzIyNTAsImV4cCI6MjEwMDkwODI1MH0.FCkYFlH9dlIa4z6TFHB0MTvOuBafYlFo4XxlR5lkkiQ";
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log("Invoking supplier-api/get-products...");
  try {
    const { data, error } = await supabase.functions.invoke("supplier-api", {
      body: { action: "get-products", supplierId: "mohasagor-integration-id" }
    });

    if (error) {
      console.error("Error from Supabase Function invocation:", error);
      return;
    }

    console.log("Success:", data.success);
    if (data.data && data.data.products) {
      const products = data.data.products;
      console.log(`Found ${products.length} products.`);
      // Inspect first product
      const sample = products[0];
      console.log("Sample product keys:", Object.keys(sample));
      console.log("Sample product JSON:", JSON.stringify(sample, null, 2));
    } else {
      console.log("No products key found in raw response:", data);
    }
  } catch (err) {
    console.error("Catch error:", err);
  }
}

inspect();
