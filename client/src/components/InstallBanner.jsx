import { useEffect, useState } from "react";

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  if (!deferredPrompt) return null;

  return (
    <div className="install-banner">
      <div className="row-between">
        <div>
          <div className="text-md" style={{ fontWeight: 700 }}>Install Krushak App</div>
          <div className="text-xs muted">Use it offline from your home screen.</div>
        </div>
        <button className="btn btn-subtle" onClick={handleInstall}>Install</button>
      </div>
    </div>
  );
}
