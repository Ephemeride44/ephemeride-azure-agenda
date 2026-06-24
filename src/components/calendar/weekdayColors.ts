/**
 * Constantes propres à la grille calendrier « Constellation ».
 * La palette de couleurs par jour et l'accent vivent dans `src/lib/colors.ts`
 * (source unique) et sont ré-exportés ici pour la commodité des composants
 * calendrier.
 */
export { ACCENT, WEEKDAY_HEX, weekdayColor } from "@/lib/colors";

/**
 * Ordre des colonnes du calendrier : semaine commençant le lundi.
 * Valeurs = `Date.getDay()`.
 */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** Lettre courte par jour (en-têtes mobile). */
export const WEEKDAY_LETTER: Record<number, string> = {
  1: "L",
  2: "M",
  3: "M",
  4: "J",
  5: "V",
  6: "S",
  0: "D",
};

/** Libellé court 3 lettres par jour (en-têtes desktop). */
export const WEEKDAY_SHORT: Record<number, string> = {
  1: "lun",
  2: "mar",
  3: "mer",
  4: "jeu",
  5: "ven",
  6: "sam",
  0: "dim",
};

/** Convertit un `getDay()` (lundi=1) en offset de colonne (lundi=0). */
export function mondayOffset(getDay: number): number {
  return (getDay + 6) % 7;
}
