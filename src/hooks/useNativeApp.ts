import { useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';

export const useNativeApp = () => {
  const navigate = useNavigate();
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  const listenersSetup = useRef(false);

  // Initialize keyboard listeners only (StatusBar/SplashScreen handled by NativeAppProvider)
  useEffect(() => {
    if (!isNative) return;

    const initKeyboard = async () => {
      try {
        if (Capacitor.isPluginAvailable('Keyboard')) {
          const { Keyboard } = await import('@capacitor/keyboard');
          Keyboard.addListener('keyboardWillShow', () => {
            document.body.classList.add('keyboard-visible');
          });
          Keyboard.addListener('keyboardWillHide', () => {
            document.body.classList.remove('keyboard-visible');
          });
        }
      } catch (error) {
        console.error('Keyboard init error:', error);
      }
    };

    initKeyboard();

    return () => {
      if (Capacitor.isPluginAvailable('Keyboard')) {
        import('@capacitor/keyboard').then(({ Keyboard }) => {
          Keyboard.removeAllListeners();
        }).catch(() => {});
      }
    };
  }, [isNative]);

  // Handle back button and deep links - setup ONCE
  useEffect(() => {
    if (!isNative || listenersSetup.current) return;
    listenersSetup.current = true;

    const setupListeners = async () => {
      try {
        const { App } = await import('@capacitor/app');

        await App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            App.minimizeApp();
          }
        });

        await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            console.log('App is now active');
          }
        });

        await App.addListener('appUrlOpen', ({ url }) => {
          console.log('Deep link opened:', url);
          try {
            const urlObj = new URL(url);
            const path = urlObj.pathname;
            if (path && path !== '/') {
              navigate(path);
            }
          } catch (e) {
            console.error('Malformed deep link URL:', url, e);
          }
        });
      } catch (error) {
        console.error('Error setting up app listeners:', error);
      }
    };

    setupListeners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNative]);

  const triggerHaptic = useCallback(async (style: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!isNative || !Capacitor.isPluginAvailable('Haptics')) return;
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      const impactStyle = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy
      };
      await Haptics.impact({ style: impactStyle[style] });
    } catch (error) {
      console.error('Haptic feedback error:', error);
    }
  }, [isNative]);

  const showSplash = useCallback(async () => {
    if (!isNative || !Capacitor.isPluginAvailable('SplashScreen')) return;
    try {
      const { SplashScreen } = await import('@capacitor/splash-screen');
      await SplashScreen.show({ autoHide: false });
    } catch (e) {
      console.warn('SplashScreen show error:', e);
    }
  }, [isNative]);

  const hideSplash = useCallback(async () => {
    if (!isNative || !Capacitor.isPluginAvailable('SplashScreen')) return;
    try {
      const { SplashScreen } = await import('@capacitor/splash-screen');
      await SplashScreen.hide();
    } catch (e) {
      console.warn('SplashScreen hide error:', e);
    }
  }, [isNative]);

  return {
    isNative,
    platform,
    triggerHaptic,
    showSplash,
    hideSplash
  };
};

export default useNativeApp;
