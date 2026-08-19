import { playNewOrderSound, sendBrowserNotification } from "@/hooks/useAdminOrderNotifications";

export interface OrderPushPayload {
  orderNumber: string;
  customerName: string;
  productName: string;
  productImage?: string;
  totalAmount: number;
  paymentMethod?: string;
  orderId?: string;
}

/**
 * Request notification permission from user browser/phone
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn("[NotificationService] Permission request error:", err);
    return "denied";
  }
}

/**
 * Trigger immediate native push notification on phone/browser for Customer Order Confirmation
 */
export async function sendOrderSuccessPushNotification(payload: OrderPushPayload) {
  try {
    // 1. Play pleasant audio chime & vibrate phone immediately
    playNewOrderSound();

    if (typeof window === "undefined") return;

    // 2. Request permission if not already decided
    let perm: NotificationPermission = "Notification" in window ? Notification.permission : "denied";
    if (perm === "default") {
      perm = await requestNotificationPermission();
    }

    const title = `🛍️ Order Confirmed! #${payload.orderNumber}`;
    const body = `Thank you, ${payload.customerName}! Your order for "${payload.productName}" (৳${payload.totalAmount.toLocaleString()}) has been placed successfully.`;
    const image = payload.productImage || "/durtup-logo.png";
    const targetUrl = `/orders?success=${payload.orderNumber}`;

    if (perm === "granted") {
      await sendBrowserNotification(title, {
        body,
        product_image: image,
        order_id: payload.orderId,
        data: {
          url: targetUrl,
          orderNumber: payload.orderNumber,
          orderId: payload.orderId,
        },
      });
    }
  } catch (err) {
    console.error("[NotificationService] Error sending push notification:", err);
  }
}
