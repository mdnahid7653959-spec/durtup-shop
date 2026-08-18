import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "@/integrations/firebase/client";
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  product_name?: string;
  product_image?: string;
  image_url?: string;
  total_items?: number;
  order_id?: string;
  order_number?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  total_amount?: number;
  payment_method?: string;
  read: boolean;
  created_at: string;
}

// Play loud, pleasant cash register / chime sound on new orders (works on phone & PC)
export function playNewOrderSound() {
  try {
    // 1. Device vibration
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([400, 150, 400, 150, 400, 150, 800]);
    }

    // 2. High fidelity Web Audio synthesizer (Cash register "Ka-Ching" + 4-note chord)
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Part 1: Cash register metallic ring (987Hz & 1318Hz)
    [987.77, 1318.51].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    });

    // Part 2: Upbeat 4-note chime sequence: C5, E5, G5, C6
    const melody = [523.25, 659.25, 783.99, 1046.50];
    melody.forEach((freq, idx) => {
      const startTime = now + 0.12 + idx * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.45, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  } catch (e) {
    console.warn("Audio chime error:", e);
  }
}

// Trigger real Mobile/OS native push notification with Product Image & Vibration
export async function sendBrowserNotification(
  title: string,
  options?: NotificationOptions & { product_image?: string; order_id?: string; data?: any }
) {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  if (Notification.permission === "granted") {
    const img = options?.product_image || (options as any)?.image;
    const notificationOpts: NotificationOptions = {
      body: options?.body || "New order received on Durtup.shop",
      icon: img || "/durtup-logo.png",
      badge: "/durtup-logo.png",
      image: img || undefined, // Displays large product preview in Android & mobile notification tray
      vibrate: [400, 150, 400, 150, 400, 150, 800],
      tag: (options as any)?.tag || `durtup-order-${Date.now()}`,
      requireInteraction: true,
      silent: false,
      ...options,
    };

    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            ...notificationOpts,
            actions: [
              { action: "view_order", title: "🛍️ View Order" },
              { action: "open_admin", title: "⚡ Open Admin" }
            ]
          });
          return;
        }
      }
      new Notification(title, notificationOpts);
    } catch (err) {
      console.warn("System notification error:", err);
      try {
        new Notification(title, notificationOpts);
      } catch (e) {}
    }
  }
}

export function useAdminOrderNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );
  const { toast } = useToast();
  const navigate = useNavigate();
  const isFirstLoad = useRef(true);

  // Request browser / mobile push notification permission
  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast({
        title: "Notifications not supported",
        description: "Your browser does not support web push notifications.",
        variant: "destructive"
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        toast({
          title: "Phone Push Alerts Enabled! 🔔",
          description: "You will receive instant push notifications with product photos for new orders."
        });
        
        // Play welcome chime
        playNewOrderSound();

        // Send confirmation push notification
        sendBrowserNotification("🔔 Durtup Order Alerts Active!", {
          body: "Direct push alerts enabled on your phone with live product photos & sound!",
          product_image: "/hero-banner-durtu-perfect.png",
          data: { url: "/admin/orders" }
        });
        return true;
      } else {
        toast({
          title: "Permission denied",
          description: "Please allow notifications in your phone's browser settings to receive order alerts.",
          variant: "destructive"
        });
        return false;
      }
    } catch (e) {
      console.error("Notification permission error:", e);
      return false;
    }
  }, [toast]);

  // Send a test push notification with product photo and sound to verify phone integration
  const testPushNotification = useCallback(async () => {
    if (permission !== "granted") {
      const granted = await requestPermission();
      if (!granted) return;
    }

    playNewOrderSound();
    
    sendBrowserNotification("🛍️ New Order #ORD-TEST-992! (৳2,450)", {
      body: "Customer: Md Nahid • Product: Premium Wireless Earbuds Pro • Cash on Delivery",
      product_image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=300&fit=crop",
      data: { url: "/admin/orders" }
    });

    toast({
      title: "📱 Push Notification Sent to Phone!",
      description: "Check your phone's notification bar for the test order alert with product photo.",
    });
  }, [permission, requestPermission, toast]);

  // Real-time listener for new order notifications
  useEffect(() => {
    try {
      const notifRef = collection(db, "admin_notifications");
      const q = query(notifRef, orderBy("created_at", "desc"), limit(50));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: AdminNotification[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });

        // Detect newly added order docs (after initial load)
        if (!isFirstLoad.current) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const data = change.doc.data() as AdminNotification;
              const prodImg = data.product_image || data.image_url;
              
              // 1. Play audio chime & phone vibration
              playNewOrderSound();

              // 2. Trigger real mobile push notification with product image
              sendBrowserNotification(data.title || `🛍️ New Order #${data.order_number || change.doc.id.slice(0, 8)}!`, {
                body: data.message || `Customer: ${data.customer_name || "Customer"} • ৳${(data.total_amount || 0).toLocaleString()} • ${data.payment_method?.toUpperCase() || "COD"}`,
                product_image: prodImg,
                data: { url: "/admin/orders", order_id: data.order_id || change.doc.id }
              });

              // 3. Trigger in-app toast
              toast({
                title: data.title || "🛍️ New Order Received!",
                description: `${data.customer_name || "Customer"} ordered ${data.product_name || "Item"} (৳${(data.total_amount || 0).toLocaleString()})`,
              });
            }
          });
        }

        isFirstLoad.current = false;
        setNotifications(list);
      }, (err) => {
        console.warn("admin_notifications listener error:", err);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn("Failed to attach admin notification listener:", e);
    }
  }, [toast, navigate]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "admin_notifications", id), { read: true });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (e) {
      console.warn("Error marking notification read:", e);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter((n) => !n.read);
      await Promise.all(unread.map((n) => updateDoc(doc(db, "admin_notifications", n.id), { read: true })));
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.warn("Error marking all read:", e);
    }
  };

  return {
    notifications,
    unreadCount,
    permission,
    requestPermission,
    testPushNotification,
    markAsRead,
    markAllAsRead,
    playNewOrderSound
  };
}

