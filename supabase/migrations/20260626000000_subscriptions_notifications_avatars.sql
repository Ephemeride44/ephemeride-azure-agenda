-- Abonnements visiteurs (communes, organisateurs), préférences et historique de
-- notifications, enrichissement des organisations, et bucket avatars.
--
-- Prolonge la migration 20260625 (favoris + push) : on ouvre aux comptes publics
-- le suivi de communes et d'organisateurs, avec une délivrance push doublée d'un
-- historique persistant (Notification Tray). RLS « chacun ses lignes » partout ;
-- l'insertion des notifications est réservée au service_role (Edge Functions).

-- ---------------------------------------------------------------------------
-- Abonnements aux communes (texte libre = events.location_city normalisé)
-- ---------------------------------------------------------------------------
create table if not exists public.city_subscriptions (
  user_id uuid not null references auth.users(id) on delete cascade,
  city text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, city)
);

create index if not exists city_subscriptions_city_idx on public.city_subscriptions(city);

alter table public.city_subscriptions enable row level security;

drop policy if exists "city_subscriptions_select_own" on public.city_subscriptions;
create policy "city_subscriptions_select_own"
  on public.city_subscriptions
  for select
  using (auth.uid() = user_id);

drop policy if exists "city_subscriptions_insert_own" on public.city_subscriptions;
create policy "city_subscriptions_insert_own"
  on public.city_subscriptions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "city_subscriptions_delete_own" on public.city_subscriptions;
create policy "city_subscriptions_delete_own"
  on public.city_subscriptions
  for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Abonnements aux organisateurs (organizations)
-- ---------------------------------------------------------------------------
create table if not exists public.organization_subscriptions (
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, organization_id)
);

create index if not exists organization_subscriptions_org_idx
  on public.organization_subscriptions(organization_id);

alter table public.organization_subscriptions enable row level security;

drop policy if exists "organization_subscriptions_select_own" on public.organization_subscriptions;
create policy "organization_subscriptions_select_own"
  on public.organization_subscriptions
  for select
  using (auth.uid() = user_id);

drop policy if exists "organization_subscriptions_insert_own" on public.organization_subscriptions;
create policy "organization_subscriptions_insert_own"
  on public.organization_subscriptions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "organization_subscriptions_delete_own" on public.organization_subscriptions;
create policy "organization_subscriptions_delete_own"
  on public.organization_subscriptions
  for delete
  using (auth.uid() = user_id);

-- Compteur public « N abonnés » d'un organisateur, sans exposer la liste.
create or replace function public.count_organization_subscribers(p_org_id uuid)
returns integer
language sql
security definer
set search_path to 'public'
as $$
  select count(*)::integer
  from public.organization_subscriptions
  where organization_id = p_org_id;
$$;

alter function public.count_organization_subscribers(uuid) owner to postgres;
grant execute on function public.count_organization_subscribers(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Préférences de notification (1 ligne par utilisateur ; absence = tout activé)
-- ---------------------------------------------------------------------------
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notify_bookmarks boolean not null default true,
  notify_cities boolean not null default true,
  notify_organizations boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
create policy "notification_preferences_select_own"
  on public.notification_preferences
  for select
  using (auth.uid() = user_id);

drop policy if exists "notification_preferences_insert_own" on public.notification_preferences;
create policy "notification_preferences_insert_own"
  on public.notification_preferences
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own"
  on public.notification_preferences
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Historique de notifications (Notification Tray)
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('bookmark', 'city', 'organization')),
  title text not null,
  body text not null,
  url text,
  event_id uuid references public.events(id) on delete cascade,
  icon text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Fil de l'utilisateur, du plus récent au plus ancien.
create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);

-- Idempotence : une seule notification par (utilisateur, événement, canal).
-- L'Edge Function fait `insert ... on conflict do nothing`.
create unique index if not exists notifications_dedup_idx
  on public.notifications(user_id, event_id, type);

alter table public.notifications enable row level security;

-- Lecture / marquage comme lu / suppression réservés au propriétaire.
-- PAS de policy insert : seul le service_role (Edge Functions) insère.
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications
  for select
  using (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
  on public.notifications
  for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Enrichissement des organisations (carte organisateur publique)
-- ---------------------------------------------------------------------------
alter table public.organizations
  add column if not exists location_city text,
  add column if not exists location_department text,
  add column if not exists logo_url text;

-- ---------------------------------------------------------------------------
-- Bucket avatars (versionne l'existant créé à la main dans le dashboard)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Lecture publique des avatars.
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

-- Écriture restreinte au dossier de l'utilisateur (le code range sous `${user.id}/`).
drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
