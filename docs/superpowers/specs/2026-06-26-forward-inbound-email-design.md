# Redirection des mails entrants Resend — Design

Date : 2026-06-26
Statut : validé (design)

## Objectif

Permettre de rediriger automatiquement les mails reçus sur le domaine Resend
(`email.received`) vers une ou plusieurs adresses configurées via la variable
d'environnement `RESEND_EMAIL_RECEIVED_FORWARD` (ex. `leny.bernard@gmail.com`).

Resend ne fait pas de relais SMTP transparent : le webhook `email.received`
livre le mail parsé, et c'est notre code qui recompose puis ré-émet un nouvel
email via l'API Resend depuis le domaine vérifié (`ephemeride.link`).
« Rediriger » = recomposer et ré-émettre.

## Décisions

- **Fidélité** : complète, pièces jointes incluses.
- **Sécurité** : vérification de la signature du webhook Resend (Svix) via un
  secret `RESEND_WEBHOOK_SECRET`.
- **Portée** : `RESEND_EMAIL_RECEIVED_FORWARD` peut contenir plusieurs adresses
  séparées par des virgules ; le mail est redirigé vers chacune.

## Architecture

Nouvelle Edge Function Supabase `forward-inbound-email`
(`supabase/functions/forward-inbound-email/index.ts`), runtime Deno, même style
que `send-auth-email`. Son URL (`…/functions/v1/forward-inbound-email`) devient
la cible du webhook `email.received` configuré côté Resend.

```
Mail entrant ──► Resend (inbound) ──webhook email.received──► forward-inbound-email
                                                                  │ 1. vérifie signature Svix
                                                                  │ 2. recompose le mail
                                                                  └─► POST api.resend.com/emails ──► boîte(s) cible(s)
```

## Composants (responsabilités isolées)

1. **Vérification de signature** — via la lib `standardwebhooks` (déjà utilisée
   par `send-auth-email`), secret `RESEND_WEBHOOK_SECRET`. Signature invalide → `401`.
2. **Filtre d'événement** — si `type !== "email.received"` → `200` (no-op : on
   ignore proprement les autres events que Resend pourrait envoyer).
3. **Garde de configuration** — si `RESEND_EMAIL_RECEIVED_FORWARD` est absent →
   `200` + `console.warn`. La fonction reste inerte tant que le secret n'est pas
   défini (pas d'échec dur).
4. **Recomposition** — construit le nouvel email :
   - `from` : `RESEND_FROM` (domaine vérifié), nom d'affichage rappelant
     l'expéditeur d'origine, ex. `"Jean Dupont (via Éphéméride) <bonjour@ephemeride.link>"`.
   - `to` : liste issue de `RESEND_EMAIL_RECEIVED_FORWARD` (split sur `,`, trim,
     filtrage des entrées vides).
   - `reply_to` : expéditeur d'origine → répondre renvoie bien à la bonne personne.
   - `subject` : sujet d'origine, inchangé.
   - corps `html`/`text` : corps d'origine, précédé d'un petit bandeau
     « Redirigé — de X, à l'origine vers Y ».
   - `attachments` : pièces jointes du mail entrant, ré-encodées en base64 pour
     l'API d'envoi Resend.
5. **Envoi** — `POST https://api.resend.com/emails` avec `Authorization: Bearer
   RESEND_API_KEY`.

## Gestion d'erreurs / cas limites

- Échec d'envoi Resend → réponse `500` (Resend retentera le webhook).
- Pièces jointes : Resend plafonne à ~40 Mo par message. Si dépassement, on omet
  les PJ trop lourdes et on le signale dans le bandeau, plutôt que de faire
  échouer toute la redirection.
- Boucle de mail : la redirection part vers une adresse externe (Gmail…), pas
  vers le domaine inbound — pas de boucle attendue. Pas de détection de boucle
  spécifique dans cette version.

## À confirmer en implémentation

- Format exact du payload de l'event `email.received` (noms de champs :
  `from`, `to`, `subject`, `html`, `text`, `headers`, `attachments`, etc.).
- Mode de livraison des pièces jointes par Resend (base64 inline dans le payload
  vs URL à télécharger puis ré-encoder en base64).

Ces deux points seront calés sur la documentation Resend au moment d'écrire le
code.

## Configuration & déploiement

- `.env.example` : ajout de `RESEND_EMAIL_RECEIVED_FORWARD` et
  `RESEND_WEBHOOK_SECRET` (commentés, comme les autres secrets Resend).
- `Makefile` : la cible `supabase-secrets-email` pousse aussi ces deux secrets ;
  déploiement via `make deploy-fn FN=forward-inbound-email`.
- Côté Resend : créer le webhook `email.received` pointant vers l'URL de la
  fonction, et récupérer le signing secret pour `RESEND_WEBHOOK_SECRET`.

## Tests

- Test unitaire Deno sur la logique pure de recomposition (payload d'exemple →
  objet d'envoi : `from`/`to`/`reply_to`/`subject`/`attachments`).
- Test manuel : fonctionnalité de test de webhook de Resend (ou `curl` avec
  payload + signature) vers la fonction déployée.
