/*
 * Only here so reminders can show on phones, which need a service worker for
 * notifications. It doesn't cache anything or touch requests.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => 'focus' in c);
    if (open) return open.focus().then((c) => (c && 'navigate' in c ? c.navigate(url).catch(() => c) : c));
    return self.clients.openWindow(url);
  }));
});
