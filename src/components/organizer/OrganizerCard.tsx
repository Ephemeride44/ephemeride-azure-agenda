"use client";

import { Bell, Check, Globe, MapPin, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useOrganizerSubscriptions } from "@/hooks/use-organizer-subscriptions";
import { getInitials } from "@/lib/user";

interface OrganizerCardProps {
  organization: {
    id: string;
    name: string;
    description: string | null;
    website_url: string | null;
    location_city: string | null;
    location_department: string | null;
    logo_url: string | null;
  };
  eventCount: number;
  subscriberCount: number;
}

/**
 * Carte d'identité d'un·e organisateur·ice (page publique) : bandeau dégradé, avatar,
 * compteurs, lien site, abonnement et partage.
 */
export const OrganizerCard = ({ organization, eventCount, subscriberCount }: OrganizerCardProps) => {
  const { isSubscribed, toggle } = useOrganizerSubscriptions();
  const { toast } = useToast();
  const subscribed = isSubscribed(organization.id);
  const place = [organization.location_city, organization.location_department && `(${organization.location_department})`]
    .filter(Boolean)
    .join(" ");

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: organization.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Lien copié", description: "Le lien de l'organisateur·ice a été copié." });
      }
    } catch {
      /* partage annulé */
    }
  };

  // Affiche un compteur d'abonnés cohérent (optimiste) selon l'état local.
  const subscribers = subscriberCount;

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="h-24 bg-gradient-to-br from-accent-peach/70 to-accent-violet/70" />
      <div className="px-5 pb-5">
        <div className="-mt-10 mb-3">
          {organization.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={organization.logo_url}
              alt={organization.name}
              className="h-20 w-20 rounded-xl object-cover ring-4 ring-card"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-accent-peach to-accent-violet text-2xl font-semibold text-white ring-4 ring-card">
              {getInitials(organization.name)}
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold">{organization.name}</h1>
        {place && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {place}
          </p>
        )}

        {organization.description && (
          <p className="mt-3 text-sm text-muted-foreground">{organization.description}</p>
        )}

        <div className="mt-4 flex gap-6">
          <div>
            <p className="text-xl font-bold">{eventCount}</p>
            <p className="text-xs text-muted-foreground">événement{eventCount > 1 ? "s" : ""}</p>
          </div>
          <div>
            <p className="text-xl font-bold">{subscribers}</p>
            <p className="text-xs text-muted-foreground">abonné{subscribers > 1 ? "s" : ""}</p>
          </div>
        </div>

        {organization.website_url && (
          <a
            href={organization.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-accent-violet hover:underline"
          >
            <Globe className="h-4 w-4" />
            {organization.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </a>
        )}

        <div className="mt-5 flex gap-2">
          <Button
            onClick={() => toggle(organization.id)}
            variant={subscribed ? "outline" : "default"}
            className="flex-1"
          >
            {subscribed ? (
              <>
                <Check className="mr-1.5 h-4 w-4" />
                Abonné·e
              </>
            ) : (
              <>
                <Bell className="mr-1.5 h-4 w-4" />
                S'abonner
              </>
            )}
          </Button>
          <Button variant="outline" size="icon" aria-label="Partager" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrganizerCard;
