// Edge Function : suppression définitive du compte de l'utilisateur appelant.
// La suppression d'un utilisateur auth nécessite la clé service_role (impossible
// côté navigateur). On authentifie l'appelant via son JWT, puis on supprime son
// propre compte. Les données liées (favoris, abonnements, préférences,
// notifications, push) disparaissent en cascade (FK on delete cascade).

import { createClient } from "npm:@supabase/supabase-js@2";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // 1) Authentifie l'appelant via son JWT.
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

  // 2) Supprime le compte avec la clé service_role.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Nettoyage best-effort de l'avatar stocké (le bucket est rangé sous `${id}/`).
  try {
    const { data: files } = await admin.storage.from("avatars").list(user.id);
    if (files && files.length > 0) {
      await admin.storage.from("avatars").remove(files.map((f) => `${user.id}/${f.name}`));
    }
  } catch (_err) {
    /* nettoyage non bloquant */
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("[delete-account]", deleteError.message);
    return json({ error: deleteError.message }, 500);
  }

  return json({ success: true });
});
