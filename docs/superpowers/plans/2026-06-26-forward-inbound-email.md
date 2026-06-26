# Redirection des mails entrants Resend — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediriger automatiquement les mails reçus sur le domaine Resend vers une ou plusieurs adresses configurées, via une Edge Function Supabase déclenchée par le webhook `email.received`.

**Architecture:** Une Edge Function Deno `forward-inbound-email` reçoit le webhook `email.received` (qui ne contient que des métadonnées), vérifie sa signature Svix, récupère le corps via l'API Receiving de Resend (`GET /emails/receiving/{id}`) et les pièces jointes via l'API Attachments (`GET /emails/receiving/{id}/attachments`, qui renvoie des `download_url` signés), puis recompose et ré-émet un nouveau mail via `POST /emails` depuis le domaine vérifié. La logique de recomposition (pure, sans réseau) vit dans `forward.ts` et est testée unitairement ; `index.ts` orchestre les appels réseau.

**Tech Stack:** Supabase Edge Functions (runtime Deno), API REST Resend, `npm:standardwebhooks@1.0.0` (vérif signature), `jsr:@std/encoding@1/base64` (encodage PJ), `jsr:@std/assert@1` (tests).

## Global Constraints

- Runtime Deno (Edge Function Supabase) — imports via `npm:` et `jsr:`, accès env via `Deno.env.get(...)`. Une seule des variables présentes/absentes peut changer le comportement ; ne jamais faire échouer durement sur une config manquante autre que `RESEND_API_KEY`.
- Domaine expéditeur : `RESEND_FROM` (défaut `Éphéméride <bonjour@ephemeride.link>`), doit être un domaine vérifié dans Resend.
- Textes destinés à l'utilisateur en français, avec accents corrects.
- Le webhook Resend n'envoie pas de JWT Supabase → la fonction doit être déployée avec `verify_jwt = false`.
- Limite Resend ~40 Mo par mail ; le base64 gonfle d'environ 33 %. Budget pièces jointes fixé à 25 Mo de données brutes (`MAX_ATTACHMENTS_BYTES`).
- Format du payload webhook `email.received` :
  ```json
  { "type": "email.received", "created_at": "...", "data": { "email_id": "uuid", "from": "...", "to": ["..."], "subject": "...", "attachments": [ ... ] } }
  ```
- Headers de signature envoyés par Resend : `svix-id`, `svix-timestamp`, `svix-signature`.
- Réponse de `GET /emails/receiving/{id}` : champs `id`, `from`, `to`, `cc`, `bcc`, `subject`, `html`, `text`, `reply_to`, `headers`, `attachments`, `raw`. Paramètre `?html_format=data_uri` pour embarquer les images inline.
- Réponse de `GET /emails/receiving/{id}/attachments` : `{ "data": [ { id, filename, size, content_type, content_disposition, content_id, download_url, expires_at } ] }`.

---

## File Structure

