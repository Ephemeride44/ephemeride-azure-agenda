import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase/server';
import {
  eventFilterDefinitions,
  sortFilterOptions,
} from '@/lib/eventFilters';
import type { Database } from '@/integrations/supabase/types';
import { EVENT_SELECT, type EventOrganization } from '@/lib/eventSelect';

// Client serveur non typé : utilisé pour les requêtes touchant des colonnes ou
// RPC pas encore régénérées dans types.ts (jointure organisation, abonnements).
function untypedServer(): SupabaseClient {
  return createServerSupabase() as unknown as SupabaseClient;
}

type EventRow = Database['public']['Tables']['events']['Row'];
export type EventWithRelations = EventRow & {
  theme?: unknown;
  recurrence?: unknown;
  organization?: EventOrganization | null;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Événements publics à venir (status accepté, date >= aujourd'hui), triés. */
export async function getUpcomingEvents(): Promise<EventWithRelations[]> {
  const supabase = untypedServer();
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
  return (data ?? []) as unknown as EventWithRelations[];
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
  const supabase = untypedServer();
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
  return (data as unknown as EventWithRelations) ?? null;
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

export interface OrganizationPublic {
  id: string;
  name: string;
  description: string | null;
  website_url: string | null;
  location_city: string | null;
  location_department: string | null;
  logo_url: string | null;
}

/** Une organisation active par son id (page /organisateur/[id]). */
export async function getOrganizationById(id: string): Promise<OrganizationPublic | null> {
  const supabase = untypedServer();
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, description, website_url, location_city, location_department, logo_url')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('[queries] getOrganizationById:', error.message);
    return null;
  }
  return (data as unknown as OrganizationPublic) ?? null;
}

/** Événements acceptés à venir d'une organisation (page /organisateur/[id]). */
export async function getUpcomingEventsByOrganization(
  organizationId: string,
): Promise<EventWithRelations[]> {
  const supabase = untypedServer();
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('status', 'accepted')
    .eq('organization_id', organizationId)
    .gte('start_at', today())
    .order('start_at', { nullsFirst: false });

  if (error) {
    console.error('[queries] getUpcomingEventsByOrganization:', error.message);
    return [];
  }
  return (data ?? []) as unknown as EventWithRelations[];
}

/** Nombre d'événements acceptés à venir d'une organisation. */
export async function countUpcomingEventsByOrganization(organizationId: string): Promise<number> {
  const supabase = untypedServer();
  const { count, error } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'accepted')
    .eq('organization_id', organizationId)
    .gte('start_at', today());

  if (error) {
    console.error('[queries] countUpcomingEventsByOrganization:', error.message);
    return 0;
  }
  return count ?? 0;
}

/** Nombre d'abonnés d'une organisation (RPC SECURITY DEFINER, sans exposer la liste). */
export async function countOrganizationSubscribers(organizationId: string): Promise<number> {
  const supabase = untypedServer();
  const { data, error } = await supabase.rpc('count_organization_subscribers', {
    p_org_id: organizationId,
  });
  if (error) {
    console.error('[queries] countOrganizationSubscribers:', error.message);
    return 0;
  }
  return (data as number) ?? 0;
}

/** Tous les ids d'organisations actives (generateStaticParams). */
export async function getAllOrganizationIds(): Promise<string[]> {
  const supabase = untypedServer();
  const { data, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('is_active', true);
  if (error) {
    console.error('[queries] getAllOrganizationIds:', error.message);
    return [];
  }
  return (data ?? []).map((r: { id: string }) => r.id);
}

/** Événements acceptés à venir d'un département donné (page /departement/[code]). */
export async function getUpcomingEventsByDepartment(
  code: string,
): Promise<EventWithRelations[]> {
  const supabase = untypedServer();
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
  return (data ?? []) as unknown as EventWithRelations[];
}
