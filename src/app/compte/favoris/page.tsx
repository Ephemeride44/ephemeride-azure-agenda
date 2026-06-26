"use client";

import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as baseSupabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import EventCard from "@/components/EventCard";
import { getEventStart } from "@/lib/utils";

const supabase = baseSupabase as unknown as SupabaseClient;

const isPastEvent = (event: { start_at?: string | null }) => {
  const start = getEventStart(event as Record<string, unknown>);
  if (!start) return false;
  const todayStr = new Date().toISOString().slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, "0");
  const startStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
  return startStr < todayStr;
};

export default function CompteFavorisPage() {
  const { user } = useAuth();
  const userId = user?.id as string | undefined;

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["my-bookmarked-events", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("created_at, event:event_id(*, theme:theme_id(*), recurrence:recurrence_id(*))")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .map((row: { event: unknown }) => row.event)
        .filter(Boolean) as Array<Record<string, any>>;
    },
  });

  const upcoming = events
    .filter((e) => !isPastEvent(e))
    .sort((a, b) => String(a.start_at ?? "").localeCompare(String(b.start_at ?? "")));
  const past = events
    .filter((e) => isPastEvent(e))
    .sort((a, b) => String(b.start_at ?? "").localeCompare(String(a.start_at ?? "")));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mes favoris</h1>
        <p className="text-sm text-muted-foreground">Vos événements enregistrés.</p>
      </div>

      {isLoading ? (
        <p className="opacity-70">Chargement de vos favoris…</p>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-white/10 p-8 text-center space-y-2">
          <p className="opacity-80">Vous n'avez pas encore de favori.</p>
          <p className="text-sm opacity-60">
            Touchez l'icône favori sur un événement pour l'ajouter ici.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section className="space-y-4">
              {upcoming.map((event) => (
                <EventCard key={event.id} event={event as any} />
              ))}
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold opacity-70">Événements passés</h2>
              {past.map((event) => (
                <EventCard key={event.id} event={event as any} isPast />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