- `supabase/functions/forward-inbound-email/forward.ts` — **créé** : logique pure de recomposition (parsing adresses, extraction nom/adresse, sélection PJ, construction de l'email de sortie). Aucune dépendance réseau.
- `supabase/functions/forward-inbound-email/forward.test.ts` — **créé** : tests unitaires Deno de `forward.ts`.
- `supabase/functions/forward-inbound-email/index.ts` — **créé** : orchestrateur HTTP (vérif signature, récupération corps + PJ, envoi). Thin, non testé automatiquement (réseau) ; testé manuellement.
- `supabase/config.toml` — **modifié** : ajout de `[functions.forward-inbound-email]` avec `verify_jwt = false`.
- `.env.example` — **modifié** : documentation des nouveaux secrets `RESEND_EMAIL_RECEIVED_FORWARD` et `RESEND_WEBHOOK_SECRET`.
- `Makefile` — **modifié** : la cible `supabase-secrets-email` pousse aussi les deux nouveaux secrets.

---

## Task 1: Module pur de recomposition (`forward.ts`) + tests unitaires

**Files:**
- Create: `supabase/functions/forward-inbound-email/forward.ts`
- Test: `supabase/functions/forward-inbound-email/forward.test.ts`

**Interfaces:**
- Consumes: rien (premier task).
- Produces (utilisés par Task 2) :
  - `parseForwardAddresses(raw: string | undefined): string[]`
  - `bareAddress(addr: string): string`
  - `senderName(from: string): string`
  - `buildFrom(resendFrom: string, originalFrom: string): string`
  - `selectAttachments(metas: InboundAttachmentMeta[], maxTotalBytes: number): { keep: InboundAttachmentMeta[]; skipped: string[] }`
  - `buildForwardEmail(params: { received: ReceivedEmail; forwardTo: string[]; resendFrom: string; attachments: OutboundAttachment[]; skippedAttachments: string[] }): ForwardEmail`
  - types exportés : `InboundAttachmentMeta`, `ReceivedEmail`, `OutboundAttachment`, `ForwardEmail`

- [ ] **Step 1: Écrire le fichier de tests qui échoue**

Créer `supabase/functions/forward-inbound-email/forward.test.ts` :

```ts
import { assertEquals } from "jsr:@std/assert@1";
import {
  bareAddress,
  buildForwardEmail,
  buildFrom,
  parseForwardAddresses,
  selectAttachments,
  senderName,
} from "./forward.ts";

Deno.test("parseForwardAddresses : sépare, trim, ignore les vides", () => {
  assertEquals(parseForwardAddresses("a@x.com, b@y.com ,, c@z.com"), [
    "a@x.com",
    "b@y.com",
    "c@z.com",
  ]);
  assertEquals(parseForwardAddresses(undefined), []);
  assertEquals(parseForwardAddresses(""), []);
});

Deno.test("bareAddress : extrait l'adresse e-mail", () => {
  assertEquals(bareAddress("Jean Dupont <jean@x.com>"), "jean@x.com");
  assertEquals(bareAddress("jean@x.com"), "jean@x.com");
});

Deno.test("senderName : nom d'affichage, sinon adresse", () => {
  assertEquals(senderName("Jean Dupont <jean@x.com>"), "Jean Dupont");
  assertEquals(senderName('"Jean Dupont" <jean@x.com>'), "Jean Dupont");
  assertEquals(senderName("jean@x.com"), "jean@x.com");
});

Deno.test("buildFrom : nom d'origine + domaine vérifié", () => {
  assertEquals(
    buildFrom("Éphéméride <bonjour@ephemeride.link>", "Jean Dupont <jean@x.com>"),
    "Jean Dupont (via Éphéméride) <bonjour@ephemeride.link>",
  );
});

Deno.test("selectAttachments : ignore inline et hors budget", () => {
  const metas = [
    { id: "1", filename: "inline.png", content_type: "image/png", content_disposition: "inline", size: 10 },
    { id: "2", filename: "doc.pdf", content_type: "application/pdf", content_disposition: "attachment", size: 100 },
    { id: "3", filename: "big.zip", content_type: "application/zip", content_disposition: "attachment", size: 1000 },
  ];
  const { keep, skipped } = selectAttachments(metas, 500);
  assertEquals(keep.map((a) => a.filename), ["doc.pdf"]);
  assertEquals(skipped, ["big.zip"]);
});

Deno.test("buildForwardEmail : compose from/to/reply_to/subject + bandeau", () => {
  const out = buildForwardEmail({
    received: {
      id: "e1",
      from: "Jean Dupont <jean@x.com>",
      to: ["contact@ephemeride.link"],
      subject: "Bonjour",
      html: "<p>Salut</p>",
      text: "Salut",
    },
    forwardTo: ["leny.bernard@gmail.com"],
    resendFrom: "Éphéméride <bonjour@ephemeride.link>",
    attachments: [{ filename: "doc.pdf", content: "QUJD", content_type: "application/pdf" }],
    skippedAttachments: [],
  });
  assertEquals(out.from, "Jean Dupont (via Éphéméride) <bonjour@ephemeride.link>");
  assertEquals(out.to, ["leny.bernard@gmail.com"]);
  assertEquals(out.reply_to, "jean@x.com");
  assertEquals(out.subject, "Bonjour");
  assertEquals(out.attachments?.length, 1);
  assertEquals(out.html?.includes("Redirigé via Éphéméride"), true);
  assertEquals(out.html?.includes("<p>Salut</p>"), true);
  assertEquals(out.text?.includes("Salut"), true);
});

Deno.test("buildForwardEmail : corps minimal si ni html ni text", () => {
  const out = buildForwardEmail({
    received: { id: "e2", from: "jean@x.com", to: ["c@ephemeride.link"], subject: "Vide" },
    forwardTo: ["leny.bernard@gmail.com"],
    resendFrom: "Éphéméride <bonjour@ephemeride.link>",
    attachments: [],
    skippedAttachments: ["gros.zip"],
  });
  assertEquals(out.html, undefined);
  assertEquals(out.text?.includes("(message sans contenu)"), true);
  assertEquals(out.text?.includes("gros.zip"), true);
  assertEquals(out.attachments, undefined);
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `deno test supabase/functions/forward-inbound-email/forward.test.ts`
Expected: FAIL (module `./forward.ts` introuvable / exports manquants).

- [ ] **Step 3: Écrire l'implémentation `forward.ts`**

Créer `supabase/functions/forward-inbound-email/forward.ts` :

```ts
// Logique pure de recomposition d'un mail entrant Resend vers une redirection.
// Aucune dépendance réseau ici → testable unitairement avec `deno test`.

export interface InboundAttachmentMeta {
  id: string;
  filename: string;
  content_type: string;
  content_disposition: string; // "inline" | "attachment"
  content_id?: string;
  size?: number;
  download_url?: string;
}

export interface ReceivedEmail {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string[];
}

export interface OutboundAttachment {
  filename: string;
  content: string; // base64
  content_type?: string;
}

export interface ForwardEmail {
  from: string;
  to: string[];
  reply_to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: OutboundAttachment[];
}

// "a@x.com, b@y.com" -> ["a@x.com", "b@y.com"]
export function parseForwardAddresses(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
}

// "Jean Dupont <jean@x.com>" -> "jean@x.com" ; "jean@x.com" -> "jean@x.com"
export function bareAddress(addr: string): string {
  const m = addr.match(/<([^>]+)>/);
  return (m ? m[1] : addr).trim();
}

// "Jean Dupont <jean@x.com>" -> "Jean Dupont" ; "jean@x.com" -> "jean@x.com"
export function senderName(from: string): string {
  const m = from.match(/^\s*"?([^"<]*?)"?\s*<[^>]+>\s*$/);
  const name = m && m[1] ? m[1].trim() : "";
  return name || bareAddress(from);
}

