import React, { useEffect, useRef } from "react";
import { db } from "@/integrations/firebase/client";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { playNewOrderSound, sendBrowserNotification } from "@/hooks/useAdminOrderNotifications";
import { useToast } from "@/hooks/use-toast";

/**
 * GlobalAdminNotificationListener
 * Runs 24/7 in the Admin Panel background.
 * Instantly triggers real-time sound, phone vibration, and Android notification shade alerts
 * whenever a new order is placed by any user — completely automatically with zero button clicks!
 */
export const GlobalAdminNotificationListener: React.FC = () => {
  const { toast } = useToast();
  const initializedTimeRef = useRef<number>(Date.now() - 30000); // Only catch orders within last 30s or new
  const processedDocIds = useRef<Set<string>>(new Set());

  // 1. Auto-request notification permission on first user touch/interaction
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    // Load previously notified orders from session
    try {
      const saved = sessionStorage.getItem("durtup_notified_orders");
      if (saved) {
        JSON.parse(saved).forEach((id: string) => processedDocIds.current.add(id));
      }
    } catch {}

    const handleFirstInteraction = async () => {
      if (Notification.permission === "default") {
        try {
          const perm = await Notification.requestPermission();
          if (perm === "granted") {
            playNewOrderSound();
            sendBrowserNotification("🔔 Durtup Admin Alerts Active!", {
              body: "You will now receive automatic real-time order alerts on your phone!",
              product_image: "/durtup-logo.png",
              data: { url: "/orders" }
            });
          }
        } catch (e) {
          console.warn("[Admin Notification] Auto-permission request error:", e);
        }
      }
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };

    window.addEventListener("click", handleFirstInteraction, { once: true });
    window.addEventListener("touchstart", handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, []);

  // 2. Real-time background order listener (Firestore admin_notifications)
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const notifRef = collection(db, "admin_notifications");
      const q = query(notifRef, orderBy("created_at", "desc"), limit(20));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" || change.type === "modified") {
            const data = change.doc.data();
            const orderId = change.doc.id;

            // Check if already notified
            if (processedDocIds.current.has(orderId)) return;

            // Check order timestamp (must be after mount time minus 30s)
            const orderTime = data.created_at ? new Date(data.created_at).getTime() : Date.now();
            const isFresh = orderTime > initializedTimeRef.current || (Date.now() - orderTime < 60000);

            if (isFresh) {
              processedDocIds.current.add(orderId);
              try {
                sessionStorage.setItem("durtup_notified_orders", JSON.stringify(Array.from(processedDocIds.current).slice(-50)));
              } catch {}

              const orderNum = data.order_number || orderId.slice(0, 8);
              const customerName = data.customer_name || "Customer";
              const prodName = data.product_name || "New Item";
              const amount = Number(data.total_amount || 0);
              const prodImg = data.product_image || data.image_url || "/durtup-logo.png";
              const payMethod = data.payment_method ? data.payment_method.toUpperCase() : "COD";

              // 🔊 1. Play loud cash-register audio chime & vibrate phone
              playNewOrderSound();

              // 📱 2. Send instant Android Notification Shade push alert with product picture
              sendBrowserNotification(`🛍️ New Order #${orderNum}! (৳${amount.toLocaleString()})`, {
                body: `${customerName} ordered "${prodName}" • ${payMethod}`,
                product_image: prodImg,
                tag: `admin-order-${orderId}`,
                data: {
                  url: "/orders",
                  order_id: orderId,
                  order_number: orderNum
                }
              });

              // 🍞 3. In-App Toast
              toast({
                title: `🛍️ New Order #${orderNum}!`,
                description: `${customerName} ordered ${prodName} (৳${amount.toLocaleString()})`,
              });
            }
          }
        });
      }, (err) => {
        console.warn("[GlobalAdminNotificationListener] Firestore listener warning:", err);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn("[GlobalAdminNotificationListener] Error setting up listener:", e);
    }
  }, [toast]);

  return null;
};

export default GlobalAdminNotificationListener;
