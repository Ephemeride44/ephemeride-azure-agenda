import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

/**
 * Configuration du widget de soutien Tipeee, stockée dans la table
 * `site_settings` sous la clé `tipeee` (colonne `value` en JSON).
 */
export type TipeeeMode = "button" | "embed";

export interface TipeeeSettings {
  /** Affiche ou non le widget sur le front */
  enabled: boolean;
  /** URL de la page / du widget Tipeee */
  url: string;
  /** Bouton flottant maison ou widget embarqué (iframe) */
  mode: TipeeeMode;
}

export const TIPEEE_SETTINGS_KEY = "tipeee";

export const DEFAULT_TIPEEE_SETTINGS: TipeeeSettings = {
  enabled: false,
  url: "",
  mode: "button",
};

/** Normalise une valeur JSON inconnue en TipeeeSettings sûr. */
export function parseTipeeeSettings(value: unknown): TipeeeSettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_TIPEEE_SETTINGS };
  const v = value as Record<string, unknown>;
  return {
    enabled: typeof v.enabled === "boolean" ? v.enabled : DEFAULT_TIPEEE_SETTINGS.enabled,
    url: typeof v.url === "string" ? v.url : DEFAULT_TIPEEE_SETTINGS.url,
    mode: v.mode === "embed" ? "embed" : "button",
  };
}

/** Récupère la config Tipeee (renvoie les valeurs par défaut si absente). */
export async function fetchTipeeeSettings(): Promise<TipeeeSettings> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", TIPEEE_SETTINGS_KEY)
    .maybeSingle();
  if (error) throw error;
  return parseTipeeeSettings(data?.value);
}

/** Enregistre la config Tipeee (réservé aux super admins via RLS). */
export async function saveTipeeeSettings(settings: TipeeeSettings): Promise<void> {
  const { error } = await supabase
    .from("site_settings")
    .upsert(
      { key: TIPEEE_SETTINGS_KEY, value: settings as unknown as Json, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  if (error) throw error;
}
