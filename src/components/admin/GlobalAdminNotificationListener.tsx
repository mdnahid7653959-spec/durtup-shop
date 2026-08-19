import React, { useEffect, useRef } from "react";
import { db } from "@/integrations/firebase/client";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { playNewOrderSound, sendBrowserNotification } from "@/hooks/useAdminOrderNotifications";
import { useToast } from "@/hooks/use-toast";

/**
 * GlobalAdminNotificationListener
 * 24/7 background listener across the entire Admin Panel.
 * Automatically sounds chime, vibrates phone, and posts native Android system push notification
 * whenever ANY customer places an order on the storefront.
 */
export const GlobalAdminNotificationListener: React.FC = () => {
  const { toast } = useToast();
  const processedDocIds = useRef<Set<string>>(new Set());
  const mountTimeRef = useRef<number>(Date.now() - 60000); // 1 minute window

  // 1. Permission request & Screen WakeLock
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load previously notified orders
    try {
      const saved = sessionStorage.getItem("durtup_notified_orders");
      if (saved) {
        JSON.parse(saved).forEach((id: string) => processedDocIds.current.add(id));
      }
    } catch {}

    // Auto-request permission on first user touch/tap
    const handleFirstTouch = async () => {
      if ("Notification" in window && Notification.permission === "default") {
        try {
          const perm = await Notification.requestPermission();
          if (perm === "granted") {
            playNewOrderSound();
            sendBrowserNotification("🔔 Durtup Admin Alerts Active!", {
              body: "Real-time order push notifications enabled on this phone!",
              product_image: "/durtup-logo.png",
              data: { url: "/orders" }
            });
          }
        } catch (e) {
          console.warn("[Admin Notification] Permission error:", e);
        }
      }
      window.removeEventListener("click", handleFirstTouch);
      window.removeEventListener("touchstart", handleFirstTouch);
    };

    window.addEventListener("click", handleFirstTouch, { once: true });
    window.addEventListener("touchstart", handleFirstTouch, { once: true });

    // Optional WakeLock to prevent phone sleep while admin panel is open
    let wakeLock: any = null;
    if ("wakeLock" in navigator) {
      try {
        (navigator as any).wakeLock.request("screen").then((lock: any) => {
          wakeLock = lock;
        }).catch(() => {});
      } catch {}
    }

    return () => {
      window.removeEventListener("click", handleFirstTouch);
      window.removeEventListener("touchstart", handleFirstTouch);
      if (wakeLock) {
        try { wakeLock.release(); } catch {}
      }
    };
  }, []);

  // 2. Real-time Firestore listener on `admin_notifications`
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const notifRef = collection(db, "admin_notifications");
      const q = query(notifRef, orderBy("created_at", "desc"), limit(25));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" || change.type === "modified") {
            const data = change.doc.data();
            const orderId = change.doc.id;

            if (processedDocIds.current.has(orderId)) return;

            const orderTime = data.created_at ? new Date(data.created_at).getTime() : Date.now();
            const isFresh = orderTime > mountTimeRef.current || (Date.now() - orderTime < 90000);

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

              // 🔊 1. Sound & Vibration
              playNewOrderSound();

              // 📱 2. Android Notification Tray Push
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
        console.warn("[GlobalAdminNotificationListener] Firestore realtime listener warning:", err);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn("[GlobalAdminNotificationListener] Error:", e);
    }
  }, [toast]);

  // 3. Backup real-time listener on `orders` collection
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const ordersRef = collection(db, "orders");
      const q = query(ordersRef, orderBy("created_at", "desc"), limit(10));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            const orderId = change.doc.id;
            const backupKey = `order_backup_${orderId}`;

            if (processedDocIds.current.has(orderId) || processedDocIds.current.has(backupKey)) return;

            const orderTime = data.created_at ? new Date(data.created_at).getTime() : Date.now();
            const isFresh = orderTime > mountTimeRef.current || (Date.now() - orderTime < 90000);

            if (isFresh) {
              processedDocIds.current.add(orderId);
              processedDocIds.current.add(backupKey);

              const orderNum = data.order_number || orderId.slice(0, 8);
              const customerName = data.customer_name || data.shipping_address?.firstName || "Customer";
              const firstItem = Array.isArray(data.items) && data.items.length > 0 ? data.items[0] : null;
              const prodName = firstItem?.name || firstItem?.product_name || "New Item";
              const prodImg = firstItem?.image || "/durtup-logo.png";
              const amount = Number(data.total_amount || data.total || 0);

              // 🔊 1. Sound & Vibration
              playNewOrderSound();

              // 📱 2. Android Notification Tray Push
              sendBrowserNotification(`🛍️ New Order #${orderNum}! (৳${amount.toLocaleString()})`, {
                body: `${customerName} ordered "${prodName}" • ${data.payment_method?.toUpperCase() || "COD"}`,
                product_image: prodImg,
                tag: `admin-order-${orderId}`,
                data: {
                  url: "/orders",
                  order_id: orderId,
                  order_number: orderNum
                }
              });
            }
          }
        });
      }, (err) => {
        console.warn("[GlobalAdminNotificationListener] Orders collection listener warning:", err);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn("[GlobalAdminNotificationListener] Backup listener error:", e);
    }
  }, []);

  return null;
};

export default GlobalAdminNotificationListener;
