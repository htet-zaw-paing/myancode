self.addEventListener("install", (e) => {
  console.log("Service Worker Installed");
});

self.addEventListener("fetch", (e) => {
  if (e.request.url.includes("/supabase-proxy")) {
    return; 
  }
  e.respondWith(fetch(e.request));
});