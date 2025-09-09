import { ReactNode, useEffect } from 'react';
import posthog from 'posthog-js';

interface PostHogProviderProps {
  children: ReactNode;
}

const PostHogProvider = ({ children }: PostHogProviderProps) => {
  useEffect(() => {
    // Récupérer les variables d'environnement
    const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
    const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

    // Initialiser PostHog seulement si la clé publique est fournie
    if (posthogKey) {
      posthog.init(posthogKey, {
        api_host: posthogHost,
        person_profiles: 'identified_only', // ou 'always' selon tes besoins
        capture_pageview: true,
        capture_pageleave: true,
        loaded: (posthog) => {
          // Configuration additionnelle après le chargement
          if (import.meta.env.DEV) {
            console.log('PostHog initialized in development mode');
            posthog.debug(); // Active le debug en développement
          }
        }
      });
    } else {
      console.warn('VITE_PUBLIC_POSTHOG_KEY not found. PostHog analytics disabled.');
    }

    // Cleanup lors du démontage
    return () => {
      if (posthogKey) {
        posthog.reset();
      }
    };
  }, []);

  return <>{children}</>;
};

export default PostHogProvider;
