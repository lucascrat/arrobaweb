self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'Nova mensagem no Arroba';
  const options = {
    body: data.body || 'Você recebeu uma nova notificação.',
    icon: '/icon.png', // Ideally a real icon path
    badge: '/badge.png',
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
