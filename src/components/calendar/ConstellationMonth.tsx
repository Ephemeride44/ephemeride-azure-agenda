"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getDaysInMonth, isSameDay, startOfMonth } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import { useTheme } from "@/components/ThemeProvider";
import { toISODate } from "@/lib/utils";
import { ACCENT, hexA, weekdayColor } from "@/lib/colors";
import {
  WEEKDAY_LETTER,
  WEEKDAY_SHORT,
  WEEK_ORDER,
  mondayOffset,
} from "@/components/calendar/weekdayColors";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

type Size = "mobile" | "desktop";

interface ConstellationMonthProps {
  month: Date;
  eventsByDay: Map<string, EventRow[]>;
  selectedKey: string | null;
  onSelectDay: (key: string, day: Date, events: EventRow[]) => void;
  size?: Size;
}

// Taille des bulles exprimée en FRACTION de la largeur de colonne (mesurée),
// selon le nombre d'événements (1 → 5+). Plafonnée à 0,9 pour toujours laisser
// un peu d'air entre les bulles → jamais de chevauchement, quelle que soit la
// largeur du volet (mobile, tablette, desktop).
const SIZE_FRACTION: Record<number, number> = { 1: 0.46, 2: 0.6, 3: 0.72, 4: 0.82, 5: 0.9 };

interface Cell {
  key: string | null;
  date: Date | null;
  day: number;
  count: number;
  color: string;
  isToday: boolean;
}

/**
 * Grille mensuelle « Constellation » : chaque jour est une bulle colorée selon
 * le jour de la semaine et dimensionnée selon le nombre d'événements ce jour-là.
 * Composant purement présentationnel — les données et la sélection viennent du
 * parent (`CalendarView`).
 */
const ConstellationMonth = ({
  month,
  eventsByDay,
  selectedKey,
  onSelectDay,
  size = "desktop",
}: ConstellationMonthProps) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const big = size === "desktop";

  // Largeur de colonne mesurée (grille / 7), pour dimensionner les bulles
  // proportionnellement au volet réel.
  const gridRef = useRef<HTMLDivElement>(null);
  const [cellWidth, setCellWidth] = useState(0);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const update = () => setCellWidth(el.clientWidth / 7);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Largeur de colonne effective (fallback avant la première mesure) et hauteur
  // de case dérivée (cases quasi carrées, bornées).
  const cw = cellWidth || (big ? 78 : 46);
  const cellHeight = Math.round(Math.min(Math.max(cw, big ? 56 : 46), big ? 100 : 64));

  const cells = useMemo<Cell[]>(() => {
    const first = startOfMonth(month);
    const y = first.getFullYear();
    const m = first.getMonth();
    const daysInMonth = getDaysInMonth(first);
    const offset = mondayOffset(first.getDay());
    const total = Math.ceil((offset + daysInMonth) / 7) * 7;
    const today = new Date();

    const out: Cell[] = [];
    for (let i = 0; i < total; i++) {
      const day = i - offset + 1;
      const inMonth = day >= 1 && day <= daysInMonth;
      if (!inMonth) {
        out.push({ key: null, date: null, day: 0, count: 0, color: "", isToday: false });
        continue;
      }
      const date = new Date(y, m, day);
      const key = toISODate(date);
      const count = eventsByDay.get(key)?.length ?? 0;
      out.push({
        key,
        date,
        day,
        count,
        color: weekdayColor(date),
        isToday: isSameDay(date, today),
      });
    }
    return out;
  }, [month, eventsByDay]);

  const headers = WEEK_ORDER.map((gd) => (big ? WEEKDAY_SHORT[gd] : WEEKDAY_LETTER[gd]));

  return (
    <div>
      {/* En-têtes de jours */}
      <div className="grid grid-cols-7 px-2 pb-1">
        {headers.map((label, i) => (
          <div
            key={i}
            className="text-center font-bold uppercase tracking-wide text-[11px] opacity-40"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Grille des bulles */}
      <div ref={gridRef} className="grid grid-cols-7">
        {cells.map((cell, i) => {
          if (!cell.key || !cell.date) {
            return (
              <div
                key={i}
                className="flex items-center justify-center"
                style={{ height: cellHeight }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "transparent",
                  }}
                />
              </div>
            );
          }

          const { count, color, isToday, key, date } = cell;
          const interactive = count > 0;
          const selected = selectedKey === key;
          const maxBubble = cellHeight * 0.86;
          const bubbleSize =
            count === 0
              ? Math.min(Math.max(cw * 0.18, 6), big ? 12 : 8)
              : Math.min(cw * (SIZE_FRACTION[Math.min(count, 5)] ?? SIZE_FRACTION[5]), maxBubble);

          const ringWidth = big ? 2.5 : 2;
          const numberSize = Math.max(10, Math.round(bubbleSize * 0.4));

          return (
            <div
              key={i}
              className="relative flex items-center justify-center"
              style={{ height: cellHeight }}
            >
              {/* Anneau pointillé du jour sélectionné (desktop surtout) */}
              {selected && (
                <span
                  aria-hidden
                  className="absolute rounded-full"
                  style={{
                    width: bubbleSize + 10,
                    height: bubbleSize + 10,
                    border: `2px dashed ${ACCENT}`,
                    opacity: 0.9,
                  }}
                />
              )}
              <button
                type="button"
                disabled={!interactive}
                onClick={() => interactive && onSelectDay(key, date, eventsByDay.get(key) ?? [])}
                aria-label={
                  interactive
                    ? `${count} événement${count > 1 ? "s" : ""} le ${date.getDate()}`
                    : undefined
                }
                aria-pressed={selected}
                className={`relative z-[1] flex items-center justify-center transition-transform ${
                  interactive ? "cursor-pointer hover:scale-105" : "cursor-default"
                }`}
                style={{
                  width: bubbleSize,
                  height: bubbleSize,
                  flexShrink: 0,
                  boxSizing: "border-box",
                  borderRadius: "50%",
                  background: count === 0 ? hexA(color, isDark ? 0.3 : 0.32) : color,
                  boxShadow: count >= 2 ? `0 4px 14px ${hexA(color, 0.5)}` : "none",
                  border: isToday ? `${ringWidth}px solid ${ACCENT}` : "none",
                  padding: 0,
                }}
              >
                {count > 0 && (
                  <span
                    className="font-display font-extrabold"
                    style={{ fontSize: numberSize, color: "#1B263B", lineHeight: 1 }}
                  >
                    {date.getDate()}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConstellationMonth;
