"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker des notifications (public/sw.js) au montage.
 * Ne rend rien. Silencieux si le navigateur ne supporte pas les service workers.
 */
export const ServiceWorkerRegister = () => {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Échec de l'enregistrement du service worker :", err);
      });
    };
    // Après le load pour ne pas concurrencer le premier rendu.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
};

export default ServiceWorkerRegister;
