// Service Worker para notificações em background
self.addEventListener('install', (event) => {
  console.log('✅ Service Worker instalado');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker ativado');
  event.waitUntil(self.clients.claim());
});

// Handler para notificações push (caso use push server no futuro)
self.addEventListener('push', (event) => {
  console.log('📬 Push recebido:', event);

  let data = {
    title: 'SaveDin',
    body: 'Você tem uma nova notificação',
    icon: '/favicon.webp',
    url: '/',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      console.error('Error parsing push data:', e);
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: '/favicon.webp',
    vibrate: [200, 100, 200],
    data: {
      url: data.url,
      timestamp: Date.now(),
    },
    tag: data.tag || 'notification',
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handler para cliques em notificações
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notificação clicada:', event);

  event.notification.close();

  // Se clicou em "Fechar", não fazer nada
  if (event.action === 'close') {
    return;
  }

  const url = event.notification.data?.url || '/';

  // Abrir ou focar o app
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Se já tem janela aberta, focar nela
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }

        // Se não, abrir nova janela
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Handler para fechar notificação
self.addEventListener('notificationclose', (event) => {
  console.log('🔕 Notificação fechada:', event);
});
