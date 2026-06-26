/* Service worker minimal dédié aux notifications Web Push.
 * Volontairement SANS gestion du cache/fetch pour ne pas interférer avec le
 * rendu Next.js / l'ISR. Il ne fait que recevoir les push et gérer les clics. */

self.addEventListener("install", (event) => {
  // Active immédiatement la nouvelle version sans attendre la fermeture des onglets.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: "Éphéméride", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Éphéméride";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
    // `tag` regroupe les notifications d'un même événement (évite les doublons).
    tag: payload.tag || undefined,
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Si un onglet de l'app est déjà ouvert, on le réutilise.
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) client.navigate(targetUrl);
            return;
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      }),
  );
});
