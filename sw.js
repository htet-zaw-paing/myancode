self.addEventListener("install", (e) => {
  console.log("Service Worker Installed");
});

self.addEventListener("fetch", (e) => {
  if (e.request.url.includes("/supabase-proxy")) {
    return; 
  }
  e.respondWith(fetch(e.request));
});

self.addEventListener("install", (e) => {
  console.log("Service Worker Installed");
});

self.addEventListener("fetch", (e) => {
  if (e.request.url.includes("/supabase-proxy")) {
    return; 
  }
  e.respondWith(fetch(e.request));
});

self.addEventListener('push', function(event) {
    if (event.data) {
        const data = event.data.json();
        
        const options = {
            body: data.body,
            icon: '../favicon.png',
            badge: '../favicon.png',
            vibrate: [200, 100, 200],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: '2'
            }
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('https://myancode.com/hub/') 
    );
});