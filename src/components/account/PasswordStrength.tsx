import { cn } from "@/lib/utils";

// Score de robustesse 0–4 : longueur, casses mixtes, chiffre, caractère spécial.
export function passwordScore(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const LABELS = ["", "Faible", "Moyen", "Bon", "Excellent"];
const BAR_COLOR = ["bg-muted", "bg-red-500", "bg-orange-500", "bg-emerald-500", "bg-emerald-500"];

/** Jauge de robustesse du mot de passe (4 barres + libellé). */
export const PasswordStrength = ({ password }: { password: string }) => {
  const score = passwordScore(password);
  if (!password) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn("h-1 flex-1 rounded-full transition-colors", i <= score ? BAR_COLOR[score] : "bg-muted")}
          />
        ))}
      </div>
      <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">{LABELS[score]}</span>
    </div>
  );
};

export default PasswordStrength;