// from d'envoi : nom de l'expéditeur d'origine, adresse de notre domaine vérifié.
export function buildFrom(resendFrom: string, originalFrom: string): string {
  return `${senderName(originalFrom)} (via Éphéméride) <${bareAddress(resendFrom)}>`;
}

// Garde les pièces jointes "réelles" (non inline) tant que le budget n'est pas
// dépassé ; renvoie aussi les noms ignorés pour les signaler dans le bandeau.
export function selectAttachments(
  metas: InboundAttachmentMeta[],
  maxTotalBytes: number,
): { keep: InboundAttachmentMeta[]; skipped: string[] } {
  const keep: InboundAttachmentMeta[] = [];
  const skipped: string[] = [];
  let total = 0;
  for (const a of metas) {
    if (a.content_disposition === "inline") continue; // déjà embarquée dans le HTML (data_uri)
    const size = a.size ?? 0;
    if (total + size > maxTotalBytes) {
      skipped.push(a.filename);
      continue;
    }
    total += size;
    keep.push(a);
  }
  return { keep, skipped };
}

function bannerHtml(originalFrom: string, originalTo: string[], skipped: string[]): string {
  const skippedLine = skipped.length
    ? `<br/>Pièces jointes trop volumineuses, non incluses : ${skipped.join(", ")}.`
    : "";
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#64748b;border-left:3px solid #ED9873;padding:8px 12px;margin:0 0 16px;background:#faf3ec;">
  Redirigé via Éphéméride — de <strong>${originalFrom}</strong>, à l'origine vers ${originalTo.join(", ")}.${skippedLine}
</div>`;
}

function bannerText(originalFrom: string, originalTo: string[], skipped: string[]): string {
  const skippedLine = skipped.length
    ? `\nPièces jointes trop volumineuses, non incluses : ${skipped.join(", ")}.`
    : "";
  return `Redirigé via Éphéméride — de ${originalFrom}, à l'origine vers ${originalTo.join(", ")}.${skippedLine}\n\n`;
}

