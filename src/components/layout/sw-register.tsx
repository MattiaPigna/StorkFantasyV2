"use client";

import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        // Check for updates immediately and every 60s
        reg.update();
        setInterval(() => reg.update(), 60_000);

        // When a new SW takes over, reload the page to get fresh JS/HTML
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.location.reload();
        });
      })
      .catch(() => {});
  }, []);

  return null;
}
