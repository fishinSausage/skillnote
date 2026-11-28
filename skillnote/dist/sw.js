const cachePrefix = "skillnote-shell-" + self.registration.scope + "-";
const cacheName = cachePrefix + "27";
const assets = ["index.html","styles.css?v=18","app.js?v=18","catalog.js?v=18","storage.js?v=18","eclass.js?v=18","icons.js","mark.svg"];
const assetUrls = new Set(assets.map(name => new URL(name,self.registration.scope).href));
const entry = new URL("index.html",self.registration.scope).href;
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll([...assetUrls].map(url => new Request(url,{cache:"reload"})));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(cachePrefix) && name !== cacheName) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const {request} = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const pageUrl = url.origin + url.pathname;
  const isShell = request.mode === "navigate" && (pageUrl === self.registration.scope || pageUrl === entry);
  if (!isShell && !assetUrls.has(request.url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    return await cache.match(isShell ? entry : request.url) || fetch(request);
  })());
});
