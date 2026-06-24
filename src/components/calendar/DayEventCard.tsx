"use client";

import { useEffect, useState } from "react";
import { Clock, Euro, Image as ImageIcon, MapPin, Pencil, Ticket } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import EventForm from "@/components/EventForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/components/ThemeProvider";
import { useUserRoleContext } from "@/components/UserRoleProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { triggerRevalidate } from "@/lib/revalidate";
import {
  eventSlug,
  formatCityName,
  formatPrice,
  formatTimeDisplay,
  getEventStart,
} from "@/lib/utils";
import { hexA, weekdayColor } from "@/lib/colors";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

interface DayEventCardProps {
  event: EventRow;
  size?: "mobile" | "desktop";
  /** Remonte une modification/suppression au parent pour rafraîchir le mois. */
  onChanged?: () => void;
}

/**
 * Carte d'événement riche du panneau jour de la vue calendrier : colonne média
 * (affiche ou panneau coloré avec l'heure) + corps (titre, badges, lieu, prix,
 * type, billetterie). Les superadmins disposent d'un bouton « Modifier » qui
 * ouvre `EventForm`, exactement comme `EventCard`.
 */
const DayEventCard = ({ event: eventProp, size = "desktop", onChanged }: DayEventCardProps) => {
  const big = size === "desktop";
  const { theme } = useTheme();
  const { toast } = useToast();
  const { isSuperAdmin } = useUserRoleContext();
  const [event, setEvent] = useState(eventProp);
  const [showEdit, setShowEdit] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  useEffect(() => {
    setEvent(eventProp);
  }, [eventProp]);

  const start = getEventStart(event);
  const color = weekdayColor(start ?? new Date());
  const timeLabel = formatTimeDisplay(event);
  const locationString = `${event.location_place || ""}${
    event.location_city ? ` — ${formatCityName(event.location_city)}` : ""
  }${event.location_department ? ` (${event.location_department})` : ""}`;

  const handleSaveEvent = async (data: Partial<EventRow>): Promise<boolean> => {
    const cleanData = { ...data } as Record<string, unknown>;
    delete cleanData.theme;
    delete cleanData.recurrence;
    delete cleanData.id;
    if (cleanData.organization_id === "") cleanData.organization_id = null;
    if (cleanData.theme_id === "") cleanData.theme_id = null;

    const updated = { ...cleanData, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("events").update(updated).eq("id", event.id);
    if (error) {
      toast({ title: "Erreur lors de la mise à jour", description: error.message, variant: "destructive" });
      return false;
    }

    setEvent((prev) => ({ ...prev, ...updated }) as EventRow);
    void triggerRevalidate({
      slug: eventSlug({ id: event.id, name: (updated as Partial<EventRow>).name ?? event.name }),
      department: (updated as Partial<EventRow>).location_department ?? event.location_department,
    });
    toast({ title: "Événement mis à jour", description: "L'événement a été mis à jour avec succès" });
    setShowEdit(false);
    onChanged?.();
    return true;
  };

  const handleDeleteEvent = async (): Promise<void> => {
    const { error } = await supabase.from("events").delete().eq("id", event.id);
    if (error) {
      toast({ title: "Erreur lors de la suppression", description: error.message, variant: "destructive" });
      return;
    }
    void triggerRevalidate({
      slug: eventSlug({ id: event.id, name: event.name }),
      department: event.location_department,
    });
    toast({ title: "Événement supprimé", description: "L'événement a été supprimé avec succès" });
    setShowEdit(false);
    setIsDeleted(true);
    onChanged?.();
  };

  if (isDeleted) return null;

  const mediaWidth = big ? 116 : 84;

  return (
    <div
      className="flex overflow-hidden rounded-2xl border-0 shadow-sm bg-white dark:bg-ephemeride-light text-[#1B263B] dark:text-[#faf3ec]"
      style={{ opacity: event.is_cancelled ? 0.62 : 1 }}
    >
      {/* Colonne média */}
      <div
        className="relative flex flex-shrink-0 items-center justify-center"
        style={{
          width: mediaWidth,
          background: color,
          backgroundImage: "linear-gradient(155deg, rgba(255,255,255,.18), rgba(27,38,59,.22))",
        }}
      >
        {event.cover_url ? (
          <>
            <img
              src={event.cover_url}
              alt="Affiche de l'événement"
              className="absolute inset-0 h-full w-full object-cover"
            />
            {timeLabel && (
              <span
                className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-bold text-[#1B263B] shadow"
                style={{ background: color, fontSize: big ? 12 : 11 }}
              >
                <Clock style={{ width: big ? 13 : 12, height: big ? 13 : 12 }} />
                {timeLabel}
              </span>
            )}
          </>
        ) : timeLabel ? (
          <span className="flex flex-col items-center gap-1 text-[#1B263B]">
            <Clock style={{ width: big ? 18 : 16, height: big ? 18 : 16 }} />
            <span
              className="font-display font-extrabold"
              style={{ fontSize: big ? 15 : 13 }}
            >
              {timeLabel}
            </span>
          </span>
        ) : (
          <ImageIcon style={{ width: big ? 30 : 24, height: big ? 30 : 24, color: hexA("#1B263B", 0.5) }} />
        )}
      </div>

      {/* Corps */}
      <div className="relative min-w-0 flex-1" style={{ padding: big ? "13px 16px" : "11px 13px" }}>
        {/* Bouton Modifier (superadmins) */}
        {isSuperAdmin && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setShowEdit(true)}
                  aria-label="Modifier l'événement"
                  className={`absolute right-2 top-2 z-10 rounded-full border p-1.5 transition-colors ${
                    theme === "dark"
                      ? "border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                  }`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                Modifier l'événement
              </TooltipContent>
            </Tooltip>
            <Dialog open={showEdit} onOpenChange={setShowEdit}>
              <DialogContent
                className={`mx-auto w-3/4 max-w-4xl max-h-[90vh] overflow-y-auto ${
                  theme === "light"
                    ? "bg-[#f8f8f6] text-ephemeride border-none"
                    : "bg-ephemeride-light text-ephemeride-foreground border-none"
                }`}
              >
                <DialogHeader>
                  <DialogTitle>Modifier l'événement</DialogTitle>
                </DialogHeader>
                <EventForm
                  event={event}
                  onSave={handleSaveEvent}
                  onCancel={() => setShowEdit(false)}
                  onDelete={handleDeleteEvent}
                />
              </DialogContent>
            </Dialog>
          </>
        )}

        {/* Titre + badges */}
        <div className={`flex flex-wrap items-center gap-2 ${isSuperAdmin ? "pr-8" : ""}`} style={{ marginBottom: big ? 7 : 5 }}>
          <span className="font-bold leading-tight" style={{ fontSize: big ? 16 : 14 }}>
            {event.name}
          </span>
          {event.is_full && (
            <span className="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Complet
            </span>
          )}
          {event.is_cancelled && (
            <span className="inline-flex items-center rounded-full bg-gray-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-gray-200 dark:text-gray-900">
              Annulé
            </span>
          )}
        </div>

        {/* Lieu */}
        <div className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="shrink-0" style={{ width: big ? 14 : 13, height: big ? 14 : 13 }} />
          <span className="truncate" style={{ fontSize: big ? 13 : 12 }}>
            {locationString}
          </span>
        </div>

        {/* Prix */}
        {event.price && (
          <div className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
            <Euro className="shrink-0" style={{ width: big ? 14 : 13, height: big ? 14 : 13 }} />
            <span className="truncate" style={{ fontSize: big ? 13 : 12 }}>
              {formatPrice(event.price)}
            </span>
          </div>
        )}

        {/* Pied : type + billetterie */}
        <div className="flex items-center justify-between gap-2" style={{ marginTop: big ? 10 : 8 }}>
          {event.audience ? (
            <span className="inline-block rounded-full bg-[#1B263B]/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:bg-white/10">
              {event.audience}
            </span>
          ) : (
            <span />
          )}
          {event.ticketing_url &&
            (big ? (
              <a
                href={event.ticketing_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors border-gray-300 text-[#1B263B] hover:bg-gray-50 dark:border-white/20 dark:text-[#faf3ec] dark:hover:bg-white/10"
              >
                <Ticket className="h-4 w-4" />
                Billetterie
              </a>
            ) : (
              <a
                href={event.ticketing_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Accéder à la billetterie"
                className="text-muted-foreground transition-transform hover:scale-110"
              >
                <Ticket className="h-5 w-5" />
              </a>
            ))}
        </div>
      </div>
    </div>
  );
};

export default DayEventCard;
