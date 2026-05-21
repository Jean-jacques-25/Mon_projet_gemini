const CACHE_NAME = "databroker229-flask-cache-v1";
const ASSETS = [
  "/",
  "/dashboard",
  "/manifest.json",
  "/static/js/main.js",
  "/static/js/agent.js",
  "/static/js/client.js",
  "/static/js/admin.js",
  "/static/js/chatbot.js",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4",
  "https://unpkg.com/lucide@latest"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Caching production assets inside flask SW...");
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            return caches.delete(k);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request).catch(() => {
        // Fallback or offline page
        return caches.match("/");
      });
    })
  );
});