export function buildForwardEmail(params: {
  received: ReceivedEmail;
  forwardTo: string[];
  resendFrom: string;
  attachments: OutboundAttachment[];
  skippedAttachments: string[];
}): ForwardEmail {
  const { received, forwardTo, resendFrom, attachments, skippedAttachments } = params;
  const to = received.to ?? [];
  const out: ForwardEmail = {
    from: buildFrom(resendFrom, received.from),
    to: forwardTo,
    reply_to: bareAddress(received.from),
    subject: received.subject ?? "(sans objet)",
  };
  if (received.html != null) {
    out.html = bannerHtml(received.from, to, skippedAttachments) + received.html;
  }
  if (received.text != null) {
    out.text = bannerText(received.from, to, skippedAttachments) + received.text;
  }
  // Si ni html ni text, garantir un corps minimal.
  if (out.html == null && out.text == null) {
    out.text = bannerText(received.from, to, skippedAttachments) + "(message sans contenu)";
  }
  if (attachments.length > 0) out.attachments = attachments;
  return out;
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `deno test supabase/functions/forward-inbound-email/forward.test.ts`
Expected: PASS (tous les tests verts).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/forward-inbound-email/forward.ts supabase/functions/forward-inbound-email/forward.test.ts
git commit -m "feat(inbound-email): logique pure de recomposition + tests"
```

---

## Task 2: Orchestrateur HTTP (`index.ts`) + config JWT

**Files:**
- Create: `supabase/functions/forward-inbound-email/index.ts`
- Modify: `supabase/config.toml` (ajout du bloc `[functions.forward-inbound-email]`)

**Interfaces:**
- Consumes (de Task 1) : `parseForwardAddresses`, `selectAttachments`, `buildForwardEmail`, et les types `InboundAttachmentMeta`, `OutboundAttachment`, `ReceivedEmail`.
- Produces : un endpoint HTTP `POST` (le webhook). Pas d'export consommé par d'autres tasks.

- [ ] **Step 1: Écrire `index.ts`**

Créer `supabase/functions/forward-inbound-email/index.ts` :

```ts
// Webhook Resend `email.received` : redirige les mails entrants vers la/les
// adresse(s) de RESEND_EMAIL_RECEIVED_FORWARD.
//
// Resend ne livre que des métadonnées dans le webhook : on récupère le corps via
// l'API Receiving puis les pièces jointes via l'API Attachments, et on ré-émet un
// nouveau mail via l'API d'envoi depuis notre domaine vérifié.
//
// Configuration (Resend → Webhooks → ajouter un endpoint sur `email.received`) :
//   - pointer vers cette fonction,
//   - copier le "Signing Secret" dans le secret `RESEND_WEBHOOK_SECRET`.
// Déploiement : `make deploy-fn FN=forward-inbound-email`
//
// Secrets : RESEND_API_KEY (requis), RESEND_FROM, RESEND_EMAIL_RECEIVED_FORWARD,
//           RESEND_WEBHOOK_SECRET.

import { Webhook } from "npm:standardwebhooks@1.0.0";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";
import {
  buildForwardEmail,
  type InboundAttachmentMeta,
  type OutboundAttachment,
  parseForwardAddresses,
  type ReceivedEmail,
  selectAttachments,
} from "./forward.ts";

const DEFAULT_FROM = "Éphéméride <bonjour@ephemeride.link>";
const MAX_ATTACHMENTS_BYTES = 25 * 1024 * 1024; // marge sous la limite ~40 Mo (base64 +33 %)

interface InboundWebhook {
  type: string;
  data: { email_id: string };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY manquant" }), { status: 500 });
  }
  const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? DEFAULT_FROM;
  const forwardTo = parseForwardAddresses(Deno.env.get("RESEND_EMAIL_RECEIVED_FORWARD"));
  const hookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");

  const raw = await req.text();

  // Vérifie la signature Svix émise par Resend (si le secret est configuré).
  let payload: InboundWebhook;
  try {
    if (hookSecret) {
      const wh = new Webhook(hookSecret.replace(/^v1,/, ""));
      payload = wh.verify(raw, {
        "webhook-id": req.headers.get("svix-id") ?? req.headers.get("webhook-id") ?? "",
        "webhook-timestamp": req.headers.get("svix-timestamp") ?? req.headers.get("webhook-timestamp") ?? "",
        "webhook-signature": req.headers.get("svix-signature") ?? req.headers.get("webhook-signature") ?? "",
      }) as InboundWebhook;
    } else {
      console.warn("[forward-inbound-email] RESEND_WEBHOOK_SECRET non configuré : signature non vérifiée.");
      payload = JSON.parse(raw) as InboundWebhook;
    }
  } catch (err) {
    console.error("[forward-inbound-email] signature invalide :", err);
    return new Response(JSON.stringify({ error: "signature invalide" }), { status: 401 });
  }

  // On ignore proprement tout autre événement Resend.
  if (payload.type !== "email.received") {
    return new Response(JSON.stringify({ ignored: payload.type }), { status: 200 });
  }

  // Inerte tant qu'aucune adresse de redirection n'est configurée.
  if (forwardTo.length === 0) {
    console.warn("[forward-inbound-email] RESEND_EMAIL_RECEIVED_FORWARD vide : aucune redirection.");
    return new Response(JSON.stringify({ ignored: "no-forward-address" }), { status: 200 });
  }

  const emailId = payload.data.email_id;
  const authHeaders = { Authorization: `Bearer ${RESEND_API_KEY}` };

  // 1) Corps complet (HTML auto-suffisant : images inline embarquées en data URI).
  const bodyRes = await fetch(
    `https://api.resend.com/emails/receiving/${emailId}?html_format=data_uri`,
    { headers: authHeaders },
  );
  if (!bodyRes.ok) {
    console.error("[forward-inbound-email] échec récupération du mail :", bodyRes.status, await bodyRes.text());
    return new Response(JSON.stringify({ error: "récupération du mail échouée" }), { status: 500 });
  }
  const received = (await bodyRes.json()) as ReceivedEmail;

  // 2) Pièces jointes (download_url signés).
  const attRes = await fetch(
    `https://api.resend.com/emails/receiving/${emailId}/attachments`,
    { headers: authHeaders },
  );
  let metas: InboundAttachmentMeta[] = [];
  if (attRes.ok) {
    const json = (await attRes.json()) as { data?: InboundAttachmentMeta[] };
    metas = json.data ?? [];
  } else {
    console.warn("[forward-inbound-email] liste des pièces jointes indisponible :", attRes.status);
  }
  const { keep, skipped } = selectAttachments(metas, MAX_ATTACHMENTS_BYTES);

  // 3) Téléchargement + encodage base64 des pièces jointes conservées.
  const attachments: OutboundAttachment[] = [];
  for (const a of keep) {
    if (!a.download_url) {
      skipped.push(a.filename);
      continue;
    }
    const dl = await fetch(a.download_url);
    if (!dl.ok) {
      skipped.push(a.filename);
      continue;
    }
    const bytes = new Uint8Array(await dl.arrayBuffer());
    attachments.push({ filename: a.filename, content: encodeBase64(bytes), content_type: a.content_type });
  }

  // 4) Recomposition + envoi.
  const email = buildForwardEmail({
    received,
    forwardTo,
    resendFrom: RESEND_FROM,
    attachments,
    skippedAttachments: skipped,
  });
  const sendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(email),
  });
  if (!sendRes.ok) {
    console.error("[forward-inbound-email] échec d'envoi Resend :", sendRes.status, await sendRes.text());
    return new Response(JSON.stringify({ error: "échec de l'envoi" }), { status: 500 });
  }

  return new Response(JSON.stringify({ forwarded: forwardTo.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
```

- [ ] **Step 2: Vérifier que le fichier type-check sans erreur**

Run: `deno check supabase/functions/forward-inbound-email/index.ts`
Expected: aucune erreur de type (sortie vide / `Check ...`).

- [ ] **Step 3: Désactiver la vérification JWT pour cette fonction**

Modifier `supabase/config.toml` — ajouter à la fin :

```toml

# Webhook Resend `email.received` : appelé par Resend (signature Svix), pas par un
# utilisateur → pas de JWT à vérifier.
[functions.forward-inbound-email]
verify_jwt = false
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/forward-inbound-email/index.ts supabase/config.toml
git commit -m "feat(inbound-email): edge function webhook email.received"
```

---

## Task 3: Câblage configuration & secrets (`.env.example`, `Makefile`)

**Files:**
- Modify: `.env.example`
- Modify: `Makefile:46-50` (cible `supabase-secrets-email`)

**Interfaces:**
- Consumes : rien (config).
- Produces : variables d'environnement `RESEND_EMAIL_RECEIVED_FORWARD` et `RESEND_WEBHOOK_SECRET` disponibles pour la fonction une fois `make supabase-secrets-email` exécuté.

- [ ] **Step 1: Documenter les nouveaux secrets dans `.env.example`**

Dans `.env.example`, remplacer le bloc Resend existant (lignes 18-21) :

```
# Fallback e-mail (Resend) — secrets de l'Edge Function (à mettre dans .env.local
# puis `make supabase-secrets-email`). Domaine expéditeur à vérifier dans Resend.
#   RESEND_API_KEY=re_xxx
#   RESEND_FROM=Éphéméride <no-reply@ephemeride.app>
```

par :

```
# E-mail (Resend) — secrets de l'Edge Function (à mettre dans .env.local puis
# `make supabase-secrets-email`). Domaine expéditeur à vérifier dans Resend.
#   RESEND_API_KEY=re_xxx
#   RESEND_FROM=Éphéméride <no-reply@ephemeride.app>
# Redirection des mails entrants (webhook Resend email.received → ces adresses,
# séparées par des virgules). Vide = aucune redirection.
#   RESEND_EMAIL_RECEIVED_FORWARD=leny.bernard@gmail.com
# Signing secret du webhook Resend (Resend → Webhooks → endpoint email.received).
#   RESEND_WEBHOOK_SECRET=whsec_xxx
```

- [ ] **Step 2: Pousser les nouveaux secrets via le Makefile**

Dans `Makefile`, remplacer la cible `supabase-secrets-email` (lignes 44-50) :

```makefile
# Configure les secrets Resend pour le fallback e-mail (valeurs depuis .env.local).
# RESEND_FROM doit utiliser un domaine expéditeur vérifié dans Resend.
supabase-secrets-email:
	npx supabase secrets set \
		RESEND_API_KEY="$(RESEND_API_KEY)" \
		RESEND_FROM="$(RESEND_FROM)" \
		SITE_URL="$(NEXT_PUBLIC_SITE_URL)"
```

par :

```makefile
# Configure les secrets Resend (e-mails sortants + redirection des mails entrants).
# RESEND_FROM doit utiliser un domaine expéditeur vérifié dans Resend.
supabase-secrets-email:
	npx supabase secrets set \
		RESEND_API_KEY="$(RESEND_API_KEY)" \
		RESEND_FROM="$(RESEND_FROM)" \
		SITE_URL="$(NEXT_PUBLIC_SITE_URL)" \
		RESEND_EMAIL_RECEIVED_FORWARD="$(RESEND_EMAIL_RECEIVED_FORWARD)" \
		RESEND_WEBHOOK_SECRET="$(RESEND_WEBHOOK_SECRET)"
```

- [ ] **Step 3: Vérifier que le Makefile parse toujours**

Run: `make -n supabase-secrets-email`
Expected: affiche la commande `npx supabase secrets set ...` avec les cinq variables (les valeurs vides si absentes de `.env.local`), sans erreur de syntaxe Make.

- [ ] **Step 4: Commit**

```bash
git add .env.example Makefile
git commit -m "chore(inbound-email): secrets redirection mails entrants Resend"
```

---

## Task 4: Déploiement & configuration Resend (manuel)

**Files:** aucun (étape opérationnelle).

**Interfaces:**
- Consumes : la fonction et les secrets des tasks précédentes.
- Produces : webhook `email.received` actif côté Resend, fonction déployée.

- [ ] **Step 1: Renseigner les valeurs dans `.env.local`**

Ajouter dans `.env.local` (non versionné) :

```
RESEND_EMAIL_RECEIVED_FORWARD=leny.bernard@gmail.com
RESEND_WEBHOOK_SECRET=
```

(`RESEND_WEBHOOK_SECRET` sera rempli au Step 4, après création du webhook côté Resend.)

- [ ] **Step 2: Déployer la fonction**

Run: `make deploy-fn FN=forward-inbound-email`
Expected: déploiement réussi ; noter l'URL `https://<project-ref>.supabase.co/functions/v1/forward-inbound-email`.

- [ ] **Step 3: Créer le webhook côté Resend**

Dans le dashboard Resend → Webhooks → Add Endpoint :
- URL : l'URL de la fonction (Step 2).
- Événement : `email.received`.
- Copier le **Signing Secret** affiché (format `whsec_...`).

- [ ] **Step 4: Renseigner le secret et pousser la config**

Coller le Signing Secret dans `.env.local` (`RESEND_WEBHOOK_SECRET=whsec_...`), puis :

Run: `make supabase-secrets-email`
Expected: `npx supabase secrets set` confirme la mise à jour des secrets.

- [ ] **Step 5: Test de bout en bout**

Envoyer un mail (avec une pièce jointe) à une adresse du domaine inbound Resend.
Expected : réception du mail redirigé sur `leny.bernard@gmail.com`, avec le bandeau « Redirigé via Éphéméride », le sujet d'origine, le corps, la pièce jointe, et un `reply_to` pointant vers l'expéditeur d'origine. En cas d'échec, consulter les logs : `npx supabase functions logs forward-inbound-email`.

---

## Self-Review

- **Couverture spec :** Edge Function (Task 2) ✓ ; signature Svix (Task 2) ✓ ; filtre `email.received` (Task 2) ✓ ; garde de config (Task 2) ✓ ; recomposition from/to/reply_to/subject/bandeau (Task 1) ✓ ; pièces jointes complètes + budget taille (Tasks 1+2) ✓ ; échec d'envoi → 500 (Task 2) ✓ ; `.env.example` + Makefile (Task 3) ✓ ; déploiement + webhook Resend (Task 4) ✓ ; tests unitaires (Task 1) ✓. Le point « à confirmer » de la spec (format payload + livraison des PJ) est désormais résolu et figé dans les contraintes globales.
- **Placeholders :** aucun TODO/TBD ; tout le code est complet.
- **Cohérence des types :** `InboundAttachmentMeta`, `ReceivedEmail`, `OutboundAttachment`, `ForwardEmail` définis en Task 1 et consommés tels quels en Task 2 ; signatures `parseForwardAddresses`/`selectAttachments`/`buildForwardEmail` identiques entre définition et usage.
