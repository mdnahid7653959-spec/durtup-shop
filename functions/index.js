const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

// Secret key for XOR decryption
const SECRET_KEY = "durtup-api-gateway-salt-secure-key-2026";

function decryptCredentials(encryptedBase64) {
  if (!encryptedBase64) return null;
  try {
    const binary = Buffer.from(encryptedBase64, "base64").toString("binary");
    let plainText = "";
    for (let i = 0; i < binary.length; i++) {
      const charCode = binary.charCodeAt(i);
      const keyChar = SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
      plainText += String.fromCharCode(charCode ^ keyChar);
    }
    const decoded = decodeURIComponent(escape(plainText));
    return JSON.parse(decoded);
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
}

// 1. Supplier API Cloud Function
exports.supplierApi = onRequest({ cors: true }, async (req, res) => {
  try {
    const { action, supplierId, payload } = req.body || {};

    if (action === "seed-supplier") {
      return res.status(200).json({ success: true, message: "Supplier seeded" });
    }

    if (!action || !supplierId) {
      return res.status(400).json({ error: "Missing action or supplierId" });
    }

    if (action === "test-connection") {
      return res.status(200).json({ success: true, status: 200, responseTimeMs: 120 });
    }

    if (action === "get-products") {
      return res.status(200).json({ success: true, data: [] });
    }

    return res.status(200).json({ success: true, action });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Process Order Cloud Function
exports.processOrder = onRequest({ cors: true }, async (req, res) => {
  try {
    const { action, items, shipping_address, payment_method } = req.body || {};

    if (action === "create") {
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      return res.status(200).json({
        success: true,
        order: {
          id: `ord_${Date.now()}`,
          order_number: orderNumber,
          status: "pending",
          payment_method: payment_method || "cod"
        }
      });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
