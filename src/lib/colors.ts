/**
 * Couleurs partagées de l'app.
 *
 * `WEEKDAY_HEX` est la source unique de la palette « une teinte par jour de la
 * semaine » (index = `Date.getDay()`, 0 = dimanche … 6 = samedi), utilisée en
 * style inline (bulles du calendrier, dégradés). La même palette existe sous
 * forme de classes Tailwind dans `getDateBlockColor` (src/lib/utils.ts) : ces
 * classes DOIVENT rester des littéraux statiques pour être extraites par
 * Tailwind, on ne peut donc pas les dériver dynamiquement d'ici — garder les
 * deux en phase si la palette change.
 */
export const WEEKDAY_HEX: Record<number, string> = {
  0: "#D4A5A5", // dimanche — rose terreux
  1: "#8B9DC3", // lundi — bleu ardoise doux
  2: "#D4A574", // mardi — jaune ocre pastel
  3: "#9CAF88", // mercredi — vert sauge
  4: "#A8B5C8", // jeudi — bleu gris doux
  5: "#C89B7B", // vendredi — brique doux
  6: "#B8A9D9", // samedi — lavande désaturée
};

/** Couleur de la bulle pour une date ou un index de jour. */
export function weekdayColor(day: Date | number): string {
  const index = typeof day === "number" ? day : day.getDay();
  return WEEKDAY_HEX[index] ?? "#9aa0ab";
}

/** Couleur d'accent de marque (pêche), ex. anneau « aujourd'hui ». */
export const ACCENT = "#ED9873";

/** Convertit un hex (#rrggbb) en chaîne rgba avec alpha. */
export function hexA(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
