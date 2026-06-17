-- Table de configuration globale du site (clé / valeur JSON).
-- Lecture publique (front), écriture réservée aux super admins.
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

-- Lecture publique : nécessaire pour afficher le widget de soutien sur le front.
drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read"
  on public.site_settings
  for select
  using (true);

-- Écriture (insert / update / delete) réservée aux super admins.
drop policy if exists "site_settings_superadmin_write" on public.site_settings;
create policy "site_settings_superadmin_write"
  on public.site_settings
  for all
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- Valeur par défaut pour le soutien Tipeee.
insert into public.site_settings (key, value)
values ('tipeee', '{"enabled": false, "url": "", "mode": "button"}'::jsonb)
on conflict (key) do nothing;
