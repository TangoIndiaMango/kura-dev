/* KURA operator SW — shell cache, update handshake, offline navigation */
const CACHE = 'kura-op-v3'
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/brand/kura-mark.png',
  '/brand/kura-mark-circle.png',
]

function isViteDevModule(url) {
  return (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/@fs/') ||
    url.pathname.startsWith('/@id/') ||
    url.pathname.includes('node_modules/.vite')
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => {
      /* wait for SKIP_WAITING from the app for controlled updates */
    }),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.pathname.startsWith('/api')) return
  // Never intercept Vite HMR / source modules — cache-first breaks named exports after edits.
  if (url.origin === self.location.origin && isViteDevModule(url)) return

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (
            response &&
            response.ok &&
            request.url.startsWith(self.location.origin) &&
            request.destination !== 'script' &&
            (request.destination === 'document' ||
              request.destination === 'style' ||
              request.destination === 'image' ||
              request.destination === 'font' ||
              url.pathname === '/manifest.webmanifest')
          ) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached || caches.match('/index.html'))
      // Documents: prefer network so index.html picks up new module graphs.
      if (request.destination === 'document') {
        return network
      }
      return cached || network
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow('/')
      return undefined
    }),
  )
})
