import { db } from "@/integrations/firebase/client";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { supabase } from "@/lib/firebaseAdapter";

export interface TelegramConfig {
  enabled: boolean;
  bot_token: string;
  chat_id: string;
}

const LOCAL_STORAGE_KEY = "durtup_telegram_config";

export async function getTelegramConfig(): Promise<TelegramConfig> {
  // 1. Check local storage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.bot_token && parsed.chat_id) return parsed;
    }
  } catch {}

  // 2. Check Firestore
  try {
    const snap = await getDoc(doc(db, "settings", "telegram"));
    if (snap.exists()) {
      const data = snap.data() as TelegramConfig;
      if (data.bot_token && data.chat_id) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch (e) {
    console.warn("Firestore telegram config read warning:", e);
  }

  // 3. Check Supabase site_settings
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "telegram_notification")
      .maybeSingle();
    if (data?.value) {
      const val = data.value as TelegramConfig;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(val));
      return val;
    }
  } catch (e) {
    console.warn("Supabase telegram config read warning:", e);
  }

  return { enabled: true, bot_token: "", chat_id: "" };
}

export async function saveTelegramConfig(config: TelegramConfig): Promise<boolean> {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
    
    // Save to Firestore
    try {
      await setDoc(doc(db, "settings", "telegram"), config, { merge: true });
    } catch (fsErr) {
      console.warn("Firestore save warning:", fsErr);
    }

    // Save to Supabase
    try {
      await supabase
        .from("site_settings")
        .upsert({
          key: "telegram_notification",
          value: config,
          updated_at: new Date().toISOString()
        }, { onConflict: "key" });
    } catch (sbErr) {
      console.warn("Supabase save warning:", sbErr);
    }

    return true;
  } catch (e) {
    console.error("Failed to save telegram config:", e);
    return false;
  }
}

export async function sendTelegramMessage(text: string, customConfig?: Partial<TelegramConfig>): Promise<{ success: boolean; error?: string }> {
  try {
    const saved = await getTelegramConfig();
    const config = { ...saved, ...customConfig };
    
    if (!config.bot_token || !config.chat_id) {
      return { success: false, error: "Telegram Bot Token বা Chat ID সেট করা নেই।" };
    }

    const url = `https://api.telegram.org/bot${config.bot_token.trim()}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chat_id.trim(),
        text: text,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    });

    const result = await response.json();
    if (!result.ok) {
      return { success: false, error: result.description || "Failed to send Telegram message" };
    }
    return { success: true };
  } catch (e: any) {
    console.error("Telegram send error:", e);
    return { success: false, error: e.message || "Network request failed" };
  }
}

export async function sendTelegramOrderNotification(order: {
  orderNumber: string;
  customerName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  paymentMethod: string;
  total: number;
  items: Array<{ name: string; quantity: number; price: number }>;
}) {
  const config = await getTelegramConfig();
  if (!config.enabled && !config.bot_token) return;

  const itemsList = order.items && order.items.length > 0
    ? order.items.map(item => `  ▫️ <b>${item.name}</b> (x${item.quantity}) - ৳${(item.price * item.quantity).toLocaleString()}`).join("\n")
    : "  ▫️ Details in Admin Panel";

  const message = `🛍 <b>NEW ORDER RECEIVED!</b> 🎉
━━━━━━━━━━━━━━━━━━━━━━
📦 <b>Order ID:</b> <code>#${order.orderNumber}</code>
👤 <b>Customer:</b> ${order.customerName}
📞 <b>Phone:</b> <code>${order.phone}</code>
${order.email ? `📧 <b>Email:</b> ${order.email}\n` : ""}📍 <b>Address:</b> ${order.address}, ${order.city}
💳 <b>Payment Method:</b> <b>${order.paymentMethod.toUpperCase()}</b>
💰 <b>Total Amount:</b> <b>৳${order.total.toLocaleString()}</b>

🛒 <b>Ordered Items (${order.items?.length || 0}):</b>
${itemsList}
━━━━━━━━━━━━━━━━━━━━━━
⚡️ <a href="https://durtup-shop-c3fa.vercel.app/admin/orders">Click Here to Open Admin Orders</a>`;

  return sendTelegramMessage(message, config);
}
