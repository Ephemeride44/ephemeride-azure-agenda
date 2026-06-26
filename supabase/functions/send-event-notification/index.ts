// Edge Function : envoie une notification Web Push à toutes les personnes ayant
// mis un événement en favori. Déclenchée par l'admin depuis EventForm quand il
// coche « Envoyer la notif ». Vérifie que l'appelant est admin de l'événement.
//
// Secrets requis (supabase secrets set ...) :
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (ex: mailto:leny@communo.app)
// Variables injectées automatiquement : SUPABASE_URL, SUPABASE_ANON_KEY,
//   SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Réplique de slugify/eventSlug du front (src/lib/utils.ts) pour l'URL canonique.
function slugify(text: string): string {
  return (text || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function eventSlug(id: string, name: string): string {
  const base = slugify(name).slice(0, 80).replace(/-+$/, "");
  return base ? `${base}-${id}` : id;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
  const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
  const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:contact@ephemeride.app";

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return json({ error: "VAPID keys non configurées" }, 500);
  }

  // 1) Authentification de l'appelant.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "non authentifié" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "non authentifié" }, 401);

  // 2) Lecture de la requête.
  let body: { eventId?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "corps JSON invalide" }, 400);
  }
  const { eventId, message } = body;
  if (!eventId || !message?.trim()) {
    return json({ error: "eventId et message requis" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 3) Vérifie que l'appelant est admin de l'événement.
  const { data: event, error: eventError } = await admin
    .from("events")
    .select("id, name, organization_id")
    .eq("id", eventId)
    .single();
  if (eventError || !event) return json({ error: "événement introuvable" }, 404);

  const { data: isSuper } = await admin.rpc("is_super_admin", { user_uuid: user.id });
  let allowed = isSuper === true;
  if (!allowed && event.organization_id) {
    const { data: isOrgAdmin } = await admin.rpc("is_organization_admin", {
      user_uuid: user.id,
      org_uuid: event.organization_id,
    });
    allowed = isOrgAdmin === true;
  }
  if (!allowed) return json({ error: "accès refusé" }, 403);

  // 4) Destinataires : abonnements push des personnes ayant mis l'événement en favori.
  const { data: bookmarks } = await admin
    .from("bookmarks")
    .select("user_id")
    .eq("event_id", eventId);
  const userIds = [...new Set((bookmarks ?? []).map((b: { user_id: string }) => b.user_id))];
  if (userIds.length === 0) return json({ sent: 0, failed: 0, emailed: 0 });

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  const eventPath = `/evenement/${eventSlug(event.id, event.name)}`;

  // 5) Envoi du push. On note quels utilisateurs sont effectivement atteints
  // (au moins un abonnement délivré) pour pouvoir e-mailer les autres.
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  const payload = JSON.stringify({
    title: event.name,
    body: message.trim(),
    url: eventPath,
    tag: `event-${eventId}`,
  });

  let sent = 0;
  let failed = 0;
  const staleIds: string[] = [];
  const reachedUsers = new Set<string>();

  await Promise.all(
    (subs ?? []).map(
      async (s: { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
          sent++;
          reachedUsers.add(s.user_id);
        } catch (err) {
          failed++;
          const statusCode = (err as { statusCode?: number }).statusCode;
          // 404/410 = abonnement périmé → on le supprime.
          if (statusCode === 404 || statusCode === 410) staleIds.push(s.id);
        }
      },
    ),
  );

  if (staleIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", staleIds);
  }

  // 6) Fallback e-mail (Resend) pour les personnes ayant mis l'événement en
  // favori mais NON atteintes par le push (aucun abonnement, ou tous en échec).
  let emailed = 0;
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "Éphéméride <onboarding@resend.dev>";
  const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://ephemeride.app").replace(/\/$/, "");
  const unreached = userIds.filter((id) => !reachedUsers.has(id));

  if (RESEND_API_KEY && unreached.length > 0) {
    const eventUrl = `${SITE_URL}${eventPath}`;
    const safeMessage = escapeHtml(message.trim());
    const html =
      `<div style="font-family:system-ui,sans-serif;font-size:15px;color:#1B263B;line-height:1.5">` +
      `<p>${safeMessage}</p>` +
      `<p><a href="${eventUrl}" style="color:#1B263B">Voir l'événement →</a></p>` +
      `<hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>` +
      `<p style="font-size:12px;color:#888">Vous recevez cet e-mail car vous avez mis cet événement en favori sur Éphéméride.</p>` +
      `</div>`;

    await Promise.all(
      unreached.map(async (uid) => {
        try {
          const { data: u } = await admin.auth.admin.getUserById(uid);
          const to = u?.user?.email;
          if (!to) return;
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: RESEND_FROM,
              to,
              subject: `${event.name} — mise à jour`,
              html,
            }),
          });
          if (res.ok) emailed++;
        } catch (_err) {
          /* e-mail non bloquant */
        }
      }),
    );
  }

  return json({ sent, failed, emailed, cleaned: staleIds.length });
});
