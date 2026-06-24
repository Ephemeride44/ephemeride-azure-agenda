"use client";

import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import {
  cn,
  daysOfWeek,
  formatFrTime,
  getDateBlockColor,
  getEventStart,
  monthNames,
  toISODate,
} from "@/lib/utils";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

interface EventCalendarProps {
  month: Date;
  events: EventRow[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onSelectEvent: (event: EventRow) => void;
}

const WEEKDAY_LABELS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
const MAX_EVENTS_PER_DAY = 3;

/**
 * Vue calendrier mensuelle présentationnelle (aucun fetch). Affiche les
 * événements fournis sur une grille lundi→dimanche ; un clic sur un événement
 * déclenche `onSelectEvent`.
 */
export function EventCalendar({
  month,
  events,
  onPrevMonth,
  onNextMonth,
  onToday,
  onSelectEvent,
}: EventCalendarProps) {
  // Grille complète : semaines entières débordant sur les mois adjacents.
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

  // Indexer les événements par jour (clé YYYY-MM-DD), triés par heure de début.
  const eventsByDay = new Map<string, EventRow[]>();
  for (const event of events) {
    const start = getEventStart(event);
    if (!start) continue;
    const key = toISODate(start);
    const list = eventsByDay.get(key);
    if (list) list.push(event);
    else eventsByDay.set(key, [event]);
  }
  for (const list of eventsByDay.values()) {
    list.sort((a, b) => {
      const sa = getEventStart(a)?.getTime() ?? 0;
      const sb = getEventStart(b)?.getTime() ?? 0;
      return sa - sb;
    });
  }

  const today = new Date();

  return (
    <div className="rounded-md border bg-card">
      {/* En-tête : navigation + libellé du mois */}
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <h2 className="text-lg font-semibold capitalize">
          {monthNames[month.getMonth()]} {month.getFullYear()}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onToday}>
            Aujourd'hui
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onPrevMonth}
            aria-label="Mois précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onNextMonth}
            aria-label="Mois suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* En-têtes de colonnes */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="p-2 text-center text-xs font-medium uppercase text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Grille des jours */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const inMonth = isSameMonth(day, month);
          const isToday = isSameDay(day, today);
          const dayEvents = eventsByDay.get(toISODate(day)) ?? [];
          const visible = dayEvents.slice(0, MAX_EVENTS_PER_DAY);
          const overflow = dayEvents.length - visible.length;
          const blockColor = getDateBlockColor(daysOfWeek[day.getDay()]);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "flex min-h-[7rem] flex-col gap-1 border-b border-r p-1.5",
                !inMonth && "bg-muted/30",
              )}
            >
              <div className="flex justify-end">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    !inMonth && "text-muted-foreground/60",
                    isToday && "bg-primary font-semibold text-primary-foreground",
                  )}
                >
                  {day.getDate()}
                </span>
              </div>

              <div className="flex flex-col gap-1 overflow-y-auto">
                {visible.map((event) => {
                  const start = getEventStart(event);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onSelectEvent(event)}
                      title={event.name}
                      className={cn(
                        "flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-xs text-white transition-opacity hover:opacity-80",
                        blockColor,
                        event.is_cancelled && "opacity-60 line-through",
                      )}
                    >
                      {event.emoji && (
                        <span className="shrink-0">{event.emoji}</span>
                      )}
                      {start && (
                        <span className="shrink-0 font-medium tabular-nums">
                          {formatFrTime(start)}
                        </span>
                      )}
                      <span className="truncate">{event.name}</span>
                      {event.is_full && (
                        <span className="ml-auto shrink-0 rounded bg-black/25 px-1 text-[10px] uppercase">
                          Complet
                        </span>
                      )}
                      {event.is_cancelled && (
                        <span className="ml-auto shrink-0 rounded bg-black/25 px-1 text-[10px] uppercase">
                          Annulé
                        </span>
                      )}
                    </button>
                  );
                })}
                {overflow > 0 && (
                  <span className="px-1 text-[11px] text-muted-foreground">
                    +{overflow} autre{overflow > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default EventCalendar;
