import { daysOfWeek, formatFrTime, getEventEnd, getEventStart } from "@/lib/utils";

/**
 * Règle de récurrence hebdomadaire.
 * Les jours sont exprimés au format JS `getDay()` : 0 = dimanche … 6 = samedi.
 */
export type RecurrenceRule = {
  interval: number; // toutes les X semaines (>= 1)
  weekdays: number[]; // 0..6 (getDay)
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime: string; // "HH:MM" (heure de début, sert à construire start_at)
  endTime?: string; // "HH:MM" (heure de fin optionnelle, sert à construire end_at)
};

/**
 * Champs partagés par toutes les occurrences d'une récurrence.
 * Ce sont les champs d'un événement hors horaire (start_at/end_at, calculés
 * par occurrence à partir de la règle).
 */
export type RecurringSharedFields = {
  name: string;
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
  is_full?: boolean;
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

// Ordre d'affichage des jours (lundi → dimanche), exprimé en valeurs getDay().
const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * Produit une description lisible d'une récurrence, ex :
 * « Se répète toutes les 2 semaines, le mercredi et jeudi, de 18h à 22h ».
 * Les horaires sont optionnels (extraits de l'événement, pas de la règle).
 */
export function describeRecurrence(
  rule: { interval: number; weekdays: number[] },
  opts?: { startTime?: string | null; endTime?: string | null; withPrefix?: boolean },
): string {
  const parts: string[] = [];

  // Rythme
  const interval = Math.max(1, Math.floor(rule.interval) || 1);
  parts.push(interval === 1 ? "toutes les semaines" : `toutes les ${interval} semaines`);

  // Jours (triés dans l'ordre de la semaine)
  const days = WEEKDAY_DISPLAY_ORDER
    .filter((d) => rule.weekdays?.includes(d))
    .map((d) => daysOfWeek[d]);
  if (days.length === 1) {
    parts.push(`le ${days[0]}`);
  } else if (days.length > 1) {
    const last = days[days.length - 1];
    parts.push(`le ${days.slice(0, -1).join(", ")} et ${last}`);
  }

  // Horaires
  const start = opts?.startTime?.trim();
  const end = opts?.endTime?.trim();
  if (start && end) {
    parts.push(`de ${start} à ${end}`);
  } else if (start) {
    parts.push(`à ${start}`);
  }

  const sentence = parts.join(", ");
  if (opts?.withPrefix === false) {
    // Sans préfixe : on capitalise la première lettre (« Toutes les… »).
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
  }
  return `Se répète ${sentence}`;
}

/**
 * Décrit la récurrence d'un événement à partir de la règle jointe et de ses
 * horaires (lus depuis `start_at`/`end_at`). Retourne null si l'événement n'est
 * pas récurrent.
 */
export function describeRecurrenceFromEvent(
  event: {
    start_at?: string | null;
    end_at?: string | null;
    recurrence?: { interval: number; weekdays: number[] } | null;
  },
  opts?: { includeTime?: boolean; withPrefix?: boolean },
): string | null {
  if (!event.recurrence) return null;
  // Côté front, l'horaire est déjà affiché ailleurs : on peut l'omettre.
  const includeTime = opts?.includeTime !== false;
  let startTime: string | null = null;
  let endTime: string | null = null;
  if (includeTime) {
    const start = getEventStart(event);
    const end = getEventEnd(event);
    startTime = start ? formatFrTime(start) : null;
    endTime = end ? formatFrTime(end) : null;
  }
  return describeRecurrence(event.recurrence, { startTime, endTime, withPrefix: opts?.withPrefix });
}

/**
 * Combine une règle de récurrence et les champs partagés en un tableau d'objets
 * prêts à insérer dans la table `events` (chacun avec ses `start_at`/`end_at`).
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
    start_at: `${date}T${rule.startTime}:00`,
    end_at: rule.endTime ? `${date}T${rule.endTime}:00` : null,
  }));
}
