// service-worker.js

// This event is fired when the service worker is installed.
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installed');
    // `self.skipWaiting()` forces the waiting service worker to become the active service worker.
    // This means the new service worker will take control of the page immediately.
    self.skipWaiting();
});

// This event is fired when the service worker is activated.
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activated');
    // `clients.claim()` allows the active service worker to take control of all clients
    // (pages) within its scope, even if they were loaded before the service worker was active.
    event.waitUntil(clients.claim());
});

// This event is fired when a push message is received from the push service.
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push event received');
    // Parse the payload sent from your server.
    // The data is expected to be a JSON string.
    const data = event.data.json();
    console.log('Push data:', data);

    // Extract notification details from the payload.
    const title = data.title || 'New Notification';
    const options = {
        body: data.body || 'You have a new message.',
        // Optional: Path to an icon for the notification.
        // This path is relative to the service worker's scope (usually the root of your domain).
        icon: '/icon.png', // IMPORTANT: Replace with your actual icon path, or remove if not used
        // Optional: Path to a badge icon (smaller icon for notification tray on some OS).
        badge: '/badge.png', // IMPORTANT: Replace with your actual badge path, or remove if not used
        // Custom data that can be accessed when the notification is clicked.
        data: {
            url: data.url || '/' // URL to open when notification is clicked
        }
    };

    // `event.waitUntil()` ensures the service worker stays alive until the promise resolves.
    // This is crucial for displaying the notification.
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// This event is fired when the user clicks on a notification.
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification clicked');
    event.notification.close(); // Close the notification after it's clicked.

    const urlToOpen = event.notification.data.url; // Get the URL from the notification's data.

    // `event.waitUntil()` ensures the service worker stays alive until the promise resolves.
    event.waitUntil(
        // `clients.matchAll()` finds all open client windows/tabs controlled by this service worker.
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                // If a client (tab) with the target URL is already open, focus it.
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no matching client is found, open a new window/tab with the target URL.
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
