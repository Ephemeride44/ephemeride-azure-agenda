import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Database } from "@/lib/database.types";
type Event = Database["public"]["Tables"]["events"]["Row"];

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Transforme un texte en segment d'URL : sans accents, minuscules, tirets.
 * Ex : "Fête de la Musique" -> "fete-de-la-musique".
 */
export function slugify(text?: string | null): string {
  return (text || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Slug SEO d'un événement : "nom-de-l-evenement-<uuid>".
 * L'UUID est conservé en suffixe pour permettre la résolution sans migration DB.
 */
export function eventSlug(event: { id: string; name?: string | null }): string {
  // On plafonne la partie lisible du slug pour rester sous la limite de nom de
  // fichier du système (255 octets). L'UUID en suffixe assure l'unicité et la
  // résolution (idFromSlug), quelle que soit la troncature.
  const base = slugify(event.name).slice(0, 80).replace(/-+$/, "");
  return base ? `${base}-${event.id}` : event.id;
}

/**
 * Nettoie un nom de fichier pour l'utiliser comme clé de stockage (Supabase
 * Storage n'accepte pas les accents ni la plupart des caractères spéciaux).
 * L'extension est préservée. Ex : "Société été.PNG" -> "societe-ete.png".
 */
export function sanitizeFileName(fileName?: string | null): string {
  const name = (fileName || "").trim();
  const lastDot = name.lastIndexOf(".");
  const hasExt = lastDot > 0;
  const base = hasExt ? name.slice(0, lastDot) : name;
  const ext = hasExt ? name.slice(lastDot + 1) : "";

  const cleanBase = slugify(base) || "fichier";
  const cleanExt = ext
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  return cleanExt ? `${cleanBase}.${cleanExt}` : cleanBase;
}

const TRAILING_UUID_RE =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** Extrait l'UUID de l'événement depuis un slug "…-<uuid>". */
export function idFromSlug(slug?: string | null): string | null {
  const match = (slug || "").match(TRAILING_UUID_RE);
  return match ? match[1] : null;
}

/**
 * Normalise le nom d'une ville en majuscules (ex : "nantes" -> "NANTES").
 * Utilisé à l'affichage et à la saisie pour uniformiser les villes.
 */
export function formatCityName(city?: string | null): string {
  if (!city) return "";
  return city.trim().toUpperCase();
}

/**
 * Uniformise un texte de prix en mettant la première lettre en majuscule
 * (ex : "gratuit" -> "Gratuit", "entrée libre" -> "Entrée libre").
 */
export function formatPrice(price?: string | null): string {
  if (!price) return "";
  const trimmed = price.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export const daysOfWeek = [
  "dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"
];

export const monthNames = [
  "janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"
];

export const monthNamesShort = [
  "JAN.", "FÉV.", "MAR.", "AVR.", "MAI", "JUIN", "JUIL.", "AOÛT", "SEP.", "OCT.", "NOV.", "DÉC."
];

export function getDayOfWeek(dateISO: string): string {
  const d = new Date(dateISO);
  return daysOfWeek[d.getDay()];
}

export function getDateBlockColor(day: string): string {
  switch (day) {
    case "lundi":
      return "bg-[#8B9DC3]"; // Bleu ardoise doux
    case "mardi":
      return "bg-[#D4A574]"; // Jaune ocre pastel
    case "mercredi":
      return "bg-[#9CAF88]"; // Vert sauge
    case "jeudi":
      return "bg-[#A8B5C8]"; // Bleu gris doux
    case "vendredi":
      return "bg-[#C89B7B]"; // Rouge brique doux
    case "samedi":
      return "bg-[#B8A9D9]"; // Lavande désaturée
    case "dimanche":
      return "bg-[#D4A5A5]"; // Rose terreux
    default:
      return "bg-gray-400";
  }
}

export function getMonthName(index: number): string {
  return monthNames[index] || "";
}

export function getMonthNameShort(index: number): string {
  return monthNamesShort[index] || "";
}

/**
 * Sous-ensemble des champs d'un événement nécessaires au calcul date/heure.
 * Permet d'appeler les helpers depuis du code qui ne manipule qu'un événement
 * partiel (ex : recurrence.ts).
 */
export type EventTimeFields = {
  start_at?: string | null;
  end_at?: string | null;
};

/**
 * Parse un timestamp naïf Postgres (`timestamp` sans fuseau), ex
 * "2025-05-21T16:30:00" ou "2025-05-21 16:30:00", en `Date` interprétée en
 * heure LOCALE. On ne fait jamais `new Date(value)` directement, qui
 * interpréterait une chaîne ISO sans `Z` de façon ambiguë selon le moteur.
 */
export function parseLocalDateTime(value?: string | null): Date | null {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  return new Date(
    parseInt(y, 10), parseInt(mo, 10) - 1, parseInt(d, 10),
    parseInt(h, 10), parseInt(mi, 10), s ? parseInt(s, 10) : 0, 0,
  );
}

/** Formate une `Date` locale en `YYYY-MM-DD`. */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Date+heure de début d'un événement (null si `start_at` absent). */
export function getEventStart(event: EventTimeFields): Date | null {
  return parseLocalDateTime(event.start_at);
}

/** Date+heure de fin (optionnelle). */
export function getEventEnd(event: EventTimeFields): Date | null {
  return parseLocalDateTime(event.end_at);
}

/** Formate une heure en français : "16h30", ou "16h00" pour une heure pile. */
export function formatFrTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  return `${h}h${String(m).padStart(2, "0")}`;
}

/** Libellé de date long en français : "mercredi 21 mai 2025". */
export function formatFrDateLabel(date: Date): string {
  return `${daysOfWeek[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Libellé complet date + heure pour les tableaux (admin), ex
 * "mercredi 21 mai 2025 à 16h30". Fallback sur le texte legacy `datetime`.
 */
export function formatEventDateTimeLabel(event: EventTimeFields): string {
  const start = getEventStart(event);
  if (!start) return "";
  const time = formatTimeDisplay(event);
  const label = formatFrDateLabel(start);
  return time ? `${label} à ${time}` : label;
}

export function getDateParts(event: Event) {
  const d = getEventStart(event);
  if (!d) return { day: "", month: "", year: "" };
  return {
    day: d.getDate().toString().padStart(2, "0"),
    month: monthNamesShort[d.getMonth()] || "",
    year: d.getFullYear().toString(),
  };
}

export function formatTimeDisplay(event: EventTimeFields) {
  const start = getEventStart(event);
  if (!start) return "";
  const end = getEventEnd(event);
  // 00:00 sans heure de fin = heure non renseignée (events legacy backfillés) :
  // on n'affiche rien.
  if (start.getHours() === 0 && start.getMinutes() === 0 && !end) return "";
  const startLabel = formatFrTime(start);
  return end ? `${startLabel} — ${formatFrTime(end)}` : startLabel;
}

export function isToday(event: Event) {
  const eventDate = getEventStart(event);
  if (!eventDate) return false;
  const today = new Date();
  return (
    today.getFullYear() === eventDate.getFullYear() &&
    today.getMonth() === eventDate.getMonth() &&
    today.getDate() === eventDate.getDate()
  );
}
