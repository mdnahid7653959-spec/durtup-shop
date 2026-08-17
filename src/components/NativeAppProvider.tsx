import React, { useEffect, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

interface NativeAppProviderProps {
  children: React.ReactNode;
}

export const NativeAppProvider: React.FC<NativeAppProviderProps> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const isNative = Capacitor.isNativePlatform();
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isNative) {
      safetyTimeoutRef.current = setTimeout(() => {
        setIsReady(true);
        try {
          if (Capacitor.isPluginAvailable('SplashScreen')) {
            import('@capacitor/splash-screen').then(({ SplashScreen }) => {
              SplashScreen.hide();
            }).catch(() => {});
          }
        } catch (e) {
          console.warn('SplashScreen safety hide error:', e);
        }
      }, 5000);
    }

    const initializeApp = async () => {
      try {
        if (isNative) {
          try {
            if (Capacitor.isPluginAvailable('StatusBar')) {
              const { StatusBar, Style } = await import('@capacitor/status-bar');
              await StatusBar.setStyle({ style: Style.Light });
              await StatusBar.setBackgroundColor({ color: '#f97316' });
              await StatusBar.setOverlaysWebView({ overlay: false });
            }
          } catch (e) {
            console.warn('StatusBar init error:', e);
          }
        }

        await new Promise(resolve => setTimeout(resolve, 500));
        setIsReady(true);

        if (isNative) {
          try {
            if (Capacitor.isPluginAvailable('SplashScreen')) {
              const { SplashScreen } = await import('@capacitor/splash-screen');
              await SplashScreen.hide({ fadeOutDuration: 300 });
            }
          } catch (e) {
            console.warn('SplashScreen hide error:', e);
          }
        }
      } catch (error) {
        console.error('Error initializing native app:', error);
        setIsReady(true);
      }
    };

    initializeApp();

    return () => {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
      }
    };
  }, [isNative]);

  if (!isReady && isNative) {
    return (
      <div className="fixed inset-0 bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 bg-white rounded-3xl flex items-center justify-center shadow-2xl overflow-hidden">
            <img src="/darzo-logo.png" alt="Darzo" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-white text-2xl font-bold">Darzo</h1>
          <div className="mt-4">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default NativeAppProvider;
