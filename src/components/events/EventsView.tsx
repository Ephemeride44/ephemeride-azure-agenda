"use client";

import { useQueryState } from "nuqs";
import { CalendarDays, List } from "lucide-react";
import EventList from "@/components/EventList";
import CalendarView from "@/components/calendar/CalendarView";
import { viewParser } from "@/lib/viewParam";
import type { FilterValues } from "@/lib/eventFilters";

const NO_FILTERS: FilterValues = {};

type AnyEvent = Record<string, any>;

interface EventsViewProps {
  /** Événements à venir (déjà chargés côté serveur) pour la vue liste. */
  events: AnyEvent[];
  /** Restreint la vue calendrier à une organisation (chargement par mois). */
  organizationId?: string;
}

/**
 * Bascule Liste / Calendrier autonome, réutilisée hors de la home (page
 * organisateur·ice). La vue liste s'appuie sur les événements fournis ; la vue
 * calendrier charge le mois visible (scopée à l'organisation si fournie).
 */
export const EventsView = ({ events, organizationId }: EventsViewProps) => {
  // Mode de vue synchronisé avec l'URL (?v=cal), partagé avec l'agenda.
  const [view, setView] = useQueryState("v", viewParser);

  return (
    <div className="space-y-6">
      <div className="flex justify-start">
        <div className="inline-flex rounded-full bg-foreground/5 p-1">
          {(["list", "calendar"] as const).map((v) => {
            const Icon = v === "list" ? List : CalendarDays;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-colors ${view === v
                  ? "bg-accent-violet text-accent-violet-foreground font-bold shadow-sm"
                  : "font-medium text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Icon className="h-4 w-4" />
                {v === "list" ? "Liste" : "Calendrier"}
              </button>
            );
          })}
        </div>
      </div>

      {view === "list" ? (
        <EventList events={events as never} />
      ) : (
        <CalendarView filterValues={NO_FILTERS} organizationId={organizationId} />
      )}
    </div>
  );
};

export default EventsView;
