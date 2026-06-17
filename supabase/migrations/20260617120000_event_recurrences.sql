-- Récurrence d'événements : une règle de récurrence (hebdomadaire) génère plusieurs
-- événements individuels, tous liés via events.recurrence_id.

create table if not exists public.event_recurrences (
  id uuid primary key default gen_random_uuid(),
  frequency text not null default 'weekly',                    -- extensible (futur : monthly)
  interval integer not null default 1 check (interval >= 1),   -- toutes les X semaines
  weekdays integer[] not null default '{}',                    -- 0=dimanche .. 6=samedi (= JS getDay)
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lien des événements vers leur récurrence. La suppression de la récurrence
-- supprime en cascade tous les événements générés (gestion groupée de la série).
alter table public.events
  add column if not exists recurrence_id uuid references public.event_recurrences(id) on delete cascade;

create index if not exists events_recurrence_id_idx on public.events(recurrence_id);

alter table public.event_recurrences enable row level security;

-- Lecture publique : le front lit les événements liés (et leur récurrence).
drop policy if exists "event_recurrences_public_read" on public.event_recurrences;
create policy "event_recurrences_public_read"
  on public.event_recurrences
  for select
  using (true);

-- Insert public : nécessaire pour les propositions publiques récurrentes
-- (aligné sur la table events qui accepte les propositions anonymes).
drop policy if exists "event_recurrences_public_insert" on public.event_recurrences;
create policy "event_recurrences_public_insert"
  on public.event_recurrences
  for insert
  with check (true);

-- Mise à jour / suppression réservées aux utilisateurs authentifiés (admin).
drop policy if exists "event_recurrences_auth_update" on public.event_recurrences;
create policy "event_recurrences_auth_update"
  on public.event_recurrences
  for update
  using (auth.role() = 'authenticated');

drop policy if exists "event_recurrences_auth_delete" on public.event_recurrences;
create policy "event_recurrences_auth_delete"
  on public.event_recurrences
  for delete
  using (auth.role() = 'authenticated');
