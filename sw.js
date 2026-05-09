self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "NOTIFY") {
    self.registration.showNotification(event.data.title, {
      body: event.data.body,
      icon: "/icon.png",
      badge: "/icon.png",
      vibrate: [200, 100, 200],
      requireInteraction: false,
    });
  }
});
