import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Database } from "@/lib/database.types";
type Event = Database["public"]["Tables"]["events"]["Row"];

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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

export function getDateParts(event: Event) {
  if (!event.date) return { day: "", month: "", year: "" };
  const [year, month, day] = event.date.split("-");
  return {
    day: parseInt(day, 10).toString().padStart(2, '0'),
    month: monthNamesShort[parseInt(month, 10) - 1] || "",
    year: year
  };
}

export function formatTimeDisplay(event: Event) {
  if (!event.datetime) return "";
  const timeMatch = event.datetime.match(/(\d{1,2}h\d{2})/);
  if (timeMatch) {
    if (event.end_time) {
      return `${timeMatch[1]} — ${event.end_time}`;
    }
    return timeMatch[1];
  }
  return "";
}

export function isToday(event: Event) {
  if (!event.date) return false;
  const today = new Date();
  const eventDate = new Date(event.date);
  return (
    today.getFullYear() === eventDate.getFullYear() &&
    today.getMonth() === eventDate.getMonth() &&
    today.getDate() === eventDate.getDate()
  );
}
