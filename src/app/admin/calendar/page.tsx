"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import EventForm from "@/components/EventForm";
import { EventCalendar } from "@/components/calendar/EventCalendar";
import { AdminLayout } from "@/components/AdminLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useTheme } from "@/components/ThemeProvider";
import { useUserRoleContext } from "@/components/UserRoleProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { triggerRevalidate } from "@/lib/revalidate";
import { toISODate } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type ThemeRow = Database["public"]["Tables"]["themes"]["Row"];

const AdminCalendar = () => {
  const { isSuperAdmin, isLoading: userLoading, user } = useUserRoleContext();
  const { theme } = useTheme();
  const { toast } = useToast();

  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<EventRow[]>([]);
  const [themes, setThemes] = useState<ThemeRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<EventRow | undefined>(
    undefined,
  );

  // Charger les thèmes une fois (réutilisés par EventForm).
  useEffect(() => {
    const fetchThemes = async () => {
      const { data, error } = await supabase
        .from("themes")
        .select("*")
        .order("name");
      if (!error && data) setThemes(data);
    };
    fetchThemes();
  }, []);

  // Récupère les événements acceptés du mois visible (toutes organisations).
  const fetchEvents = useCallback(async () => {
    const from = toISODate(startOfWeek(startOfMonth(month), { weekStartsOn: 1 }));
    const to = toISODate(
      addDays(endOfWeek(endOfMonth(month), { weekStartsOn: 1 }), 1),
    );
    const { data, error } = await supabase
      .from("events")
      .select("*, theme:theme_id(*), recurrence:recurrence_id(*)")
      .eq("status", "accepted")
      .gte("start_at", from)
      .lt("start_at", to)
      .order("start_at", { ascending: true, nullsFirst: false });
    if (!error && data) setEvents(data as EventRow[]);
  }, [month]);

  useEffect(() => {
    if (userLoading || !isSuperAdmin || !user) return;
    void fetchEvents();
  }, [fetchEvents, isSuperAdmin, userLoading, user]);

  // Gating : réservé aux super admins.
  if (!userLoading && !isSuperAdmin) {
    return (
      <AdminLayout
        title="Accès refusé"
        subtitle="Cette page est réservée aux super administrateurs"
      >
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Accès refusé</h2>
            <p className="text-muted-foreground">
              Vous n'avez pas les permissions nécessaires pour accéder à cette
              page.
            </p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  const handleSelectEvent = (event: EventRow) => {
    setCurrentEvent(event);
    setShowForm(true);
  };

  return (
    <AdminLayout title="Calendrier" subtitle="Vue calendrier des événements">
      <EventCalendar
        month={month}
        events={events}
        onPrevMonth={() => setMonth((m) => subMonths(m, 1))}
        onNextMonth={() => setMonth((m) => addMonths(m, 1))}
        onToday={() => setMonth(startOfMonth(new Date()))}
        onSelectEvent={handleSelectEvent}
      />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent
          className={`w-3/4 max-w-4xl mx-auto ${
            theme === "light"
              ? "bg-[#f8f8f6] text-ephemeride border-none"
              : "bg-ephemeride-light text-ephemeride-foreground border-none"
          }`}
        >
          <DialogHeader>
            <DialogTitle>Modifier l'événement</DialogTitle>
          </DialogHeader>
          <EventForm
            event={currentEvent}
            themes={themes}
            onSave={async (eventData) => {
              try {
                const mapped = {
                  ...eventData,
                  updated_at: new Date().toISOString(),
                } as EventRow & { theme?: ThemeRow };
                delete (mapped as { theme?: ThemeRow }).theme;
                delete (mapped as Record<string, unknown>).recurrence;
                delete (mapped as Record<string, unknown>).organization;
                // Les colonnes UUID rejettent "" : convertir en null.
                const clean = Object.fromEntries(
                  Object.entries({ ...mapped, status: "accepted" }).map(
                    ([key, value]) => [key, value === "" ? null : value],
                  ),
                ) as Database["public"]["Tables"]["events"]["Update"];
                const { error } = await supabase
                  .from("events")
                  .update(clean)
                  .eq("id", currentEvent?.id);
                if (error) throw error;
                setShowForm(false);
                await fetchEvents();
                void triggerRevalidate();
                toast({
                  title: "Événement mis à jour",
                  description: "L'événement a été mis à jour avec succès.",
                });
                return true;
              } catch {
                toast({
                  title: "Erreur de sauvegarde",
                  description:
                    "Une erreur est survenue lors de la sauvegarde de l'événement.",
                  variant: "destructive",
                });
                return false;
              }
            }}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default function Page() {
  return (
    <ProtectedRoute>
      <AdminCalendar />
    </ProtectedRoute>
  );
}
