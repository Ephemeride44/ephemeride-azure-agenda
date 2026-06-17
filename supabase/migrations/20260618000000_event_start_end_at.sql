-- Dissociation date / heure des événements (ticket #11).
--
-- Historiquement l'horaire d'un événement ponctuel était éclaté entre :
--   - `date`      (YYYY-MM-DD) : seule clé de tri fiable, pas toujours renseignée ;
--   - `datetime`  (texte FR "mercredi 21 mai 2025 à 16h30") : date + heure mélangées,
--                 l'heure devant être ré-extraite par regex côté app ;
--   - `end_time`  (texte "19h00") : heure de fin optionnelle.
-- Le tri par horaire était donc cassé (tri alphabétique : "14h30" < "9h00").
--
-- On introduit deux vraies colonnes `start_at` / `end_at` (timestamp sans fuseau,
-- heure murale locale de Paris). Les anciennes colonnes sont conservées le temps
-- de la transition (un DROP suivra dans une migration ultérieure).

alter table public.events
  add column if not exists start_at timestamp,
  add column if not exists end_at timestamp;

-- `datetime` (NOT NULL historiquement) n'est plus écrit par l'application : on
-- lève la contrainte pour autoriser les inserts qui ne renseignent que start_at.
alter table public.events
  alter column datetime drop not null;

-- Backfill de start_at : date + heure de début extraite du texte `datetime`.
-- L'heure est au format "16h30" ou "16h" (minutes optionnelles) ; défaut 00:00.
update public.events e
set start_at = (
  e.date::text || ' '
  || lpad(coalesce((regexp_match(e.datetime, '(\d{1,2})h(\d{0,2})'))[1], '0'), 2, '0')
  || ':'
  || lpad(coalesce(nullif((regexp_match(e.datetime, '(\d{1,2})h(\d{0,2})'))[2], ''), '0'), 2, '0')
  || ':00'
)::timestamp
where e.date is not null and e.start_at is null;

-- Backfill de end_at : date + heure de fin (`end_time`), seulement si présente.
update public.events e
set end_at = (
  e.date::text || ' '
  || lpad((regexp_match(e.end_time, '(\d{1,2})h(\d{0,2})'))[1], 2, '0')
  || ':'
  || lpad(coalesce(nullif((regexp_match(e.end_time, '(\d{1,2})h(\d{0,2})'))[2], ''), '0'), 2, '0')
  || ':00'
)::timestamp
where e.date is not null and e.end_time ~ '\d{1,2}h\d{0,2}' and e.end_at is null;

-- Index pour le tri chronologique (date + heure en une seule clé).
create index if not exists events_start_at_idx on public.events(start_at);
