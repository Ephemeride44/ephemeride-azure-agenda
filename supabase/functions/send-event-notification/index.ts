// Edge Function : envoie une notification Web Push à toutes les personnes ayant
// mis un événement en favori. Déclenchée par l'admin depuis EventForm quand il
// coche « Envoyer la notif ». Vérifie que l'appelant est admin de l'événement.
// Double le push d'une notification persistante (Notification Tray) et d'un
// fallback e-mail pour les personnes non atteintes.
//
// Secrets requis (supabase secrets set ...) :
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (ex: mailto:leny@communo.app)
// Variables injectées automatiquement : SUPABASE_URL, SUPABASE_ANON_KEY,
//   SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  corsHeaders,
  createAdminClient,
  escapeHtml,
  eventSlug,
  insertNotifications,
  json,
  loadPreferences,
  markNotificationsRead,
  type NotificationRow,
  sendEmailFallback,
  sendPushToUsers,
  siteUrl,
} from "../_shared/push.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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

  const admin = createAdminClient();

  // 3) Vérifie que l'appelant est admin de l'événement.
  const { data: event, error: eventError } = await admin
    .from("events")
    .select("id, name, organization_id, emoji")
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

  // 4) Destinataires : personnes ayant mis l'événement en favori.
  const { data: bookmarks } = await admin
    .from("bookmarks")
    .select("user_id")
    .eq("event_id", eventId);
  const allUserIds = [...new Set((bookmarks ?? []).map((b: { user_id: string }) => b.user_id))];
  if (allUserIds.length === 0) return json({ sent: 0, failed: 0, emailed: 0, notified: 0 });

  // Respect des préférences : exclure ceux qui ont désactivé le canal favoris.
  const prefs = await loadPreferences(admin, allUserIds);
  const userIds = allUserIds.filter((id) => prefs.get(id)?.notify_bookmarks !== false);
  if (userIds.length === 0) return json({ sent: 0, failed: 0, emailed: 0, notified: 0 });

  const eventPath = `/evenement/${eventSlug(event.id, event.name)}`;
  const trimmed = message.trim();

  // 5) Notification persistante (Notification Tray) — indépendante du push.
  const rows: NotificationRow[] = userIds.map((uid) => ({
    user_id: uid,
    type: "bookmark",
    title: event.name,
    body: trimmed,
    url: eventPath,
    event_id: event.id,
    icon: event.emoji ?? null,
  }));
  const notified = await insertNotifications(admin, rows);

  // 6) Push.
  const push = await sendPushToUsers(admin, userIds, {
    title: event.name,
    body: trimmed,
    url: eventPath,
    tag: `event-${eventId}`,
  });

  // Push délivré = notification « vue » ; les non-atteints restent en non-lu.
  await markNotificationsRead(admin, event.id, [...push.reachedUsers]);

  // 7) Fallback e-mail (Resend) pour les personnes non atteintes par le push.
  const unreached = userIds.filter((id) => !push.reachedUsers.has(id));
  const eventUrl = `${siteUrl()}${eventPath}`;
  const safeMessage = escapeHtml(trimmed);
  const html =
    `<div style="font-family:system-ui,sans-serif;font-size:15px;color:#1B263B;line-height:1.5">` +
    `<p>${safeMessage}</p>` +
    `<p><a href="${eventUrl}" style="color:#1B263B">Voir l'événement →</a></p>` +
    `<hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>` +
    `<p style="font-size:12px;color:#888">Vous recevez cet e-mail car vous avez mis cet événement en favori sur Éphéméride.</p>` +
    `</div>`;
  const emailed = await sendEmailFallback(admin, unreached, {
    subject: `${event.name} — mise à jour`,
    html,
  });

  return json({ sent: push.sent, failed: push.failed, emailed, notified, cleaned: push.cleaned });
});
