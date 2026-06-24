# Reset password & Magic link — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre les flux « mot de passe oublié » et « magic link » fonctionnels et indépendants de l'environnement, en faisant pointer chaque lien d'email vers le contexte courant (localhost en local, prod en prod).

**Architecture:** On conserve l'architecture 100% client-side Supabase (implicit/hash flow, `detectSessionInUrl`). On rend les redirections d'email dynamiques via `window.location.origin`, on durcit la page `/reset-password` avec l'événement `PASSWORD_RECOVERY`, et on corrige un bug `navigate` (reliquat React Router). La config Supabase (allowlist + livraison email) est vérifiée hors code.

**Tech Stack:** Next.js 16 (App Router), React 19, `@supabase/supabase-js` (client navigateur), TypeScript.

## Global Constraints

- Pas de framework de test dans le repo : la vérification se fait via `pnpm lint`, `pnpm build` et test manuel local. Ne PAS introduire de framework de test.
- Communication utilisateur en français, accents corrects.
- `window` ne doit être lu qu'à l'intérieur de handlers/effets clients, jamais au rendu top-level (composants `"use client"`, donc OK).
- Toute redirection d'email passe par le contexte courant (`window.location.origin`), jamais d'URL en dur.
- Minimum mot de passe : 6 caractères (déjà en place, à conserver).

---

### Task 1: Redirections dynamiques dans le formulaire de connexion

**Files:**
- Modify: `src/components/LoginForm.tsx`

**Interfaces:**
- Produces: helper module-level `redirectUrl(path: string): string` → `\`${window.location.origin}${path}\``, utilisé par `signInWithOtp` et `resetPasswordForEmail`.

- [ ] **Step 1: Ajouter le helper `redirectUrl`**

Juste après le cast `const supabase: SupabaseClient = baseSupabase;` (ligne ~14), ajouter :

```ts
// Construit une URL de redirection dans le contexte courant (local ou distant),
// pour que les liens d'email restent sur le même domaine que la session en cours.
const redirectUrl = (path: string) => `${window.location.origin}${path}`;
```

- [ ] **Step 2: Passer `emailRedirectTo` au magic link**

Remplacer le bloc `signInWithOtp` :

```ts
      const { error } = await supabase.auth.signInWithOtp({
        email,
      });
```

par :

```ts
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl('/admin/dashboard'),
        },
      });
```

- [ ] **Step 3: Faire passer le reset par le helper**

Remplacer :

```ts
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
```

par :

```ts
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl('/reset-password'),
      });
```

- [ ] **Step 4: Lint du fichier**

