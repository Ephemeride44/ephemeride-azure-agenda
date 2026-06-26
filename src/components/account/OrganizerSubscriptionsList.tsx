"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GradientAvatar } from "@/components/account/GradientAvatar";
import { useOrganizerSubscriptions } from "@/hooks/use-organizer-subscriptions";

interface OrganizerSubscriptionsListProps {
  /** Limite le nombre d'organisateur·ices affichés (ex: étape wizard). */
  limit?: number;
  /** N'affiche que les organisateur·ices déjà suivis (page « Organisateur·ices suivis »). */
  onlySubscribed?: boolean;
}

/**
 * Liste d'organisateur·ices avec bouton S'abonner / Abonné. Réutilisée par le wizard
 * d'onboarding et les pages Compte.
 */
export const OrganizerSubscriptionsList = ({ limit, onlySubscribed }: OrganizerSubscriptionsListProps) => {
  const { organizations, isSubscribed, toggle } = useOrganizerSubscriptions();

  let list = organizations;
  if (onlySubscribed) list = list.filter((o) => isSubscribed(o.id));
  if (limit) list = list.slice(0, limit);

  if (list.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {onlySubscribed
          ? "Vous ne suivez aucun·e organisateur·ice pour le moment."
          : "Aucun·e organisateur·ice disponible pour le moment."}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {list.map((org) => {
        const subscribed = isSubscribed(org.id);
        const place = [org.location_city, org.location_department].filter(Boolean).join(" · ");
        return (
          <div
            key={org.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card/50 p-3"
          >
            <GradientAvatar name={org.name} src={org.logo_url} className="h-11 w-11" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{org.name}</p>
              {place && <p className="truncate text-sm text-muted-foreground">{place}</p>}
            </div>
            <Button
              type="button"
              size="sm"
              variant={subscribed ? "outline" : "default"}
              onClick={() => toggle(org.id)}
              className={subscribed ? "text-emerald-600" : undefined}
            >
              {subscribed ? (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  Abonné
                </>
              ) : (
                "S'abonner"
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
};

export default OrganizerSubscriptionsList;
