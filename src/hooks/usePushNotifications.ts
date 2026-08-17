import { useEffect, useState, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/firebaseAdapter';
import { useAuth } from '@/contexts/AuthContext';

interface PushNotificationState {
  isSupported: boolean;
  isRegistered: boolean;
  token: string | null;
  error: string | null;
}

export const usePushNotifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isRegistered: false,
    token: null,
    error: null
  });

  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  const listenersSetup = useRef(false);
  const currentTokenRef = useRef<string | null>(null);

  // Save token to database
  const saveTokenToDatabase = useCallback(async (token: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('push_tokens')
        .upsert(
          {
            user_id: userId,
            token: token,
            platform: platform as 'android' | 'ios' | 'web',
            is_active: true,
            device_info: {
              platform: platform,
              native: isNative,
              userAgent: navigator.userAgent
            }
          },
          {
            onConflict: 'user_id,token',
            ignoreDuplicates: false
          }
        );

      if (error) {
        console.error('Error saving push token:', error);
      } else {
        console.log('Push token saved to database');
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }, [platform, isNative]);

  // Deactivate token on logout
  const deactivateToken = useCallback(async () => {
    if (!user?.id || !currentTokenRef.current) return;

    try {
      await supabase
        .from('push_tokens')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('token', currentTokenRef.current);
    } catch (error) {
      console.error('Error deactivating token:', error);
    }
  }, [user?.id]);

  // Check if push notifications are supported
  useEffect(() => {
    try {
      if (!isNative) {
        setState(prev => ({ ...prev, isSupported: false }));
        return;
      }
      if (Capacitor.isPluginAvailable('PushNotifications')) {
        setState(prev => ({ ...prev, isSupported: true }));
      }
    } catch (e) {
      console.warn('Push support check error:', e);
    }
  }, [isNative]);

  // Register for push notifications
  const registerForPushNotifications = useCallback(async () => {
    if (!isNative || !Capacitor.isPluginAvailable('PushNotifications')) {
      return false;
    }

    if (!user?.id) {
      console.log('User not logged in, skipping push registration');
      return false;
    }

    try {
      // Dynamic import to avoid crash if plugin not available
      const { PushNotifications } = await import('@capacitor/push-notifications');
      
      const permStatus = await PushNotifications.requestPermissions();
      
      if (permStatus.receive === 'granted') {
        await PushNotifications.register();
        return true;
      } else {
        setState(prev => ({ ...prev, error: 'Push notification permission denied' }));
        return false;
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      setState(prev => ({ ...prev, error: 'Failed to register for push notifications' }));
      return false;
    }
  }, [isNative, user?.id]);

  // Set up listeners ONCE only
  useEffect(() => {
    if (!isNative || !Capacitor.isPluginAvailable('PushNotifications') || listenersSetup.current) return;

    let isMounted = true;

    const setupListeners = async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        
        if (!isMounted) return;

        await PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration success, token:', token.value);
          currentTokenRef.current = token.value;
          setState(prev => ({ 
            ...prev, 
            isRegistered: true, 
            token: token.value,
            error: null 
          }));
        });

        await PushNotifications.addListener('registrationError', (error) => {
          console.error('Error on registration:', error);
          setState(prev => ({ 
            ...prev, 
            isRegistered: false, 
            error: error.error 
          }));
        });

        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received:', notification);
        });

        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('Push notification action performed:', action);
          try {
            const data = action.notification.data;
            if (data?.type === 'order') {
              navigate(`/orders/${data.orderId}`);
            } else if (data?.type === 'product') {
              navigate(`/product/${data.productId}`);
            } else if (data?.url) {
              navigate(data.url);
            }
          } catch (e) {
            console.warn('Navigation from push notification failed:', e);
          }
        });

        listenersSetup.current = true;
      } catch (error) {
        console.error('Error setting up push notification listeners:', error);
      }
    };

    setupListeners();

    return () => {
      isMounted = false;
    };
    // Only run once - no dependencies on user/navigate that would cause re-setup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNative]);

  // Save token when user becomes available
  useEffect(() => {
    if (user?.id && currentTokenRef.current) {
      saveTokenToDatabase(currentTokenRef.current, user.id);
    }
  }, [user?.id, saveTokenToDatabase]);

  // Get delivered notifications
  const getDeliveredNotifications = useCallback(async () => {
    if (!isNative || !Capacitor.isPluginAvailable('PushNotifications')) return [];
    
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const { notifications } = await PushNotifications.getDeliveredNotifications();
      return notifications;
    } catch (e) {
      console.warn('Error getting delivered notifications:', e);
      return [];
    }
  }, [isNative]);

  // Remove delivered notifications
  const removeDeliveredNotifications = useCallback(async () => {
    if (!isNative || !Capacitor.isPluginAvailable('PushNotifications')) return;
    
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      await PushNotifications.removeAllDeliveredNotifications();
    } catch (e) {
      console.warn('Error removing delivered notifications:', e);
    }
  }, [isNative]);

  return {
    ...state,
    registerForPushNotifications,
    getDeliveredNotifications,
    removeDeliveredNotifications,
    deactivateToken
  };
};

export default usePushNotifications;
