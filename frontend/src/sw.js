import { precacheAndRoute, cleanupOutdatedCaches, navigateFallback } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

self.__WB_MANIFEST; // injected by vite-plugin-pwa

clientsClaim();
self.skipWaiting();

precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// Navigation fallback for SPA
registerRoute(
  new NavigationRoute(async () => {
    const cache = await caches.open('pages');
    return (await cache.match('/index.html')) || fetch('/index.html');
  })
);

// Cache Google Fonts
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
);

// ─── Notification messages ────────────────────────────────────────────────────
const MESSAGES = [
  { title: '⚡ Time to Focus', body: "Don't forget to update your tasks. Small steps = big wins." },
  { title: '🎯 Check Your Goals', body: "How's your progress today? Open FocusFlow and stay on track." },
  { title: '🌱 Habit Check-In', body: "Have you checked off your habits today? Keep the streak alive!" },
  { title: '💡 Productivity Tip', body: "Break big tasks into small ones. Tick one off right now." },
  { title: '🔥 Stay Consistent', body: "Consistency beats perfection. Log your progress in FocusFlow." },
  { title: '⏰ Focus Session', body: "Ready for a 25-minute deep work session? Let's go!" },
  { title: '📋 Task Reminder', body: "You have tasks waiting. A few minutes now saves stress later." },
  { title: '🌟 You Got This', body: "Every completed task is a win. Open FocusFlow and crush it." },
  { title: '🧘 Take a Breath', body: "Pause, refocus, then tackle your next task. You're doing great." },
  { title: '📈 Progress Check', body: "Check your weekly progress — you might be closer than you think!" },
];

const INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours

// ─── Periodic notification via setInterval in SW ─────────────────────────────
let notifTimer = null;

function scheduleNotifications() {
  if (notifTimer) return;
  notifTimer = setInterval(() => {
    if (self.Notification?.permission !== 'granted') return;
    showRandomNotification();
  }, INTERVAL_MS);
}

// Start scheduling when SW activates
self.addEventListener('activate', () => {
  scheduleNotifications();
});

// Also start on fetch (keeps SW alive on Android)
self.addEventListener('fetch', () => {
  scheduleNotifications();
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Focus existing window if open
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      return clients.openWindow('/');
    })
  );
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'START_NOTIFICATIONS') scheduleNotifications();
});

// ─── Periodic Background Sync (fires even when app is closed) ────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'focusflow-reminder') {
    event.waitUntil(showRandomNotification());
  }
});

async function showRandomNotification() {
  const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  return self.registration.showNotification(msg.title, {
    body: msg.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'focusflow-reminder',
    renotify: true,
    vibrate: [100, 50, 100],
    data: { url: '/' },
    actions: [
      { action: 'open',    title: '📋 Open App' },
      { action: 'dismiss', title: 'Dismiss'     },
    ],
  });
}
