"use client";

import { Bookmark, MapPin, Megaphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { NotificationToggle } from "@/components/account/NotificationToggle";
import { CitySubscriptionsManager } from "@/components/account/CitySubscriptionsManager";
import { OrganizerSubscriptionsList } from "@/components/account/OrganizerSubscriptionsList";
import { useNotificationPrefs } from "@/hooks/use-notification-prefs";

/**
 * Préférences de notifications (page « Notifications » du compte). Trois canaux
 * activables, le flux par ville et les organisateur·ices suivis intégrant leur
 * gestion d'abonnements. Réutilise les managers communs au wizard.
 */
export const NotificationPreferences = () => {
  const { prefs, setPref } = useNotificationPrefs();

  return (
    <div className="space-y-4">
      <NotificationToggle />

      <Section
        icon={<Bookmark className="h-5 w-5 text-accent-peach" />}
        title="Mes événements favoris"
        description="Changement d'horaire, de lieu, annulation ou rappel la veille."
        checked={prefs.notify_bookmarks}
        onCheckedChange={(v) => setPref("notify_bookmarks", v)}
      />

      <Section
        icon={<MapPin className="h-5 w-5 text-accent-violet" />}
        title="Flux par ville"
        description="Nouveaux événements publiés dans les communes que vous suivez."
        checked={prefs.notify_cities}
        onCheckedChange={(v) => setPref("notify_cities", v)}
      >
        <CitySubscriptionsManager />
      </Section>

      <Section
        icon={<Megaphone className="h-5 w-5 text-emerald-500" />}
        title="Organisateur·ices suivis"
        description="Annonces en direct des organisateur·ices auxquels vous êtes abonné·e."
        checked={prefs.notify_organizations}
        onCheckedChange={(v) => setPref("notify_organizations", v)}
      >
        <OrganizerSubscriptionsList onlySubscribed />
      </Section>
    </div>
  );
};

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  children?: React.ReactNode;
}

const Section = ({ icon, title, description, checked, onCheckedChange, children }: SectionProps) => (
  <div className="rounded-xl border border-border bg-card/50 p-4">
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="space-y-0.5">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={title} />
    </div>
    {children && checked && <div className="mt-4 pl-8">{children}</div>}
  </div>
);

export default NotificationPreferences;
