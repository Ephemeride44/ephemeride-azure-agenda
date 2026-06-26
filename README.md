# Éphéméride

L'agenda culturel et citoyen du vignoble nantais.

## Stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript**
- **Supabase** (base de données, auth, storage)
- **Tailwind CSS** + **shadcn/ui**
- **pnpm** (gestionnaire de paquets) · **Turbopack** (bundler)
- Déploiement **Vercel** (ISR natif)

## Architecture

Le site est rendu côté serveur avec de l'**ISR** (Incremental Static Regeneration) pour le référencement et la performance :

- `/` — page d'accueil (Server Component, ISR) : la liste publique des événements est rendue côté serveur, les filtres sont appliqués côté client.
- `/evenement/[slug]` — page détail par événement, générée statiquement (`generateStaticParams`), avec métadonnées dynamiques (OpenGraph) et données structurées **JSON-LD `Event`**.
- `/departement/[code]` — pages d'atterrissage par département.
- `/sitemap.xml` et `/robots.ts` — générés dynamiquement.
- `/admin/*`, `/signup`, `/reset-password` — espaces client (auth Supabase).
- `/api/revalidate` — revalidation ISR à la demande, déclenchée après chaque mutation admin.

## Développement local

Prérequis : **Node.js 20+** et **pnpm**.

```sh
pnpm install
pnpm dev          # serveur de dev (Turbopack) sur http://localhost:8080
```

Autres scripts :

```sh
pnpm build        # build de production (Turbopack)
pnpm start        # sert le build de production
pnpm lint         # ESLint
```

## Variables d'environnement

Copier `.env.example` et renseigner les valeurs. Voir ce fichier pour la liste complète.

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase (exposés au navigateur).
- `NEXT_PUBLIC_SITE_URL` — URL publique du site (canonical, OpenGraph, sitemap).
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` — analytics (optionnel).
- `REVALIDATE_SECRET` — secret partagé pour `/api/revalidate` (usage serveur/webhook).
- `RESEND_API_KEY`, `RESEND_FROM` — envoi d'e-mails via Resend (Edge Functions).
- `RESEND_EMAIL_RECEIVED_FORWARD` — adresse(s) de redirection des e-mails entrants (séparées par des virgules). Voir [Redirection des e-mails entrants](#redirection-des-e-mails-entrants-resend).
- `RESEND_WEBHOOK_SECRET` — secret de signature du webhook Resend `email.received`.

Les secrets serveur (`SUPABASE_DB_URL`, `REVALIDATE_SECRET`) et les secrets Resend vont dans `.env.local` (non versionné).

## Types Supabase

```sh
make supabase-types   # régénère src/lib/database.types.ts
```

## Redirection des e-mails entrants (Resend)

Le domaine peut **recevoir** des e-mails via la fonctionnalité _Inbound_ de Resend. L'Edge Function Supabase [`forward-inbound-email`](supabase/functions/forward-inbound-email/index.ts) écoute l'événement webhook `email.received` et **redirige** chaque message reçu vers la ou les adresses définies dans `RESEND_EMAIL_RECEIVED_FORWARD`.

Le webhook Resend ne transmet que des **métadonnées**. La fonction récupère donc le corps du mail (`GET /emails/receiving/{id}`) puis ses pièces jointes (`GET /emails/receiving/{id}/attachments`), avant de **ré-émettre** un nouveau message depuis le domaine vérifié (`RESEND_FROM`). Le `reply-to` pointe vers l'expéditeur d'origine, et un bandeau « Redirigé via Éphéméride » est ajouté. Les pièces jointes dépassant ~25 Mo cumulés sont omises et signalées dans le bandeau.

La fonction reste **inerte** tant que `RESEND_EMAIL_RECEIVED_FORWARD` est vide.

### Configuration

1. Renseigner dans `.env.local` (non versionné) :

   ```sh
   RESEND_API_KEY=re_xxx
   RESEND_FROM=Éphéméride <bonjour@ephemeride.link>   # domaine vérifié dans Resend
   RESEND_EMAIL_RECEIVED_FORWARD=leny.bernard@gmail.com   # plusieurs adresses possibles, séparées par des virgules
   RESEND_WEBHOOK_SECRET=                              # rempli à l'étape 3
   ```

2. Déployer la fonction et noter son URL :

   ```sh
   make deploy-fn FN=forward-inbound-email
   # → https://<project-ref>.supabase.co/functions/v1/forward-inbound-email
   ```

3. Côté **Resend** → _Webhooks_ → _Add Endpoint_ :
   - **URL** : l'URL de la fonction (étape 2) ;
   - **Événement** : `email.received` ;
   - copier le **Signing Secret** affiché (format `whsec_…`) dans `RESEND_WEBHOOK_SECRET` (`.env.local`).

4. Pousser les secrets vers l'Edge Function :

   ```sh
   make supabase-secrets-email
   ```

Logs en cas de souci : `npx supabase functions logs forward-inbound-email`.
