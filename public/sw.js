// Cover service worker — minimal v1.
// Required for PWA install prompt on iOS Safari and Chrome.
// Caches nothing; offline strategy comes post-v1.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Pass-through — no caching yet.
});
