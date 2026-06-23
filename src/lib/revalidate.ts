import { supabase } from "@/integrations/supabase/client";

/**
 * Déclenche la revalidation ISR des pages publiques après une mutation admin.
 * À appeler côté client après un create/update/delete d'événement réussi.
 * Best-effort : les erreurs sont seulement loguées (le fallback temporel ISR
 * rattrape de toute façon).
 */
export async function triggerRevalidate(payload?: {
  slug?: string;
  department?: string;
}): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    await fetch("/api/revalidate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify(payload ?? {}),
    });
  } catch (error) {
    console.error("[revalidate] échec du déclenchement:", error);
  }
}
