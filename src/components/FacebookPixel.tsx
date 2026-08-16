import { useEffect } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export function FacebookPixel() {
  const { rawSettings: settings } = useSiteSettings();

  useEffect(() => {
    if (!settings?.facebookPixelId) return;

    const pixelId = settings.facebookPixelId;

    // Initialize Facebook Pixel
    (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
      if (f.fbq) return;
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(
      window,
      document,
      "script",
      "https://connect.facebook.net/en_US/fbevents.js"
    );

    window.fbq("init", pixelId);
    window.fbq("track", "PageView");

    // Cleanup on unmount
    return () => {
      // Remove fbq script if needed
      const scripts = document.querySelectorAll('script[src*="fbevents.js"]');
      scripts.forEach(script => script.remove());
    };
  }, [settings?.facebookPixelId]);

  if (!settings?.facebookPixelId) return null;

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${settings.facebookPixelId}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}

// Helper functions to track events
export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (window.fbq) {
    window.fbq("track", eventName, params);
  }
};

export const trackAddToCart = (productId: string, productName: string, price: number) => {
  trackEvent("AddToCart", {
    content_ids: [productId],
    content_name: productName,
    content_type: "product",
    value: price,
    currency: "USD",
  });
};

export const trackPurchase = (orderId: string, total: number, items: any[]) => {
  trackEvent("Purchase", {
    content_ids: items.map((i) => i.product_id),
    content_type: "product",
    value: total,
    currency: "USD",
    order_id: orderId,
  });
};

export const trackViewContent = (productId: string, productName: string, price: number) => {
  trackEvent("ViewContent", {
    content_ids: [productId],
    content_name: productName,
    content_type: "product",
    value: price,
    currency: "USD",
  });
};

export const trackSearch = (searchQuery: string) => {
  trackEvent("Search", {
    search_string: searchQuery,
  });
};
