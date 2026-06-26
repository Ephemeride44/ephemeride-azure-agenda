-- Contexte de navigation des notifications : permet au Notification Tray de
-- router intelligemment selon le type (favori → scroll vers l'événement,
-- ville → filtre commune + scroll, organisateur → page organisateur).

alter table public.notifications
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
  add column if not exists target_city text;
