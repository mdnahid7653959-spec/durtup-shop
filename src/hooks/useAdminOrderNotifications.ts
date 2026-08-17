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
  order_id?: string;
  order_number?: string;
  customer_name?: string;
  customer_phone?: string;
  total_amount?: number;
  payment_method?: string;
  read: boolean;
  created_at: string;
}

// Play pleasant web audio chime on new orders (works offline, mobile & desktop)
export function playNewOrderSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Notes: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
      
      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + idx * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.35);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + idx * 0.1);
      osc.stop(ctx.currentTime + idx * 0.1 + 0.4);
    });
  } catch (e) {
    console.warn("Audio chime error:", e);
  }
}

// Trigger mobile/system push notification with vibration
export async function sendBrowserNotification(title: string, options?: NotificationOptions & { data?: any }) {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  if (Notification.permission === "granted") {
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            icon: "/durtup-logo.svg",
            badge: "/durtup-logo.svg",
            vibrate: [300, 100, 300, 100, 300],
            ...options
          });
          return;
        }
      }
      new Notification(title, {
        icon: "/durtup-logo.svg",
        ...options
      });
    } catch (err) {
      console.warn("System notification error:", err);
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
          title: "Notifications enabled! 🔔",
          description: "You will receive instant alerts for new orders on this device."
        });
        sendBrowserNotification("Notifications Active! 🔔", {
          body: "You will receive real-time alerts whenever a new order is placed."
        });
        return true;
      } else {
        toast({
          title: "Permission denied",
          description: "Please allow notifications in browser settings to receive order alerts.",
          variant: "destructive"
        });
        return false;
      }
    } catch (e) {
      console.error("Notification permission error:", e);
      return false;
    }
  }, [toast]);

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
              
              // 1. Play audio chime
              playNewOrderSound();

              // 2. Trigger mobile system notification
              sendBrowserNotification(`🛒 New Order #${data.order_number || change.doc.id.slice(0, 8)}!`, {
                body: `Customer: ${data.customer_name || "Guest"} • ৳${(data.total_amount || 0).toLocaleString()} • ${data.payment_method?.toUpperCase() || "COD"}`,
                data: { url: "/admin/orders" }
              });

              // 3. Trigger in-app toast
              toast({
                title: "🛒 New Order Received!",
                description: `Order #${data.order_number || change.doc.id.slice(0, 8)} • ৳${(data.total_amount || 0).toLocaleString()} by ${data.customer_name || "Customer"}`,
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
    markAsRead,
    markAllAsRead,
    playNewOrderSound
  };
}
