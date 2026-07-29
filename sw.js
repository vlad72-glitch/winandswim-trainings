/* Win and Swim Training Generator — service worker.
   Bump CACHE_NAME (v1 → v2 → …) whenever you change any file, so
   installed phones drop the old cached version. */
var CACHE_NAME = "ws-training-v1";
var ASSETS = [
  "./",
  "./index.html",
  "./config.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  // Never intercept the database, auth, or Edge Function traffic.
  if (url.hostname.endsWith(".supabase.co")) return;
  if (e.request.method !== "GET") return;

  // Network-first for navigations (so updates arrive), cache-first for assets.
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).then(function (r) {
        var copy = r.clone();
        caches.open(CACHE_NAME).then(function (c) { c.put(e.request, copy); });
        return r;
      }).catch(function () { return caches.match(e.request).then(function (m) { return m || caches.match("./index.html"); }); })
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function (m) {
      return m || fetch(e.request).then(function (r) {
        var copy = r.clone();
        caches.open(CACHE_NAME).then(function (c) { c.put(e.request, copy); });
        return r;
      });
    })
  );
});
