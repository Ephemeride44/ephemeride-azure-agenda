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

Les secrets serveur (`SUPABASE_DB_URL`, `REVALIDATE_SECRET`) vont dans `.env.local` (non versionné).

## Types Supabase

```sh
make supabase-types   # régénère src/lib/database.types.ts
```
