-- Policies de stockage pour le bucket `event-assets`.
--
-- Contexte : le formulaire public de proposition d'événement
-- (`EventProposalForm`) permet à un visiteur NON authentifié de joindre une
-- affiche. L'upload s'exécute donc avec le rôle `anon`. Or le bucket
-- n'autorisait l'insertion qu'aux utilisateurs `authenticated`, d'où l'erreur
-- « new row violates row-level security policy » en prod (invisible en local
-- quand on est connecté en admin).
--
-- Ces policies storage avaient été créées à la main dans le dashboard et
-- n'étaient pas versionnées : cette migration les remet sous contrôle de
-- version. On restreint l'écriture anonyme au seul dossier `covers/`.

-- Le bucket doit être public pour que `getPublicUrl` serve les affiches.
insert into storage.buckets (id, name, public)
values ('event-assets', 'event-assets', true)
on conflict (id) do update set public = true;

-- Lecture publique des objets du bucket (affichage des affiches).
drop policy if exists "event_assets_public_read" on storage.objects;
create policy "event_assets_public_read"
  on storage.objects
  for select
  using (bucket_id = 'event-assets');

-- Upload (insert) autorisé aux visiteurs anonymes ET authentifiés,
-- restreint au dossier `covers/`.
drop policy if exists "event_assets_covers_insert" on storage.objects;
create policy "event_assets_covers_insert"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'event-assets'
    and (storage.foldername(name))[1] = 'covers'
  );

-- L'upload utilise `upsert: true` : autoriser aussi l'update sur le même
-- périmètre pour éviter un rejet en cas de collision de nom.
drop policy if exists "event_assets_covers_update" on storage.objects;
create policy "event_assets_covers_update"
  on storage.objects
  for update
  to anon, authenticated
  using (
    bucket_id = 'event-assets'
    and (storage.foldername(name))[1] = 'covers'
  )
  with check (
    bucket_id = 'event-assets'
    and (storage.foldername(name))[1] = 'covers'
  );
