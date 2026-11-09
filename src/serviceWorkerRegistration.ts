export const registerServiceWorker = (): void => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // Auto-check for updates on load
        registration.update().catch(() => {});

        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New update available; inform the user or auto-activate
                installingWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            }
          };
        };
      })
      .catch((error) => {
        console.warn('Service Worker registration failed:', error);
      });
  });
};

