import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'durtup_pwa_prompt_dismissed_at';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // 1. Detect device & OS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(ua);
    const isMobileDevice = isIOSDevice || isAndroidDevice || /mobile|tablet/.test(ua) || window.innerWidth <= 768;

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsMobile(isMobileDevice);

    // 2. Check if already installed (standalone mode)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
      setIsPromptOpen(false);
      return;
    }

    // 3. Handle Android/Desktop Chrome beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);

      // Check if dismissed recently
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      const isRecentlyDismissed = dismissedAt && Date.now() - parseInt(dismissedAt, 10) < DISMISS_DURATION_MS;

      // Auto-show prompt on mobile if not recently dismissed
      if (isMobileDevice && !isRecentlyDismissed) {
        // Smooth 1.5s delay to let the initial page render first
        const timer = setTimeout(() => {
          setIsPromptOpen(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 4. If iOS and not installed and not dismissed, auto-show prompt
    if (isIOSDevice && !isStandalone) {
      setCanInstall(true);
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      const isRecentlyDismissed = dismissedAt && Date.now() - parseInt(dismissedAt, 10) < DISMISS_DURATION_MS;

      if (!isRecentlyDismissed) {
        const timer = setTimeout(() => {
          setIsPromptOpen(true);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }

    // 5. Listen for successful install
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setIsPromptOpen(false);
      setDeferredPrompt(null);
      localStorage.removeItem(DISMISS_KEY);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = useCallback(async () => {
    // If iOS Safari
    if (isIOS) {
      setShowIOSGuide(true);
      return false;
    }

    // If Android / Desktop Chrome with deferredPrompt
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setCanInstall(false);
          setIsPromptOpen(false);
        }
        setDeferredPrompt(null);
        return outcome === 'accepted';
      } catch (err) {
        console.error('PWA install error:', err);
        return false;
      }
    } else {
      // Fallback instruction for browsers without beforeinstallprompt event
      if (isAndroid) {
        alert('অ্যাপটি ইনস্টল করতে ব্রাউজারের উপরে/নিচে ৩-ডট (⋮) মেনু থেকে "Add to Home Screen" অথবা "Install App" সিলেক্ট করুন।');
      } else {
        setShowIOSGuide(true);
      }
      return false;
    }
  }, [deferredPrompt, isIOS, isAndroid]);

  const dismissPrompt = useCallback((temporary = true) => {
    setIsPromptOpen(false);
    setShowIOSGuide(false);
    if (temporary) {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    }
  }, []);

  const openPrompt = useCallback(() => {
    setIsPromptOpen(true);
  }, []);

  return {
    canInstall,
    isInstalled,
    isPromptOpen,
    isIOS,
    isAndroid,
    isMobile,
    showIOSGuide,
    setShowIOSGuide,
    installApp,
    dismissPrompt,
    openPrompt,
  };
}
