import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bbfusyiykxxrsnhqgzrh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZnVzeWl5a3h4cnNuaHFnenJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzIyNTAsImV4cCI6MjEwMDkwODI1MH0.FCkYFlH9dlIa4z6TFHB0MTvOuBafYlFo4XxlR5lkkiQ";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Invoking supplier-api edge function to test connection to Mohasagor...");
  const { data: testData, error: testError } = await supabase.functions.invoke("supplier-api", {
    body: {
      action: "test-connection",
      supplierId: "mohasagor-integration-id"
    }
  });

  if (testError) {
    console.error("Test connection failed:", testError);
  } else {
    console.log("Test connection succeeded:", testData);
  }

  console.log("Invoking supplier-api edge function to sync products from Mohasagor...");
  const { data: syncData, error: syncError } = await supabase.functions.invoke("supplier-api", {
    body: {
      action: "sync-products",
      supplierId: "mohasagor-integration-id"
    }
  });

  if (syncError) {
    console.error("Sync failed:", syncError);
  } else {
    console.log("Sync succeeded:", syncData);
  }
}

run().catch(console.error);
