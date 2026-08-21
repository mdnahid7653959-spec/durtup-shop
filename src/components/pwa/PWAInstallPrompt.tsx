import React, { useState } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { 
  Download, 
  Smartphone, 
  Zap, 
  ShieldCheck, 
  BellRing, 
  X, 
  Share, 
  PlusSquare, 
  ChevronRight,
  Sparkles,
  ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const PWAInstallPrompt: React.FC = () => {
  const {
    canInstall,
    isInstalled,
    isPromptOpen,
    isIOS,
    isMobile,
    showIOSGuide,
    setShowIOSGuide,
    installApp,
    dismissPrompt,
    openPrompt
  } = usePWAInstall();

  const [installing, setInstalling] = useState(false);

  // If already installed in standalone mode, don't show prompt
  if (isInstalled) return null;

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      await installApp();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <>
      {/* 1. AUTOMATIC POPUP / BOTTOM SHEET (Shown to mobile visitors) */}
      {isPromptOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-300">
          <div 
            className="w-full max-w-md bg-card text-card-foreground rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
          >
            {/* Header with gradient bar */}
            <div className="relative bg-gradient-to-r from-primary via-orange-500 to-amber-500 p-5 text-white">
              <button
                onClick={() => dismissPrompt(true)}
                className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-black/20 hover:bg-black/40 active:scale-95 text-white transition-all"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3.5">
                <div className="relative w-16 h-16 rounded-2xl bg-white p-1.5 shadow-lg flex items-center justify-center shrink-0 border-2 border-white/80">
                  <img
                    src="/durtup-logo-transparent.png"
                    alt="Durtup App"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/icon-192.png';
                    }}
                  />
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border border-white"></span>
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[11px] font-semibold text-white mb-1">
                    <Sparkles className="w-3 h-3 text-yellow-300" />
                    <span>Official Mobile App</span>
                  </div>
                  <h3 className="text-lg font-bold leading-tight truncate">Durtup.shop</h3>
                  <p className="text-xs text-white/90 font-medium">⭐⭐⭐⭐⭐ 4.9 (Official Web App)</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <h4 className="font-bold text-base text-foreground leading-snug">
                  সহজ ও দ্রুত কেনাকাটার জন্য অ্যাপটি ফোনে ইনস্টল করুন!
                </h4>
                <p className="text-xs text-muted-foreground">
                  প্লে স্টোর ছাড়াই সরাসরি ১ ক্লিকে আপনার ফোনের হোমস্ক্রিনে ইনস্টল হবে।
                </p>
              </div>

              {/* Feature Highlights Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/60 border border-border/50">
                  <Zap className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium text-foreground text-[11px]">৩ গুণ দ্রুত স্পিড</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/60 border border-border/50">
                  <Smartphone className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium text-foreground text-[11px]">মাত্র ৩ MB সাইজ</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/60 border border-border/50">
                  <BellRing className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium text-foreground text-[11px]">অফার নোটিফিকেশন</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/60 border border-border/50">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium text-foreground text-[11px]">১০০% নিরাপদ ও ফ্রি</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <Button
                  onClick={handleInstallClick}
                  disabled={installing}
                  className="w-full h-12 text-base font-bold rounded-2xl bg-gradient-to-r from-primary via-orange-500 to-amber-500 text-white shadow-lg hover:shadow-xl hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5 animate-bounce" />
                  {isIOS ? 'কিভাবে ইনস্টল করবেন দেখুন' : '📲 এক ক্লিকে ইনস্টল করুন (Install)'}
                </Button>

                <div className="flex items-center justify-between px-1">
                  <button
                    onClick={() => dismissPrompt(true)}
                    className="text-xs text-muted-foreground hover:text-foreground font-medium py-1.5 transition-colors"
                  >
                    পরে করব (Later)
                  </button>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                    Verified Safe PWA
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. iOS SAFARI STEP-BY-STEP INSTALL GUIDE */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[10000] flex items-end justify-center p-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div 
            className="w-full max-w-md bg-card text-card-foreground rounded-t-3xl border-t border-border shadow-2xl p-6 space-y-5 animate-in slide-in-from-bottom duration-300"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <img src="/durtup-logo-transparent.png" alt="Durtup" className="w-8 h-8 object-contain" />
                <h3 className="font-bold text-base">iPhone এ অ্যাপ ইনস্টল করুন</h3>
              </div>
              <button 
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-sm">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/60 border">
                <div className="p-2 rounded-xl bg-primary text-white shrink-0 mt-0.5">
                  <Share className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-foreground">১. Safari ব্রাউজারের নিচে Share চাপুন</p>
                  <p className="text-xs text-muted-foreground mt-0.5">নিচের বারে থাকা Share (⎋) আইকনে ক্লিক করুন।</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/60 border">
                <div className="p-2 rounded-xl bg-primary text-white shrink-0 mt-0.5">
                  <PlusSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-foreground">২. "Add to Home Screen" সিলেক্ট করুন</p>
                  <p className="text-xs text-muted-foreground mt-0.5">মেনু স্ক্রল করে "Add to Home Screen" এ ট্যাপ করে "Add" চাপুন।</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400">
                <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-green-600" />
                <div>
                  <p className="font-bold text-xs">৩. সম্পন্ন!</p>
                  <p className="text-[11px] mt-0.5">আপনার iPhone হোমস্ক্রিনে Durtup App চলে আসবে!</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => setShowIOSGuide(false)}
              className="w-full h-11 rounded-xl bg-primary text-white font-bold"
            >
              বুঝেছি (Got it)
            </Button>
          </div>
        </div>
      )}

      {/* 3. PERSISTENT FLOATING QUICK INSTALL PILL (When dismissed on mobile) */}
      {!isPromptOpen && canInstall && (
        <div className="md:hidden fixed bottom-18 right-3 z-40 animate-in fade-in zoom-in duration-300">
          <button
            onClick={openPrompt}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-gradient-to-r from-primary to-orange-500 text-white font-bold text-xs shadow-xl hover:shadow-2xl active:scale-95 transition-all border-2 border-white/40"
            aria-label="Install App"
          >
            <Download className="w-4 h-4 animate-bounce" />
            <span>অ্যাপ ইনস্টল</span>
          </button>
        </div>
      )}
    </>
  );
};
