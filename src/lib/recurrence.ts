import { daysOfWeek, monthNames } from "@/lib/utils";

/**
 * Règle de récurrence hebdomadaire.
 * Les jours sont exprimés au format JS `getDay()` : 0 = dimanche … 6 = samedi.
 */
export type RecurrenceRule = {
  interval: number; // toutes les X semaines (>= 1)
  weekdays: number[]; // 0..6 (getDay)
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime: string; // ex "16h30" (sert à construire le datetime français)
};

/**
 * Champs partagés par toutes les occurrences d'une récurrence.
 * Ce sont les champs d'un événement hors `datetime`/`date` (calculés par occurrence).
 */
export type RecurringSharedFields = {
  name: string;
  end_time?: string | null;
  location_place?: string | null;
  location_city?: string | null;
  location_department?: string | null;
  price?: string | null;
  audience?: string | null;
  emoji?: string | null;
  url?: string | null;
  ticketing_url?: string | null;
  theme_id?: string | null;
  cover_url?: string | null;
  organization_id?: string | null;
};

/**
 * Parse une date ISO `YYYY-MM-DD` en `Date` locale (midi pour éviter tout
 * décalage de fuseau horaire). On n'utilise jamais `new Date(iso)` directement
 * car il interpréterait la chaîne en UTC.
 */
function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split("-").map((part) => parseInt(part, 10));
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

/** Formate une `Date` locale en `YYYY-MM-DD`. */
function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Construit le datetime français attendu par l'app, ex :
 * "mercredi 21 mai 2025 à 16h30". L'heure y est incluse au format `16h30`
 * (cf. `formatTimeDisplay` dans utils.ts qui l'extrait par regex `\d{1,2}h\d{2}`).
 */
export function buildDatetimeString(dateISO: string, startTime: string): string {
  const d = parseISODate(dateISO);
  const dayName = daysOfWeek[d.getDay()];
  const dayNumber = d.getDate();
  const monthName = monthNames[d.getMonth()];
  const year = d.getFullYear();
  const time = startTime?.trim();
  const base = `${dayName} ${dayNumber} ${monthName} ${year}`;
  return time ? `${base} à ${time}` : base;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Calcule la liste triée des dates ISO des occurrences d'une récurrence
 * hebdomadaire dans l'intervalle [startDate, endDate], pour les jours
 * sélectionnés et en ne retenant qu'une semaine sur `interval`.
 *
 * Les "semaines" sont des tranches de 7 jours comptées **à partir de la date de
 * début** (et non du lundi calendaire) : c'est le comportement le plus intuitif
 * — « toutes les 2 semaines à partir du 1er juin » inclut bien la première
 * occurrence dans la semaine du 1er juin.
 */
export function computeOccurrenceDates(rule: RecurrenceRule): string[] {
  const { interval, weekdays, startDate, endDate } = rule;
  if (!startDate || !endDate || !weekdays?.length) return [];

  const start = parseISODate(startDate);
  const end = parseISODate(endDate);
  if (end < start) return [];

  const step = Math.max(1, Math.floor(interval) || 1);
  const weekdaySet = new Set(weekdays);

  const dates: string[] = [];
  const cursor = new Date(start);
  // Borne de sécurité large pour éviter toute boucle infinie.
  for (let safety = 0; safety < 4000 && cursor <= end; safety++) {
    if (weekdaySet.has(cursor.getDay())) {
      // Tranche de 7 jours depuis la date de début ; on ne garde qu'une
      // tranche sur `step`.
      const weekIndex = Math.floor((cursor.getTime() - start.getTime()) / MS_PER_DAY / 7);
      if (weekIndex % step === 0) {
        dates.push(toISODate(cursor));
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

/**
 * Combine une règle de récurrence et les champs partagés en un tableau d'objets
 * prêts à insérer dans la table `events` (chacun avec son `date` et son `datetime`).
 * Les champs sont retournés tels quels ; la normalisation (ville/prix) et les
 * métadonnées (status, recurrence_id, updated_at) sont ajoutées par l'appelant.
 */
export function buildRecurringEvents(
  rule: RecurrenceRule,
  shared: RecurringSharedFields,
) {
  const dates = computeOccurrenceDates(rule);
  return dates.map((date) => ({
    ...shared,
    date,
    datetime: buildDatetimeString(date, rule.startTime),
  }));
}
