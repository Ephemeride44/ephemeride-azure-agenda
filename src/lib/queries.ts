import 'server-only';
import { createServerSupabase } from '@/lib/supabase/server';
import {
  eventFilterDefinitions,
  sortFilterOptions,
} from '@/lib/eventFilters';
import type { Database } from '@/integrations/supabase/types';

type EventRow = Database['public']['Tables']['events']['Row'];
export type EventWithRelations = EventRow & {
  theme?: unknown;
  recurrence?: unknown;
};

const EVENT_SELECT = '*, theme:theme_id(*), recurrence:recurrence_id(*)';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Événements publics à venir (status accepté, date >= aujourd'hui), triés. */
export async function getUpcomingEvents(): Promise<EventWithRelations[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('status', 'accepted')
    .gte('start_at', today())
    .order('start_at', { nullsFirst: false });

  if (error) {
    console.error('[queries] getUpcomingEvents:', error.message);
    return [];
  }
  return (data ?? []) as EventWithRelations[];
}

/** Date de dernière mise à jour parmi les événements acceptés. */
export async function getLastUpdatedAt(): Promise<string | null> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('events')
    .select('updated_at')
    .eq('status', 'accepted')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(1);

  if (error) {
    console.error('[queries] getLastUpdatedAt:', error.message);
    return null;
  }
  return data?.[0]?.updated_at ?? null;
}

/** Options disponibles pour chaque filtre (valeurs distinctes), côté public. */
export async function getFilterOptions(): Promise<Record<string, string[]>> {
  const supabase = createServerSupabase();
  const entries = await Promise.all(
    eventFilterDefinitions.map(async (definition) => {
      const { data, error } = await supabase
        .from('events')
        .select(definition.column)
        .eq('status', 'accepted');

      if (error) {
        console.error(`[queries] getFilterOptions(${definition.key}):`, error.message);
        return [definition.key, [] as string[]] as const;
      }

      const rows = (data ?? []) as Array<Record<string, string | null>>;
      const values = Array.from(
        new Set(
          rows
            .map((row) => row[definition.column])
            .filter((v): v is string => v != null && String(v).trim() !== '')
            .map((v) => String(v).trim()),
        ),
      );
      return [definition.key, sortFilterOptions(definition, values)] as const;
    }),
  );
  return Object.fromEntries(entries);
}

/** Un événement accepté par son id (pour la page détail). */
export async function getEventById(id: string): Promise<EventWithRelations | null> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('id', id)
    .eq('status', 'accepted')
    .maybeSingle();

  if (error) {
    console.error('[queries] getEventById:', error.message);
    return null;
  }
  return (data as EventWithRelations) ?? null;
}

/** Tous les événements acceptés (id, name) pour generateStaticParams / sitemap. */
export async function getAllAcceptedEvents(): Promise<
  Array<Pick<EventRow, 'id' | 'name' | 'updated_at' | 'location_department'>>
> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('events')
    .select('id, name, updated_at, location_department')
    .eq('status', 'accepted');

  if (error) {
    console.error('[queries] getAllAcceptedEvents:', error.message);
    return [];
  }
  return (data ?? []) as Array<
    Pick<EventRow, 'id' | 'name' | 'updated_at' | 'location_department'>
  >;
}

/** Événements acceptés à venir d'un département donné (page /departement/[code]). */
export async function getUpcomingEventsByDepartment(
  code: string,
): Promise<EventWithRelations[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('status', 'accepted')
    .eq('location_department', code)
    .gte('start_at', today())
    .order('start_at', { nullsFirst: false });

  if (error) {
    console.error('[queries] getUpcomingEventsByDepartment:', error.message);
    return [];
  }
  return (data ?? []) as EventWithRelations[];
}
