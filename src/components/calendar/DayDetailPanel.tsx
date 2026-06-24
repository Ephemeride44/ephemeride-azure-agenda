"use client";

import type { Database } from "@/integrations/supabase/types";
import DayEventCard from "@/components/calendar/DayEventCard";
import { weekdayColor } from "@/components/calendar/weekdayColors";
import { daysOfWeek, formatFrDayMonth } from "@/lib/utils";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

interface DayDetailPanelProps {
  date: Date;
  events: EventRow[];
  size?: "mobile" | "desktop";
  onChanged?: () => void;
}

/**
 * Panneau « jour » : en-tête (puce date colorée + libellé + compteur) suivi de
 * la liste des événements du jour. Utilisé dans le volet droit du desktop et
 * dans le bottom sheet mobile.
 */
const DayDetailPanel = ({ date, events, size = "desktop", onChanged }: DayDetailPanelProps) => {
  const color = weekdayColor(date);
  const dayName = daysOfWeek[date.getDay()];
  const title = formatFrDayMonth(date);
  const count = events.length;
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="flex h-full flex-col">
      {/* En-tête jour */}
      <div className="flex items-center gap-3 px-1">
        <div
          className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-2xl text-[#1B263B]"
          style={{ background: color }}
        >
          <span className="font-display text-2xl font-extrabold leading-none">{date.getDate()}</span>
          <span className="text-[9px] font-bold uppercase tracking-wide opacity-80">
            {dayName.slice(0, 3)}.
          </span>
        </div>
        <div>
          <div className="font-display text-lg font-bold">{capitalize(title)}</div>
          <div className="text-sm text-muted-foreground">
            {count > 0
              ? `${count} événement${count > 1 ? "s" : ""} ce jour-là`
              : "Aucun événement ce jour-là"}
          </div>
        </div>
      </div>

      {/* Liste des événements */}
      <div className="mt-4 flex flex-col gap-2.5 overflow-y-auto pb-2">
        {events.map((event) => (
          <DayEventCard key={event.id} event={event} size={size} onChanged={onChanged} />
        ))}
      </div>
    </div>
  );
};

export default DayDetailPanel;
