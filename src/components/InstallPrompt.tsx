"use client";

import { useEffect, useState } from "react";

export function InstallPrompt() {
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    setIsIos(/iPad|iPhone|iPod/.test(ua) && !("MSStream" in window));
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    setDismissed(localStorage.getItem("cover-install-dismissed") === "1");
  }, []);

  if (!isIos || isStandalone || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem("cover-install-dismissed", "1");
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-4 inset-x-4 bg-black text-white rounded-2xl p-4 shadow-lg text-sm flex items-start gap-3 max-w-md mx-auto">
      <div className="flex-1">
        <p className="font-medium mb-1">Install Cover</p>
        <p className="text-neutral-300">
          Tap <span className="font-medium">Share</span> →{" "}
          <span className="font-medium">Add to Home Screen</span>.
        </p>
      </div>
      <button onClick={dismiss} className="text-neutral-400 hover:text-white">
        Dismiss
      </button>
    </div>
  );
}
