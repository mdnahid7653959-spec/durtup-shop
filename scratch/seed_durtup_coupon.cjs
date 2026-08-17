const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "eshop-app-6119d"
  });
}

const db = admin.firestore();

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
    created_at: new Date().toISOString(),
    start_date: new Date().toISOString(),
    end_date: null
  };

  try {
    await db.collection("coupons").doc("coupon-DURTUP2026").set(couponData, { merge: true });
    console.log("Successfully seeded coupon DURTUP2026 in Firestore!");
  } catch (err) {
    console.error("Error seeding coupon:", err);
  }
}

seedCoupon().then(() => process.exit(0));
