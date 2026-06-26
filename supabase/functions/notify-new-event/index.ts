// Edge Function : alerte « nouvel événement » destinée aux personnes abonnées à
// la commune de l'événement (location_city) et/ou à son organisation. Déclenchée
// par l'admin lors du passage d'un événement en statut « accepted ». Envoie un
// push, insère une notification persistante (Notification Tray) et e-maile en
// secours les personnes non atteintes.
//
// Réutilise les mêmes secrets que `send-event-notification` (VAPID, RESEND, SITE_URL).

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  cityKey,
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
  let body: { eventId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "corps JSON invalide" }, 400);
  }
  const { eventId } = body;
  if (!eventId) return json({ error: "eventId requis" }, 400);

  const admin = createAdminClient();

  // 3) Charge l'événement + contrôle des droits (identique à send-event-notification).
  const { data: event, error: eventError } = await admin
    .from("events")
    .select("id, name, organization_id, location_city, status, emoji")
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

  // 4) Garde : on ne notifie que pour un événement publié.
  if (event.status !== "accepted") {
    return json({ sent: 0, failed: 0, emailed: 0, notified: 0, skipped: "not_accepted" });
  }

  // 5) Audience. On choisit un seul canal par utilisateur (priorité organisation).
  const channelByUser = new Map<string, "city" | "organization">();

  // 5a) Abonnés à la commune (matching normalisé des deux côtés).
  if (event.location_city) {
    const targetKey = cityKey(event.location_city);
    const { data: citySubs } = await admin
      .from("city_subscriptions")
      .select("user_id, city");
    for (const row of (citySubs ?? []) as { user_id: string; city: string }[]) {
      if (cityKey(row.city) === targetKey) channelByUser.set(row.user_id, "city");
    }
  }

  // 5b) Abonnés à l'organisation (écrase « city » → priorité organisation).
  if (event.organization_id) {
    const { data: orgSubs } = await admin
      .from("organization_subscriptions")
      .select("user_id")
      .eq("organization_id", event.organization_id);
    for (const row of (orgSubs ?? []) as { user_id: string }[]) {
      channelByUser.set(row.user_id, "organization");
    }
  }

  if (channelByUser.size === 0) return json({ sent: 0, failed: 0, emailed: 0, notified: 0 });

  // 6) Filtre par préférences (canal correspondant). Absence de ligne = activé.
  const candidateIds = [...channelByUser.keys()];
  const prefs = await loadPreferences(admin, candidateIds);
  const userIds = candidateIds.filter((id) => {
    const channel = channelByUser.get(id);
    const p = prefs.get(id);
    if (!p) return true;
    return channel === "organization" ? p.notify_organizations !== false : p.notify_cities !== false;
  });
  if (userIds.length === 0) return json({ sent: 0, failed: 0, emailed: 0, notified: 0 });

  const eventPath = `/evenement/${eventSlug(event.id, event.name)}`;

  // 7) Notifications persistantes (Notification Tray).
  const rows: NotificationRow[] = userIds.map((uid) => {
    const channel = channelByUser.get(uid)!;
    const body =
      channel === "organization"
        ? `Nouvel événement d'un·e organisateur·ice que vous suivez.`
        : `Nouvel événement à ${event.location_city}.`;
    return {
      user_id: uid,
      type: channel,
      title: event.name,
      body,
      url: eventPath,
      event_id: event.id,
      icon: event.emoji ?? null,
      organization_id: channel === "organization" ? event.organization_id : null,
      target_city: channel === "city" ? event.location_city : null,
    };
  });
  const notified = await insertNotifications(admin, rows);

  // 8) Push (tag distinct de send-event-notification pour ne pas écraser une MAJ).
  const push = await sendPushToUsers(admin, userIds, {
    title: event.name,
    body: event.location_city ? `Nouvel événement à ${event.location_city}` : "Nouvel événement",
    url: eventPath,
    tag: `event-new-${eventId}`,
  });

  // Push délivré = notification « vue » ; les non-atteints restent en non-lu.
  await markNotificationsRead(admin, event.id, [...push.reachedUsers]);

  // 9) Fallback e-mail pour les non-atteints.
  const unreached = userIds.filter((id) => !push.reachedUsers.has(id));
  const eventUrl = `${siteUrl()}${eventPath}`;
  const html =
    `<div style="font-family:system-ui,sans-serif;font-size:15px;color:#1B263B;line-height:1.5">` +
    `<p>Un nouvel événement vient d'être publié : <strong>${escapeHtml(event.name)}</strong>` +
    (event.location_city ? ` à ${escapeHtml(event.location_city)}` : "") +
    `.</p>` +
    `<p><a href="${eventUrl}" style="color:#1B263B">Voir l'événement →</a></p>` +
    `<hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>` +
    `<p style="font-size:12px;color:#888">Vous recevez cet e-mail car vous suivez cette commune ou cet·te organisateur·ice sur Éphéméride.</p>` +
    `</div>`;
  const emailed = await sendEmailFallback(admin, unreached, {
    subject: `Nouvel événement : ${event.name}`,
    html,
  });

  return json({ sent: push.sent, failed: push.failed, emailed, notified, cleaned: push.cleaned });
});