Run: `pnpm lint`
Expected: aucune erreur (warnings préexistants tolérés s'il y en a).

- [ ] **Step 5: Commit**

```bash
git add src/components/LoginForm.tsx
git commit -m "Faire pointer magic link et reset vers le contexte courant"
```

---

### Task 2: Durcir la page de réinitialisation et corriger le bug `navigate`

**Files:**
- Modify: `src/app/reset-password/page.tsx`

**Interfaces:**
- Consumes: `supabase.auth.onAuthStateChange`, `supabase.auth.getSession`, `supabase.auth.updateUser` (déjà importé), `router` (`useRouter`), `toast` (`useToast`) — tous déjà présents dans le fichier.

- [ ] **Step 1: Remplacer la détection de session (le `useEffect`)**

Remplacer l'intégralité du `useEffect` actuel (le bloc `checkSession` avec le `setTimeout(500)` et le polling `getSession`) par :

```ts
  useEffect(() => {
    let validated = false;

    const markValid = () => {
      validated = true;
      setIsValidating(false);
    };

    // Cas nominal : Supabase émet PASSWORD_RECOVERY après avoir lu le hash de l'URL.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        markValid();
      }
    });

    // Fallback : la session de recovery est peut-être déjà posée (hash déjà consommé).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) markValid();
    });

    // Garde-fou : lien invalide / expiré → on prévient et on sort.
    const timeout = setTimeout(() => {
      if (validated) return;
      toast({
        title: "Lien invalide",
        description: "Ce lien de réinitialisation n'est pas valide ou a expiré.",
        variant: "destructive",
      });
      setTimeout(() => router.push('/admin'), 2000);
    }, 3000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [router, toast]);
```

- [ ] **Step 2: Corriger la redirection de succès (bug `navigate`)**

Dans `handleResetPassword`, remplacer le bloc de succès :

```ts
      toast({
        title: "Mot de passe modifié",
        description: "Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter.",
      });

      // Rediriger vers la page de connexion après un court délai
      setTimeout(() => {
        navigate('/admin');
      }, 2000);
```

par :

```ts
      toast({
        title: "Mot de passe modifié",
        description: "Votre mot de passe a été mis à jour. Redirection vers l'administration…",
      });

      // L'utilisateur est authentifié après updateUser → on l'envoie sur le dashboard.
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 2000);
```

- [ ] **Step 3: Vérifier qu'il ne reste aucune référence à `navigate`**

Run: `grep -n "navigate" src/app/reset-password/page.tsx`
Expected: aucune sortie (la seule occurrence a été remplacée).

- [ ] **Step 4: Lint + build**

Run: `pnpm lint && pnpm build`
Expected: lint sans erreur, build qui réussit (compilation TypeScript OK, plus aucun symbole `navigate` non défini).

- [ ] **Step 5: Commit**

```bash
git add src/app/reset-password/page.tsx
git commit -m "Fiabiliser la page reset-password et corriger la redirection"
```

---

### Task 3: Vérification config Supabase + test manuel de bout en bout

**Files:** aucun fichier de code (vérification dashboard + manuel).

**Interfaces:** aucune.

- [ ] **Step 1: Vérifier l'allowlist des Redirect URLs**

Dashboard Supabase (projet `kgjvfuzdnbvgxkbndwfr`) → Authentication → URL Configuration.
Vérifier la présence de : `http://localhost:3000`, `http://localhost:3000/**` (déjà ajoutés) **et** la Site URL de prod (`https://ephemeride.app` ou équivalent) avec son `/**`.

- [ ] **Step 2: Diagnostiquer la livraison email**

Dashboard → Authentication → Emails / SMTP Settings.
- Si **SMTP par défaut Supabase** : la livraison ne fonctionne **que vers les adresses membres du projet** (quota ~2/h). Pour livrer à une adresse externe → brancher un SMTP custom (Resend, SendGrid, Postmark, SMTP perso). Pour un test rapide : utiliser une adresse membre du projet.
- Si **SMTP custom** : vérifier Authentication → Logs et le dossier spam.

Noter le résultat (quel mode est actif) pour le compte-rendu final.

- [ ] **Step 3: Test manuel — reset password en local**

```bash
pnpm dev
```
Sur `http://localhost:3000/admin` : onglet « Email + mot de passe » → « Mot de passe oublié ? » → saisir une adresse qui reçoit (cf. Step 2) → envoyer.
Vérifier dans l'email reçu que le lien pointe vers `http://localhost:3000/reset-password...`. Cliquer → la page sort de « Vérification du lien… », saisir un nouveau mot de passe → redirection vers `/admin/dashboard`. Se déconnecter et se reconnecter avec le nouveau mot de passe.

- [ ] **Step 4: Test manuel — magic link en local**

Sur `http://localhost:3000/admin` : onglet « Magic link » → saisir l'adresse → « Recevoir un magic link ».
Vérifier que le lien de l'email pointe vers `http://localhost:3000/admin/dashboard...`. Cliquer → arrivée authentifiée sur le dashboard.

- [ ] **Step 5: Compte-rendu**

Reporter fidèlement : flux reset OK, flux magic link OK, et le mode d'envoi email constaté (défaut vs custom) avec, le cas échéant, la recommandation de brancher un SMTP custom si la livraison externe est requise.

---

## Notes de vérification du plan

- **Couverture spec** : magic link (Task 1) ✅ ; reset redirect dynamique (Task 1) ✅ ; détection PASSWORD_RECOVERY + cleanup (Task 2) ✅ ; bug `navigate` (Task 2) ✅ ; redirect allowlist + livraison email + diagnostic (Task 3) ✅ ; tests manuels + lint/build (Tasks 1-3) ✅. Templates email : défaut conservé, aucune tâche requise (conforme au spec).
- **Pas de placeholder** : tout le code à appliquer est fourni intégralement.
- **Cohérence des noms** : `redirectUrl` utilisé de façon identique partout ; `router.push` (jamais `navigate`).
