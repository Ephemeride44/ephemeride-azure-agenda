/** @type {import('next').NextConfig} */
const nextConfig = {
  // Déploiement Vercel : l'ISR est géré nativement, pas besoin de `output:
  // standalone` (réservé à l'auto-hébergement Docker, et il casse `next start`).
  // En Next 16, ESLint ne tourne plus pendant `next build` (on lance ESLint
  // séparément), donc plus besoin de clé `eslint` ici.
  //
  // Le projet Lovable est en `strict: false` et n'a jamais été type-checké au
  // build (Vite ne le faisait pas). On conserve ce comportement pour ne pas
  // bloquer sur des erreurs de typage héritées (typage Supabase généré).
  // À resserrer progressivement ensuite.
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "kgjvfuzdnbvgxkbndwfr.supabase.co",
      },
    ],
  },
};

export default nextConfig;
