# Design — Réinitialisation du mot de passe & Magic link (contexte local/distant)

Date : 2026-06-24
Branche : `feat/admin-calendar-view` (à dériver dans une branche dédiée)
Statut : approuvé

## Problème

1. **Reset password** : un utilisateur ayant cliqué sur « Mot de passe oublié ? » n'a reçu aucun email. De plus, la page `/reset-password` contient un bug (`navigate(...)` non défini, reliquat React Router) qui crashe après le changement de mot de passe.
2. **Magic link** : `signInWithOtp({ email })` n'envoie **aucun** `emailRedirectTo`. Supabase retombe donc sur la *Site URL* (prod), ce qui rend le lien inutilisable en local.

Objectif : que les deux flux (reset + magic link) envoient un lien qui **reste dans le contexte courant** (localhost en local, prod en prod), et que la réinitialisation aboutisse réellement.

## Contexte technique

- Stack : Next.js 16 (App Router), React 19, `@supabase/supabase-js` (client navigateur uniquement, pas de `@supabase/ssr`).
- Auth entièrement côté client via un singleton `AuthManager` (`src/hooks/use-auth.ts`) branché sur `supabase.auth.onAuthStateChange`. `detectSessionInUrl` (défaut `true`) capte automatiquement les tokens présents dans le hash de l'URL.
- Le `config.toml` ne contient qu'un `project_id` : **pas de stack Supabase locale**. Le « local » désigne `localhost:3000` qui parle au projet Supabase **hébergé** (`kgjvfuzdnbvgxkbndwfr`).
- Supabase **ignore tout `redirectTo`/`emailRedirectTo` absent de l'allowlist des Redirect URLs** et retombe alors silencieusement sur la Site URL.

## Approche retenue

**A — Durcir le flux client existant.** On conserve l'architecture 100% client-side (implicit/hash flow), on corrige les bugs et on rend les redirections dynamiques via `window.location.origin`.

Approches écartées :
- **B** — Migrer vers `@supabase/ssr` + route serveur `/auth/confirm` (PKCE/token_hash) : plus robuste mais refactor disproportionné.
- **C** — Ne corriger que la config Supabase : insuffisant, le code a deux vrais bugs.

## Changements

### 1. `src/components/LoginForm.tsx` — Magic link & factorisation

- Ajouter à `signInWithOtp` :
  ```ts
  emailRedirectTo: redirectUrl('/admin/dashboard')
  ```
- Le `resetPasswordForEmail` utilise déjà `window.location.origin/reset-password` (comportement correct) → le faire passer par le même helper.
- Introduire un helper local `redirectUrl(path: string)` :
  ```ts
  const redirectUrl = (path: string) => `${window.location.origin}${path}`;
  ```
  (helper module-level dans `LoginForm.tsx` ; `window` n'est lu qu'à l'intérieur des handlers, jamais au rendu, donc pas de souci SSR.)

### 2. `src/app/reset-password/page.tsx` — Page de réinitialisation

- **Détection de session fiable** : remplacer le hack `await new Promise(setTimeout 500ms)` + polling `getSession` par un écouteur `supabase.auth.onAuthStateChange` sur l'événement `PASSWORD_RECOVERY`, avec un fallback `getSession()` initial (cas où le hash a déjà été consommé avant le montage). Si ni session ni événement recovery → message « lien invalide » + redirection `/admin`.
- **Bug à corriger** (ligne ~94) : `navigate('/admin')` → `router.push('/admin/dashboard')`. L'utilisateur est authentifié après `updateUser`, donc on l'envoie directement sur le dashboard.
- Ajuster le message du toast de succès en cohérence (« Votre mot de passe a été modifié, redirection vers l'administration… » plutôt que « vous pouvez maintenant vous connecter »).
- Nettoyer la subscription `onAuthStateChange` au démontage (`unsubscribe`).

### 3. Configuration Supabase (hors code — étapes de vérification)

À exécuter / vérifier dans le dashboard Supabase du projet `kgjvfuzdnbvgxkbndwfr` :

- **Redirect URLs** (Authentication → URL Configuration) : ✅ déjà fait par l'utilisateur — `http://localhost:3000` et `http://localhost:3000/**` ajoutés. Vérifier que la Site URL de prod est bien présente aussi.
- **Livraison email** (Authentication → Emails / SMTP) — diagnostic du « je n'ai rien reçu » :
  - Si **SMTP par défaut Supabase** : il ne délivre **qu'aux adresses membres du projet** et est plafonné (~2 emails/h). C'est la cause n°1. Aucun changement de code ne corrigera la livraison vers une adresse externe → il faut soit brancher un **SMTP custom** (Resend, SendGrid, Postmark, SMTP perso…), soit tester avec une adresse membre.
  - Si **SMTP custom** déjà branché : vérifier les logs d'envoi (Authentication → Logs) et le dossier spam.
- **Templates email** : le défaut (`{{ .ConfirmationURL }}`) fonctionne avec ce flux → aucun changement requis.

## Flux final

- **Reset** : « Mot de passe oublié ? » → email → lien vers `/reset-password` **dans le contexte courant** → `PASSWORD_RECOVERY` détecté → saisie nouveau mot de passe → `/admin/dashboard`.
- **Magic link** : clic → email → lien vers `/admin/dashboard` **dans le contexte courant** → session posée automatiquement par `detectSessionInUrl`.

## Tests & vérification

- **Manuel (local)** : `pnpm dev`, déclencher reset + magic link, vérifier que le lien de l'email pointe vers `http://localhost:3000/...` et que les deux flux aboutissent. (La dépendance SMTP rend des tests automatisés peu praticables ici.)
- **Non-régression** : `pnpm lint` et `pnpm build` doivent passer.

## Hors périmètre

- Migration vers `@supabase/ssr` / route serveur d'échange de token.
- Mise en place d'une stack Supabase locale (Inbucket).
- Politique de complexité du mot de passe au-delà du minimum existant (6 caractères).
