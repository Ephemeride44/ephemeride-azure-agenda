import posthog from 'posthog-js';

/**
 * Hook personnalisé pour utiliser PostHog analytics
 * Fournit des méthodes simplifiées pour le tracking des événements
 */
export const usePostHog = () => {
  const isEnabled = () => {
    return !!import.meta.env.VITE_POSTHOG_PUBLIC_KEY;
  };

  const capture = (eventName: string, properties?: Record<string, any>) => {
    if (isEnabled()) {
      posthog.capture(eventName, properties);
    }
  };

  const identify = (userId: string, properties?: Record<string, any>) => {
    if (isEnabled()) {
      posthog.identify(userId, properties);
    }
  };

  const reset = () => {
    if (isEnabled()) {
      posthog.reset();
    }
  };

  const setPersonProperties = (properties: Record<string, any>) => {
    if (isEnabled()) {
      posthog.setPersonProperties(properties);
    }
  };

  const alias = (alias: string) => {
    if (isEnabled()) {
      posthog.alias(alias);
    }
  };

  const group = (groupType: string, groupKey: string, properties?: Record<string, any>) => {
    if (isEnabled()) {
      posthog.group(groupType, groupKey, properties);
    }
  };

  return {
    capture,
    identify,
    reset,
    setPersonProperties,
    alias,
    group,
    isEnabled: isEnabled(),
    posthog: isEnabled() ? posthog : null
  };
};
