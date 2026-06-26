"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as baseSupabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { WelcomeDialog } from "@/components/account/WelcomeDialog";
import { OnboardingWizard } from "@/components/account/OnboardingWizard";

const supabase = baseSupabase as unknown as SupabaseClient;

interface OnboardingContextValue {
  /** Démarre le parcours (dialog de bienvenue), typiquement après une inscription. */
  startOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

type Phase = "idle" | "welcome" | "wizard";

const doneKey = (userId: string) => `onboarding-done-${userId}`;

/**
 * Orchestre le parcours d'onboarding : dialog de bienvenue → wizard 3 étapes.
 * Déclenché explicitement après une inscription (session immédiate) ou, pour le
 * flux « confirmation e-mail », au premier login d'un compte jamais configuré
 * (pas de ligne notification_preferences et pas de marqueur local).
 */
export const OnboardingProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id as string | undefined;
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(1);
  const autoCheckedFor = useRef<string | null>(null);

  const markDone = useCallback(() => {
    if (userId) {
      try {
        localStorage.setItem(doneKey(userId), "1");
      } catch {
        /* ignore */
      }
    }
  }, [userId]);

  const startOnboarding = useCallback(() => {
    setStep(1);
    setPhase("welcome");
  }, []);

  // Détection « premier login d'un compte non configuré » (flux confirmation e-mail).
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    if (autoCheckedFor.current === userId) return;
    autoCheckedFor.current = userId;

    let cancelled = false;
    const check = async () => {
      try {
        if (localStorage.getItem(doneKey(userId))) return;
      } catch {
        /* localStorage indisponible : on continue */
      }
      // Un compte déjà configuré possède une ligne de préférences.
      const { data } = await supabase
        .from("notification_preferences")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        markDone();
        return;
      }
      setStep(1);
      setPhase("welcome");
    };
    void check();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId, markDone]);

  const closeAll = useCallback(() => {
    markDone();
    setPhase("idle");
  }, [markDone]);

  return (
    <OnboardingContext.Provider value={{ startOnboarding }}>
      {children}
      <WelcomeDialog
        open={phase === "welcome"}
        onConfigure={() => {
          setStep(1);
          setPhase("wizard");
        }}
        onSkip={closeAll}
      />
      <OnboardingWizard
        open={phase === "wizard"}
        step={step}
        onStepChange={setStep}
        onClose={closeAll}
      />
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = (): OnboardingContextValue => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) return { startOnboarding: () => {} };
  return ctx;
};
