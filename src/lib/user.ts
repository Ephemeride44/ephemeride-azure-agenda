// Helpers d'affichage du compte utilisateur (Supabase auth user).

type MaybeUser =
  | {
      email?: string | null;
      user_metadata?: {
        full_name?: string | null;
        name?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        avatar_url?: string | null;
      } | null;
    }
  | null
  | undefined;

export function getDisplayName(user: MaybeUser): string {
  const meta = user?.user_metadata ?? undefined;
  return (
    meta?.full_name ||
    meta?.name ||
    [meta?.first_name, meta?.last_name].filter(Boolean).join(" ") ||
    user?.email?.split("@")[0] ||
    "Mon compte"
  );
}

export function getFirstName(user: MaybeUser): string {
  const meta = user?.user_metadata ?? undefined;
  if (meta?.first_name) return meta.first_name;
  const full = meta?.full_name || meta?.name;
  if (full) return full.split(" ")[0];
  return user?.email?.split("@")[0] || "";
}

export function getAvatarUrl(user: MaybeUser): string | null {
  return user?.user_metadata?.avatar_url ?? null;
}

// Initiales (max 2 lettres) à partir d'un nom libre.
export function getInitials(name: string): string {
  const parts = (name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
