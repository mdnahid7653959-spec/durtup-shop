import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bbfusyiykxxrsnhqgzrh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZnVzeWl5a3h4cnNuaHFnenJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzIyNTAsImV4cCI6MjEwMDkwODI1MH0.FCkYFlH9dlIa4z6TFHB0MTvOuBafYlFo4XxlR5lkkiQ";

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedCoupon() {
  const couponData = {
    code: "DURTUP2026",
    description: "Special 20% Discount for all products",
    discount_type: "percentage",
    discount_value: 20,
    min_order_amount: 0,
    max_discount_amount: null,
    usage_limit: 10000,
    used_count: 0,
    is_active: true,
  };

  const { data, error } = await supabase.from("coupons").upsert(couponData, { onConflict: "code" });
  console.log("Seed coupon result:", { data, error });
}

seedCoupon();
