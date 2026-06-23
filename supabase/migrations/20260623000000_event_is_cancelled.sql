-- Marqueur « annulé » sur les événements (ticket #43).
--
-- Sur le même principe que « complet » (is_full), permet aux admins de signaler
-- qu'un événement est annulé ; le front affiche alors une mention « Annulé » sur
-- la fiche de l'événement plutôt que d'avoir à le supprimer.

alter table public.events
  add column if not exists is_cancelled boolean not null default false;
