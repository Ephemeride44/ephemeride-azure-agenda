"use client";

import { ReactNode, Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';

interface PostHogProviderProps {
  children: ReactNode;
}

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

const PostHogProvider = ({ children }: PostHogProviderProps) => {
  useEffect(() => {
    if (!posthogKey) {
      console.warn('NEXT_PUBLIC_POSTHOG_KEY not found. PostHog analytics disabled.');
      return;
    }
    posthog.init(posthogKey, {
      api_host: posthogHost,
      person_profiles: 'identified_only',
      // En App Router on capture les pageviews manuellement (voir PostHogPageView).
      capture_pageview: false,
      capture_pageleave: true,
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') {
          ph.debug();
        }
      },
    });
  }, []);

  return (
    <>
      {/* Isolé sous Suspense : useSearchParams ne doit pas forcer le rendu
          dynamique des pages statiques/ISR (children reste rendu côté serveur). */}
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  );
};

// Capture une pageview à chaque navigation côté client (App Router).
const PostHogPageView = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!posthogKey || !pathname) return;
    let url = window.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url += `?${qs}`;
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return null;
};

export default PostHogProvider;
