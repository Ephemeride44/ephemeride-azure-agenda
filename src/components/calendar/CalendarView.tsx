"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addMonths, startOfMonth, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { applyFiltersToEvents, type FilterValues } from "@/lib/eventFilters";
import { EVENT_SELECT } from "@/lib/eventSelect";
import { getEventStart, monthNames, toISODate } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDragToClose } from "@/hooks/use-drag-to-close";
import ConstellationMonth from "@/components/calendar/ConstellationMonth";
import DayDetailPanel from "@/components/calendar/DayDetailPanel";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

interface CalendarViewProps {
  /** Filtres actifs de la home (ex : Département), appliqués à la vue. */
  filterValues: FilterValues;
  /** Restreint la vue aux événements d'une organisation (page organisateur). */
  organizationId?: string;
}

/** Reconstruit une `Date` locale depuis une clé `YYYY-MM-DD`. */
function dateFromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Vue calendrier publique « Constellation ». Charge les événements acceptés du
 * mois visible, les regroupe par jour, et affiche soit deux volets côte à côte
 * (desktop), soit la constellation + un bottom sheet au tap d'un jour (mobile).
 */
const CalendarView = ({ filterValues, organizationId }: CalendarViewProps) => {
  const isMobile = useIsMobile();
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Glissé vertical du tiroir (suivi du doigt) pour le refermer.
  const { dragY: sheetDragY, handlers: dayDragHandlers } = useDragToClose(() =>
    setDrawerOpen(false),
  );

  const fetchMonth = useCallback(async () => {
    setLoading(true);
    const from = toISODate(startOfMonth(month));
    const to = toISODate(addMonths(startOfMonth(month), 1));
    let query = supabase
      .from("events")
      .select(EVENT_SELECT)
      .eq("status", "accepted")
      .gte("start_at", from)
      .lt("start_at", to);
    if (organizationId) query = query.eq("organization_id", organizationId);
    const { data, error } = await query.order("start_at", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("Erreur lors du chargement du calendrier :", error);
      setEvents([]);
    } else {
      setEvents((data || []) as unknown as EventRow[]);
    }
    setLoading(false);
  }, [month, organizationId]);

  useEffect(() => {
    fetchMonth();
  }, [fetchMonth]);

  // Regroupe les événements (filtrés) par jour, triés par heure de début.
  const eventsByDay = useMemo(() => {
    const filtered = applyFiltersToEvents(events as Record<string, unknown>[], filterValues) as EventRow[];
    const map = new Map<string, EventRow[]>();
    for (const event of filtered) {
      const start = getEventStart(event);
      if (!start) continue;
      const key = toISODate(start);
      const list = map.get(key);
      if (list) list.push(event);
      else map.set(key, [event]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (getEventStart(a)?.getTime() ?? 0) - (getEventStart(b)?.getTime() ?? 0));
    }
    return map;
  }, [events, filterValues]);

  const totalCount = useMemo(
    () => Array.from(eventsByDay.values()).reduce((sum, list) => sum + list.length, 0),
    [eventsByDay],
  );

  // Jour sélectionné par défaut (desktop) : aujourd'hui s'il a des événements,
  // sinon le premier jour du mois qui en a.
  useEffect(() => {
    if (isMobile) return;
    const todayKey = toISODate(new Date());
    const validKey =
      selectedKey && eventsByDay.has(selectedKey) ? selectedKey : null;
    if (validKey) return;
    let next: string | null = null;
    if (eventsByDay.has(todayKey)) {
      next = todayKey;
    } else {
      const keys = Array.from(eventsByDay.keys()).sort();
      next = keys[0] ?? null;
    }
    setSelectedKey(next);
  }, [eventsByDay, isMobile, selectedKey]);

  const handleSelectDay = (key: string) => {
    setSelectedKey(key);
    if (isMobile) setDrawerOpen(true);
  };

  const goToMonth = (next: Date) => {
    setSelectedKey(null);
    setMonth(startOfMonth(next));
  };

  const selectedDate = selectedKey ? dateFromKey(selectedKey) : null;
  const selectedEvents = selectedKey ? eventsByDay.get(selectedKey) ?? [] : [];

  const monthTitle = `${monthNames[month.getMonth()]} ${month.getFullYear()}`;

  const navButtons = (
    <div className="flex gap-2">
      <button
        type="button"
        aria-label="Mois précédent"
        onClick={() => goToMonth(subMonths(month, 1))}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/10 transition-colors hover:bg-foreground/5"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Mois suivant"
        onClick={() => goToMonth(addMonths(month, 1))}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/10 transition-colors hover:bg-foreground/5"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );

  // ---------- Rendu mobile ----------
  if (isMobile) {
    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold leading-none">
              {monthNames[month.getMonth()]}
            </span>
            <span className="text-sm text-muted-foreground">{month.getFullYear()}</span>
          </div>
          {navButtons}
        </div>

        <ConstellationMonth
          month={month}
          eventsByDay={eventsByDay}
          selectedKey={selectedKey}
          onSelectDay={handleSelectDay}
          size="mobile"
        />

        {/* Tiroir des événements du jour (custom, cohérent avec le tiroir filtres) :
            émerge de sous le menu, s'arrête au-dessus de la barre, sans overlay
            bloquant ; en `pointer-events-none` quand fermé. Glissé vers le bas
            pour fermer. */}
        <div
          className={`fixed inset-x-3 z-50 ${drawerOpen ? "" : "pointer-events-none"}`}
          style={{ bottom: "var(--mobile-menu-h, 52px)" }}
          aria-hidden={!drawerOpen}
        >
          <div
            className="flex max-h-[70vh] flex-col rounded-t-3xl border border-foreground/10 bg-background px-4 pb-6 pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.18)]"
            style={{
              transform: drawerOpen ? `translateY(${sheetDragY}px)` : "translateY(120%)",
              transition: sheetDragY ? "none" : "transform 300ms ease-in",
            }}
          >
            {/* Poignée + fermeture : zone de glissé pour refermer le tiroir. */}
            <div
              className="relative shrink-0 cursor-grab pb-1 active:cursor-grabbing"
              {...dayDragHandlers}
            >
              <div className="mx-auto h-1.5 w-12 rounded-full bg-muted" />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Fermer"
                className="absolute right-0 top-0 rounded-full p-1 text-muted-foreground hover:bg-foreground/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {selectedDate && (
              <div className="overflow-y-auto pt-2">
                <DayDetailPanel
                  date={selectedDate}
                  events={selectedEvents}
                  size="mobile"
                  onChanged={fetchMonth}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------- Rendu desktop ----------
  return (
    <div>
      {/* Barre de contrôles */}
      <div className="mb-5 flex items-center gap-4">
        <span className="font-display text-2xl font-extrabold">{monthTitle}</span>
        {navButtons}
        <span className="text-sm text-muted-foreground">
          {loading ? "Chargement…" : `${totalCount} événement${totalCount > 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Grille à deux colonnes égales (50-50), indépendante du contenu :
          `min-w-0` empêche le texte des cartes d'élargir le volet de droite. */}
      <div className="grid grid-cols-2 gap-7">
        {/* Volet calendrier */}
        <div className="min-w-0 rounded-3xl bg-white p-6 shadow-sm dark:bg-ephemeride-light">
          <ConstellationMonth
            month={month}
            eventsByDay={eventsByDay}
            selectedKey={selectedKey}
            onSelectDay={handleSelectDay}
            size="desktop"
          />
        </div>

        {/* Volet détail du jour */}
        <div className="min-w-0">
          {selectedDate ? (
            <DayDetailPanel
              date={selectedDate}
              events={selectedEvents}
              size="desktop"
              onChanged={fetchMonth}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-foreground/10 p-8 text-center text-sm text-muted-foreground">
              {loading ? "Chargement…" : "Aucun événement ce mois-ci."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
