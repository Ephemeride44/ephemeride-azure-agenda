-- Nettoyage post-migration start_at/end_at (ticket #11) : suppression des
-- colonnes legacy désormais inutilisées.
--
-- ⚠️ À N'APPLIQUER QU'APRÈS le déploiement en production du code qui lit
-- start_at/end_at (PR feature/event-start-end-at). Tant que l'ancien code tourne,
-- il lit encore ces colonnes (et trie sur `datetime`) : les supprimer casserait
-- le site en prod.
--
-- Le backfill ayant été vérifié (tout événement avec une date possède un start_at),
-- ces colonnes n'apportent plus d'information.

alter table public.events
  drop column if exists datetime,
  drop column if exists date,
  drop column if exists end_time;
