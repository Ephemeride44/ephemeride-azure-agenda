// Helpers partagés entre les Edge Functions de notification
// (`send-event-notification`, `notify-new-event`).
//
// Secrets attendus dans l'environnement de la fonction :
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (push)
//   RESEND_API_KEY, RESEND_FROM, SITE_URL (fallback e-mail, optionnel)

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Réplique de slugify/eventSlug du front (src/lib/utils.ts) pour l'URL canonique.
export function slugify(text: string): string {
  return (text || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function eventSlug(id: string, name: string): string {
  const base = slugify(name).slice(0, 80).replace(/-+$/, "");
  return base ? `${base}-${id}` : id;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Clé canonique d'une commune pour fiabiliser le matching ville (texte libre).
export function cityKey(city: string): string {
  return slugify(city);
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

export interface PushResult {
  sent: number;
  failed: number;
  reachedUsers: Set<string>;
  cleaned: number;
}

// Envoie un push Web Push à tous les abonnements des utilisateurs donnés.
// Configure VAPID, envoie en parallèle, supprime les abonnements périmés (404/410).
export async function sendPushToUsers(
  admin: SupabaseClient,
  userIds: string[],
  payload: PushPayload,
): Promise<PushResult> {
  const result: PushResult = { sent: 0, failed: 0, reachedUsers: new Set(), cleaned: 0 };
  if (userIds.length === 0) return result;

  const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
  const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
  const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:contact@ephemeride.app";
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error("VAPID keys non configurées");
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  const serialized = JSON.stringify(payload);
  const staleIds: string[] = [];

  await Promise.all(
    (subs ?? []).map(
      async (s: { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            serialized,
          );
          result.sent++;
          result.reachedUsers.add(s.user_id);
        } catch (err) {
          result.failed++;
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) staleIds.push(s.id);
        }
      },
    ),
  );

  if (staleIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", staleIds);
    result.cleaned = staleIds.length;
  }

  return result;
}

export interface NotificationRow {
  user_id: string;
  type: "bookmark" | "city" | "organization";
  title: string;
  body: string;
  url?: string | null;
  event_id?: string | null;
  icon?: string | null;
  // Contexte de navigation du Notification Tray (selon le type).
  organization_id?: string | null;
  target_city?: string | null;
}

// Insère un lot de notifications persistantes (Notification Tray), en ignorant
// les doublons grâce à l'index unique (user_id, event_id, type).
export async function insertNotifications(
  admin: SupabaseClient,
  rows: NotificationRow[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const { error, count } = await admin
    .from("notifications")
    .upsert(rows, { onConflict: "user_id,event_id,type", ignoreDuplicates: true, count: "exact" });
  if (error) {
    console.error("[push] insertNotifications:", error.message, error);
    return 0;
  }
  return count ?? rows.length;
}

// Marque comme lues les notifications d'un événement pour les utilisateurs
// effectivement atteints par le push (le push joue le rôle de « vu »). Les
// utilisateurs non atteints gardent leur notification en non-lu.
export async function markNotificationsRead(
  admin: SupabaseClient,
  eventId: string,
  userIds: string[],
): Promise<void> {
  if (userIds.length === 0) return;
  const { error } = await admin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .in("user_id", userIds)
    .is("read_at", null);
  if (error) console.error("[push] markNotificationsRead:", error.message);
}

// Fallback e-mail (Resend) pour les utilisateurs non atteints par le push.
export async function sendEmailFallback(
  admin: SupabaseClient,
  userIds: string[],
  email: { subject: string; html: string },
): Promise<number> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "Éphéméride <onboarding@resend.dev>";
  if (!RESEND_API_KEY || userIds.length === 0) return 0;

  let emailed = 0;
  await Promise.all(
    userIds.map(async (uid) => {
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
          body: JSON.stringify({ from: RESEND_FROM, to, subject: email.subject, html: email.html }),
        });
        if (res.ok) emailed++;
      } catch (_err) {
        /* e-mail non bloquant */
      }
    }),
  );
  return emailed;
}

export function siteUrl(): string {
  return (Deno.env.get("SITE_URL") ?? "https://ephemeride.app").replace(/\/$/, "");
}

// Charge les préférences de notification d'un lot d'utilisateurs (clé service_role).
// Renvoie une Map ; l'absence de ligne signifie « tout activé » (gérée par l'appelant).
export async function loadPreferences(
  admin: SupabaseClient,
  userIds: string[],
): Promise<Map<string, { notify_bookmarks: boolean; notify_cities: boolean; notify_organizations: boolean }>> {
  const map = new Map<string, { notify_bookmarks: boolean; notify_cities: boolean; notify_organizations: boolean }>();
  if (userIds.length === 0) return map;
  const { data } = await admin
    .from("notification_preferences")
    .select("user_id, notify_bookmarks, notify_cities, notify_organizations")
    .in("user_id", userIds);
  for (const row of data ?? []) {
    map.set((row as { user_id: string }).user_id, row as never);
  }
  return map;
}

// Petit utilitaire pour créer le client service_role.
export function createAdminClient(): SupabaseClient {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}

export type { SupabaseClient };
