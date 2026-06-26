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
// Budget sur octets BRUTS. Marge sous la limite ~40 Mo de Resend : le base64 gonfle d'environ 33 % et les images inline (data-URI) embarquées dans le HTML ne sont pas comptées ici.
const MAX_ATTACHMENTS_BYTES = 20 * 1024 * 1024;

interface InboundWebhook {
  type: string;
  data?: { email_id?: string };
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

  const emailId = payload.data?.email_id;
  if (!emailId) {
    console.error("[forward-inbound-email] payload email.received sans email_id :", raw.slice(0, 500));
    return new Response(JSON.stringify({ error: "email_id manquant" }), { status: 400 });
  }
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
