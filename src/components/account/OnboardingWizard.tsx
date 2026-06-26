"use client";

import { useState } from "react";
import { Bookmark, MapPin, Megaphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { CitySubscriptionsManager } from "@/components/account/CitySubscriptionsManager";
import { OrganizerSubscriptionsList } from "@/components/account/OrganizerSubscriptionsList";
import { useNotificationPrefs } from "@/hooks/use-notification-prefs";
import { usePushSubscription } from "@/hooks/use-push-subscription";

const TOTAL_STEPS = 3;

interface OnboardingWizardProps {
  open: boolean;
  step: number;
  onStepChange: (step: number) => void;
  onClose: () => void;
}

/**
 * Wizard d'onboarding en 3 étapes : communes suivies, organisateur·ices, préférences
 * push. Chaque étape peut être passée. Réutilise les managers communs à la page
 * Compte.
 */
export const OnboardingWizard = ({ open, step, onStepChange, onClose }: OnboardingWizardProps) => {
  const next = () => {
    if (step >= TOTAL_STEPS) onClose();
    else onStepChange(step + 1);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <div className="space-y-2">
          <Progress value={(step / TOTAL_STEPS) * 100} className="h-1.5" />
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-violet">
            Étape {step} sur {TOTAL_STEPS}
          </p>
        </div>

        {step === 1 && <StepCities />}
        {step === 2 && <StepOrganizers />}
        {step === 3 && <StepPush />}

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={next}>{step >= TOTAL_STEPS ? "Terminer" : "Continuer"}</Button>
          <Button variant="ghost" size="sm" onClick={next} className="text-muted-foreground">
            {step >= TOTAL_STEPS ? "Fermer" : "Passer cette étape"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const StepCities = () => (
  <>
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-accent-violet" />
        Suivez vos communes
      </DialogTitle>
      <DialogDescription>
        Recevez les nouveaux événements publiés dans les villes que vous choisissez.
      </DialogDescription>
    </DialogHeader>
    <div className="py-2">
      <CitySubscriptionsManager />
    </div>
  </>
);

const StepOrganizers = () => (
  <>
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-emerald-500" />
        Abonnez-vous aux organisateur·ices
      </DialogTitle>
      <DialogDescription>
        Recevez leurs annonces en direct : nouveaux événements, billetterie, infos de dernière minute.
      </DialogDescription>
    </DialogHeader>
    <div className="max-h-[320px] overflow-y-auto py-2">
      <OrganizerSubscriptionsList />
    </div>
  </>
);

const StepPush = () => {
  const { prefs, setPref } = useNotificationPrefs();
  const { isSupported, isIos, isStandalone, isSubscribed, subscribe } = usePushSubscription();
  const [activating, setActivating] = useState(false);

  const rows: { key: keyof typeof prefs; icon: React.ReactNode; title: string; description: string }[] = [
    {
      key: "notify_bookmarks",
      icon: <Bookmark className="h-5 w-5 text-accent-peach" />,
      title: "Événements favoris",
      description: "Horaire, lieu, annulation, rappel",
    },
    {
      key: "notify_cities",
      icon: <MapPin className="h-5 w-5 text-accent-violet" />,
      title: "Flux par ville",
      description: "Nouveaux événements dans vos communes",
    },
    {
      key: "notify_organizations",
      icon: <Megaphone className="h-5 w-5 text-emerald-500" />,
      title: "Organisateur·ices suivis",
      description: "Annonces en direct",
    },
  ];

  const handleToggle = async (key: keyof typeof prefs, value: boolean) => {
    setPref(key, value);
    // À la première activation, demander la permission push sur cet appareil.
    if (value && isSupported && !isSubscribed && !(isIos && !isStandalone)) {
      setActivating(true);
      await subscribe();
      setActivating(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Vos notifications push</DialogTitle>
        <DialogDescription>
          Choisissez ce dont vous voulez être prévenu·e. Modifiable à tout moment.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2 py-2">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card/50 p-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0">{row.icon}</span>
              <div className="space-y-0.5">
                <p className="font-medium">{row.title}</p>
                <p className="text-sm text-muted-foreground">{row.description}</p>
              </div>
            </div>
            <Switch
              checked={prefs[row.key]}
              disabled={activating}
              onCheckedChange={(v) => void handleToggle(row.key, v)}
              aria-label={row.title}
            />
          </div>
        ))}
        {isIos && !isStandalone && (
          <p className="text-xs text-muted-foreground">
            Sur iPhone, ajoutez d'abord Éphéméride à l'écran d'accueil pour recevoir les notifications.
          </p>
        )}
      </div>
    </>
  );
};

export default OnboardingWizard;
