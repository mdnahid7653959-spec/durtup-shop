import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/integrations/firebase/client';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { sendBrowserNotification, playNewOrderSound } from '@/hooks/useAdminOrderNotifications';
import { requestNotificationPermission } from '@/services/notificationService';
import { Bell, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const PushNotificationInitializer: React.FC = () => {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // 1. Check current permission and register Service Worker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[PushNotificationInitializer] Service worker register warning:', err);
      });
    }

    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setPermissionGranted(true);
      } else if (Notification.permission === 'default') {
        // Show lightweight floating prompt on mobile / web after 3 seconds
        const dismissed = sessionStorage.getItem('notif_prompt_dismissed');
        if (!dismissed) {
          const t = setTimeout(() => setShowPrompt(true), 3500);
          return () => clearTimeout(t);
        }
      }
    }
  }, []);

  // 2. Real-time background listener for new order alerts
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

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

              // Check if notification belongs to current user or admin
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

  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission();
    if (res === 'granted') {
      setPermissionGranted(true);
      setShowPrompt(false);
      playNewOrderSound();
      sendBrowserNotification('🔔 Push Notifications Enabled!', {
        body: 'You will now receive instant order updates and delivery alerts on your phone!',
        product_image: '/durtup-logo.png',
      });
    } else {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('notif_prompt_dismissed', 'true');
  };

  if (!showPrompt || permissionGranted) return null;

  return (
    <aside aria-label="Notification Permission" className="fixed bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-sm z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl p-4 shadow-2xl border border-white/20 flex items-start gap-3 backdrop-blur-md">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
          <Bell className="h-5 w-5 text-white animate-bounce" />
        </div>
        <div className="flex-1 min-w-0 pr-1">
          <h4 className="font-bold text-sm leading-tight text-white">Enable Order Notifications</h4>
          <p className="text-xs text-white/90 mt-1 leading-snug">
            Get instant push alerts with product photos & sound when you place an order or status changes!
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleEnableNotifications}
              className="bg-white text-orange-600 hover:bg-white/90 font-bold text-xs h-8 px-3 rounded-lg shadow-md"
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              Allow Alerts
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-white hover:bg-white/15 text-xs h-8 px-2.5 rounded-lg"
            >
              Later
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-white/80 hover:text-white p-1 rounded-md transition-colors"
          aria-label="Close notification prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
};

export default PushNotificationInitializer;
