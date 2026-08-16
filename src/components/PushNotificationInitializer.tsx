import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/contexts/AuthContext';

/**
 * This component initializes push notifications when a user is logged in.
 * Native push auto-init is temporarily disabled for stability to prevent
 * hard native crashes after auth in debug APK builds.
 */
const WebPushNotificationInitializer = () => {
  const { user } = useAuth();
  const {
    isSupported,
    isRegistered,
    registerForPushNotifications
  } = usePushNotifications();

  useEffect(() => {
    if (!user?.id || !isSupported || isRegistered) return;

    const timeout = setTimeout(async () => {
      try {
        await registerForPushNotifications();
      } catch (error) {
        console.error('Push notification registration error:', error);
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, [user?.id, isSupported, isRegistered, registerForPushNotifications]);

  return null;
};

export const PushNotificationInitializer = () => {
  if (Capacitor.isNativePlatform()) {
    return null;
  }

  return <WebPushNotificationInitializer />;
};

export default PushNotificationInitializer;
