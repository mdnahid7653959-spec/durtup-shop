import React, { useEffect } from 'react';
import { db } from '@/integrations/firebase/client';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { sendBrowserNotification, playNewOrderSound } from '@/hooks/useAdminOrderNotifications';

export const PushNotificationInitializer: React.FC = () => {
  // 1. Register Service Worker quietly if supported
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[PushNotificationInitializer] Service worker register warning:', err);
      });
    }
  }, []);

  // 2. Real-time background listener for new order alerts (only fires if browser permission is already granted)
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const notifiedOrders = new Set<string>();

    try {
      const q = query(
        collection(db, 'admin_notifications'),
        orderBy('created_at', 'desc'),
        limit(5)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const orderId = change.doc.id;

            // Only notify for fresh orders (within last 45 seconds)
            const orderTime = data.created_at ? new Date(data.created_at).getTime() : Date.now();
            const isFresh = Date.now() - orderTime < 45000;

            if (isFresh && !notifiedOrders.has(orderId)) {
              notifiedOrders.add(orderId);

              if (Notification.permission === 'granted') {
                playNewOrderSound();
                sendBrowserNotification(data.title || '🛍️ Order Placed!', {
                  body: data.message || 'Order confirmed on Durtup.shop',
                  product_image: data.product_image || data.image_url,
                  order_id: data.order_id || orderId,
                  data: {
                    url: data.order_number ? `/orders?success=${data.order_number}` : '/orders',
                    order_id: orderId,
                  },
                });
              }
            }
          }
        });
      }, (err) => {
        console.warn('[PushNotificationInitializer] Firestore realtime order listener warning:', err);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('[PushNotificationInitializer] Setup listener error:', e);
    }
  }, []);

  return null;
};

export default PushNotificationInitializer;

