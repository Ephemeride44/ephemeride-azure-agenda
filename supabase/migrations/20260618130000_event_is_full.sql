-- Marqueur « complet » sur les événements (ticket #35).
--
-- Permet aux admins de signaler qu'un événement affiche complet ; le front
-- affiche alors une mention « Complet » sur la fiche de l'événement.

alter table public.events
  add column if not exists is_full boolean not null default false;
