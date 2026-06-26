import type { MetadataRoute } from "next";

// Manifeste PWA : permet l'installation sur l'écran d'accueil (requis pour les
// notifications Web Push sur iOS 16.4+) et l'icône d'application.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Éphéméride — Agenda du vignoble nantais",
    short_name: "Éphéméride",
    description: "L'agenda culturel et citoyen du vignoble nantais",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#1B263B",
    theme_color: "#1B263B",
    lang: "fr",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
