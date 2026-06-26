-- Comptes publics : favoris (bookmarks) et abonnements aux notifications push.
-- Un « compte public » est un auth.users sans entrée dans super_admins ni
-- organization_users. Ces deux tables sont gérées directement par l'utilisateur
-- connecté (RLS « chacun ses lignes »).

-- ---------------------------------------------------------------------------
-- Favoris
-- ---------------------------------------------------------------------------
create table if not exists public.bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

-- Index pour compter rapidement les favoris d'un événement (compteur admin).
create index if not exists bookmarks_event_id_idx on public.bookmarks(event_id);

alter table public.bookmarks enable row level security;

-- Chaque utilisateur ne voit / crée / supprime que ses propres favoris.
drop policy if exists "bookmarks_select_own" on public.bookmarks;
create policy "bookmarks_select_own"
  on public.bookmarks
  for select
  using (auth.uid() = user_id);

drop policy if exists "bookmarks_insert_own" on public.bookmarks;
create policy "bookmarks_insert_own"
  on public.bookmarks
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "bookmarks_delete_own" on public.bookmarks;
create policy "bookmarks_delete_own"
  on public.bookmarks
  for delete
  using (auth.uid() = user_id);

-- Compteur « N personnes concernées » pour l'admin : renvoie le nombre de
-- favoris d'un événement sans exposer la liste des utilisateurs. SECURITY
-- DEFINER pour contourner la RLS, mais vérifie que l'appelant est super admin
-- ou admin de l'organisation de l'événement.
create or replace function public.count_event_bookmarks(p_event_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_org_id uuid;
  v_count integer;
begin
  select organization_id into v_org_id from public.events where id = p_event_id;

  if not (
    public.is_super_admin(auth.uid())
    or (v_org_id is not null and public.is_organization_admin(auth.uid(), v_org_id))
  ) then
    raise exception 'not authorized';
  end if;

  select count(*) into v_count from public.bookmarks where event_id = p_event_id;
  return v_count;
end;
$$;

alter function public.count_event_bookmarks(uuid) owner to postgres;
grant execute on function public.count_event_bookmarks(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Abonnements Web Push
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- Chaque utilisateur gère ses propres abonnements. L'Edge Function d'envoi
-- lit l'ensemble des abonnements via la clé service_role (hors RLS).
drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
  on public.push_subscriptions
  for select
  using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own"
  on public.push_subscriptions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own"
  on public.push_subscriptions
  for update
  using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own"
  on public.push_subscriptions
  for delete
  using (auth.uid() = user_id);
