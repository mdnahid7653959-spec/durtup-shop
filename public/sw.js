const CACHE_NAME = 'durtup-v13';
const STATIC_CACHE = 'durtup-static-v13';
const DYNAMIC_CACHE = 'durtup-dynamic-v13';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/durtup-logo.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first with cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith('http')) return;

  // IMPORTANT: never cache dev/build module files (prevents blank screens after updates)
  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.includes('/node_modules/.vite/') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.endsWith('.js') ||
    url.searchParams.has('v')
  ) {
    return; // let browser handle normally (network)
  }

  // Skip API requests from caching
  if (url.pathname.startsWith('/rest/') || url.hostname.includes('supabase')) {
    return;
  }

  // For navigation requests, use network first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clonedResponse = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, clonedResponse);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/');
          });
        })
    );
    return;
  }

  // For static assets, use cache first
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version and update cache in background
          fetch(request).then((response) => {
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, response);
            });
          });
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          const clonedResponse = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, clonedResponse);
          });
          return response;
        });
      })
    );
    return;
  }

  // Default: network first
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clonedResponse = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, clonedResponse);
        });
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Handle rich push notifications (with product images & sound/vibrate)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || '🛍️ New Order Received - Durtup.shop';
    const prodImg = data.image || data.product_image;

    event.waitUntil(
      self.registration.showNotification(title, {
        body: data.body || 'A new order has been placed on Durtup.shop!',
        icon: prodImg || '/durtup-logo.png',
        badge: '/durtup-logo.png',
        image: prodImg || undefined,
        vibrate: [400, 150, 400, 150, 400, 150, 800],
        requireInteraction: true,
        tag: data.tag || `durtup-${Date.now()}`,
        data: {
          url: data.url || '/admin/orders',
          order_id: data.order_id
        },
        actions: [
          { action: 'view_order', title: '🛍️ View Order' },
          { action: 'open_admin', title: '⚡ Open Admin' }
        ]
      })
    );
  } catch (err) {
    console.warn('[SW] Push notification parse error:', err);
  }
});

// Handle custom messages from web app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const payload = event.data.payload || {};
    const prodImg = payload.image || payload.product_image;
    self.registration.showNotification(payload.title || '🛍️ New Order Alert', {
      body: payload.body || 'Order received',
      icon: prodImg || '/durtup-logo.png',
      badge: '/durtup-logo.png',
      image: prodImg || undefined,
      vibrate: [400, 150, 400, 150, 400, 150, 800],
      tag: payload.tag || `durtup-msg-${Date.now()}`,
      data: payload.data || { url: '/admin/orders' }
    });
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const targetUrl = (event.notification.data && event.notification.data.url) || '/admin/orders';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes('/admin') && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

