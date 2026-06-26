"use client";

import { Bell, BellOff, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "@/hooks/use-push-subscription";

/**
 * Carte d'activation des notifications push sur la page « Mes favoris ».
 * Gère le cas iOS : sur iPhone/iPad, le Web Push n'est disponible qu'une fois
 * l'app ajoutée à l'écran d'accueil → on affiche alors un mode d'emploi plutôt
 * qu'un bouton inopérant.
 */
export const NotificationToggle = () => {
  const {
    isSupported,
    isIos,
    isStandalone,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  } = usePushSubscription();

  // iOS hors PWA installée : le push est impossible tant que l'app n'est pas
  // ajoutée à l'écran d'accueil.
  if (isIos && !isStandalone) {
    return (
      <Box>
        <div className="flex items-start gap-3">
          <Share className="mt-0.5 h-5 w-5 shrink-0 text-accent-peach" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">Activez les notifications sur iPhone</p>
            <p className="opacity-75">
              Touchez le bouton <strong>Partager</strong> de Safari, puis
              «&nbsp;Sur l'écran d'accueil&nbsp;». Rouvrez Éphéméride depuis
              l'icône installée pour activer les notifications.
            </p>
          </div>
        </div>
      </Box>
    );
  }

  if (!isSupported) {
    return (
      <Box>
        <p className="text-sm opacity-75">
          Votre navigateur ne supporte pas les notifications.
        </p>
      </Box>
    );
  }

  if (permission === "denied") {
    return (
      <Box>
        <div className="flex items-start gap-3">
          <BellOff className="mt-0.5 h-5 w-5 shrink-0 opacity-70" />
          <p className="text-sm opacity-75">
            Les notifications sont bloquées pour ce site. Réactivez-les dans les
            réglages de votre navigateur pour être prévenu des changements.
          </p>
        </div>
      </Box>
    );
  }

  return (
    <Box>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Bell className="mt-0.5 h-5 w-5 shrink-0 text-accent-peach" />
          <div className="space-y-0.5 text-sm">
            <p className="font-medium">
              {isSubscribed ? "Notifications activées" : "Être prévenu des changements"}
            </p>
            <p className="opacity-75">
              {isSubscribed
                ? "Vous recevrez un push si un de vos favoris change (annulation, complet, horaire…)."
                : "Recevez un push quand un événement favori est modifié."}
            </p>
          </div>
        </div>
        {isSubscribed ? (
          <Button variant="outline" size="sm" disabled={isLoading} onClick={() => void unsubscribe()}>
            Désactiver
          </Button>
        ) : (
          <Button size="sm" disabled={isLoading} onClick={() => void subscribe()}>
            {isLoading ? "…" : "Activer"}
          </Button>
        )}
      </div>
    </Box>
  );
};

const Box = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl border border-white/10 bg-white/5 p-4">{children}</div>
);

export default NotificationToggle;
