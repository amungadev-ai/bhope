import { useEffect, useState } from 'react';
import { Download, RefreshCw, WifiOff } from 'lucide-react';
interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
let promptEvent: InstallPrompt | null = null;
let waiting: ServiceWorker | null = null;
let registered = false;
export function registerStudioWorker() {
  if (registered || !import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  registered = true;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    promptEvent = event as InstallPrompt;
    window.dispatchEvent(new Event('studio-install-ready'));
  });
  void navigator.serviceWorker
    // BASE_URL is '/' when the studio is deployed to its own origin (Vercel)
    // and '/console/' when the API hosts it, so both layouts install cleanly.
    .register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
      updateViaCache: 'none',
    })
    .then((registration) => {
      const announce = () => {
        waiting = registration.waiting;
        window.dispatchEvent(new Event('studio-update-ready'));
      };
      if (registration.waiting) announce();
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) announce();
        });
      });
    })
    .catch(() => {
      /* The online studio remains usable if installation is unavailable. */
    });
}
export function PwaControls() {
  const [installable, setInstallable] = useState(Boolean(promptEvent));
  const [updated, setUpdated] = useState(Boolean(waiting));
  const [online, setOnline] = useState(navigator.onLine);
  const [installed, setInstalled] = useState(
    window.matchMedia('(display-mode: standalone)').matches,
  );
  const [help, setHelp] = useState(false);
  useEffect(() => {
    const ready = () => setInstallable(Boolean(promptEvent));
    const update = () => setUpdated(Boolean(waiting));
    const connection = () => setOnline(navigator.onLine);
    const added = () => {
      promptEvent = null;
      setInstalled(true);
      setInstallable(false);
    };
    window.addEventListener('studio-install-ready', ready);
    window.addEventListener('studio-update-ready', update);
    window.addEventListener('online', connection);
    window.addEventListener('offline', connection);
    window.addEventListener('appinstalled', added);
    return () => {
      window.removeEventListener('studio-install-ready', ready);
      window.removeEventListener('studio-update-ready', update);
      window.removeEventListener('online', connection);
      window.removeEventListener('offline', connection);
      window.removeEventListener('appinstalled', added);
    };
  }, []);
  async function install() {
    if (!promptEvent) {
      setHelp((value) => !value);
      return;
    }
    const event = promptEvent;
    await event.prompt();
    await event.userChoice;
    promptEvent = null;
    setInstallable(false);
  }
  function update() {
    if (
      !waiting ||
      !window.confirm('Save your current draft before updating the studio. Reload now?')
    )
      return;
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
      once: true,
    });
    waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
  }
  return (
    <div className="pwa-controls">
      {!online && (
        <p role="status">
          <WifiOff size={16} />
          You are offline. Connect to save or publish.
        </p>
      )}
      {!installed && (
        <button className="secondary" onClick={() => void install()}>
          <Download size={16} />
          {installable ? 'Install studio' : 'Install app'}
        </button>
      )}
      {help && (
        <p>
          On Android, choose Install app from your browser menu. On iPhone, use Safari’s Share menu
          → Add to Home Screen.
        </p>
      )}
      {updated && (
        <button className="text-button" onClick={update}>
          <RefreshCw size={15} />A new version is ready
        </button>
      )}
    </div>
  );
}
