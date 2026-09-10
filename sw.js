self.addEventListener("install", (e) => {
  console.log("Service Worker Installed");
});

self.addEventListener("fetch", (e) => {
  if (e.request.url.includes("api.myancode.com")) {
    return; 
  }
  e.respondWith(fetch(e.request));
});