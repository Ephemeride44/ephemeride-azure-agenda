"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowLeft, Bookmark } from "lucide-react";
import { supabase as baseSupabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/account/AuthDialogProvider";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import EventCard from "@/components/EventCard";
import { NotificationToggle } from "@/components/account/NotificationToggle";
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

export default function MesFavorisPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { openAuthDialog } = useAuthDialog();
  const { theme } = useTheme();
  const userId = user?.id as string | undefined;

  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
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

  // Favoris à venir d'abord (par date croissante), puis passés (récents d'abord).
  const upcoming = events
    .filter((e) => !isPastEvent(e))
    .sort((a, b) => String(a.start_at ?? "").localeCompare(String(b.start_at ?? "")));
  const past = events
    .filter((e) => isPastEvent(e))
    .sort((a, b) => String(b.start_at ?? "").localeCompare(String(a.start_at ?? "")));

  return (
    <div className="min-h-screen flex flex-col dark:bg-ephemeride light:bg-[#faf3ec]">
      <header className="py-4 px-4 md:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Retour à l'agenda
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 md:px-8 py-6 md:py-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3">
            <Bookmark className="h-7 w-7 text-accent-peach" fill="currentColor" />
            <h1 className="text-3xl font-bold">Mes favoris</h1>
          </div>

          {isLoading ? (
            <p className="opacity-70">Chargement…</p>
          ) : !isAuthenticated ? (
            <div className="rounded-xl border border-white/10 p-8 text-center space-y-4">
              <p className="opacity-80">
                Connectez-vous pour retrouver vos événements favoris et être prévenu
                de leurs changements.
              </p>
              <Button onClick={openAuthDialog}>Se connecter</Button>
            </div>
          ) : (
            <>
              <NotificationToggle />
              {isLoadingEvents ? (
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
            </>
          )}
        </div>
      </main>
    </div>
  );
}
