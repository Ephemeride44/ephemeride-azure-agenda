"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Bell } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePushSubscription } from "@/hooks/use-push-subscription";

interface PushPromptContextValue {
  /** Ouvre la proposition d'activation des notifications si l'utilisateur y est éligible. */
  promptPushIfEligible: () => void;
}

const PushPromptContext = createContext<PushPromptContextValue | undefined>(undefined);

// Délai avant de re-proposer après un « Plus tard » (anti-spam).
const SNOOZE_KEY = "push-prompt-snooze-until";
const SNOOZE_DAYS = 7;
// Refus définitif (« Ne plus me proposer ») — propre à ce navigateur.
const OPTOUT_KEY = "push-prompt-optout";

/**
 * Propose globalement d'activer les notifications push au bon moment (1er favori,
 * inscription). N'apparaît que si le navigateur le supporte, que la permission
 * n'a pas encore été décidée, que l'utilisateur n'est pas déjà abonné et qu'il
 * n'a pas récemment reporté. Sur iOS non installé, le push est indisponible → on
 * ne propose rien (l'astuce « écran d'accueil » reste sur la page Mes favoris).
 */
export const PushPromptProvider = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { isSupported, permission, isSubscribed, isLoading, subscribe } = usePushSubscription();

  const promptPushIfEligible = useCallback(() => {
    if (isLoading || !isSupported || isSubscribed || permission !== "default") return;
    try {
      if (localStorage.getItem(OPTOUT_KEY)) return; // refus définitif
      const until = localStorage.getItem(SNOOZE_KEY);
      if (until && Number(until) > Date.now()) return;
    } catch {
      /* localStorage indisponible : on propose quand même */
    }
    setOpen(true);
  }, [isLoading, isSupported, isSubscribed, permission]);

  const snooze = () => {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000));
    } catch {
      /* ignore */
    }
  };

  const optOut = () => {
    try {
      localStorage.setItem(OPTOUT_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const handleActivate = async () => {
    const ok = await subscribe();
    setOpen(false);
    toast(
      ok
        ? { title: "Notifications activées", description: "Vous serez prévenu des changements sur vos favoris." }
        : { title: "Notifications non activées", description: "Vous pourrez réessayer depuis « Mes favoris ».", variant: "destructive" },
    );
  };

  return (
    <PushPromptContext.Provider value={{ promptPushIfEligible }}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) snooze();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-accent-peach" />
              Activer les notifications ?
            </DialogTitle>
            <DialogDescription>
              Recevez une alerte si un événement que vous suivez change (annulation,
              complet, nouvel horaire ou lieu).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col sm:gap-2">
            <Button onClick={() => void handleActivate()}>Activer</Button>
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  snooze();
                  setOpen(false);
                }}
              >
                Plus tard
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={optOut}
              >
                Ne plus me proposer
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PushPromptContext.Provider>
  );
};

export const usePushPrompt = (): PushPromptContextValue => {
  const ctx = useContext(PushPromptContext);
  if (!ctx) return { promptPushIfEligible: () => {} };
  return ctx;
};
