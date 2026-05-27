self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Termin-Erinnerung", {
      body: data.body ?? "",
      data: { url: data.url ?? "/calendar" }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/calendar";
  event.waitUntil(clients.openWindow(url));
});
