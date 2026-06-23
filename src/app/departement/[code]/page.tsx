import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUpcomingEventsByDepartment, getAllAcceptedEvents } from "@/lib/queries";
import { DEPARTMENT_NAME_BY_CODE, formatDepartment } from "@/lib/departments";
import { eventSlug, getEventStart, formatFrDateLabel, formatTimeDisplay, formatCityName } from "@/lib/utils";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const events = await getAllAcceptedEvents();
  const codes = Array.from(
    new Set(
      events
        .map((e) => e.location_department)
        .filter((c): c is string => !!c && String(c).trim() !== ""),
    ),
  );
  return codes.map((code) => ({ code }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ code: string }> },
): Promise<Metadata> {
  const { code } = await params;
  const name = DEPARTMENT_NAME_BY_CODE[code];
  if (!name) return { title: "Département introuvable" };
  const title = `Événements en ${name}`;
  const description = `Agenda culturel et citoyen : tous les événements à venir en ${name} (${code}).`;
  return {
    title,
    description,
    alternates: { canonical: `/departement/${code}` },
    openGraph: {
      title: `${title} — Éphéméride`,
      description,
      type: "website",
      url: `/departement/${code}`,
    },
  };
}

export default async function DepartmentPage(
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const name = DEPARTMENT_NAME_BY_CODE[code];
  if (!name) notFound();

  const events = await getUpcomingEventsByDepartment(code);

  return (
    <div className="min-h-screen dark:bg-ephemeride">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-10">
        <Link href="/" className="text-sm opacity-70 hover:opacity-100 underline">
          ← Retour à l'agenda
        </Link>

        <h1 className="text-3xl md:text-4xl font-semibold mt-6 mb-8">
          Événements en {formatDepartment(code)}
        </h1>

        {events.length === 0 ? (
          <p className="opacity-70">Aucun événement à venir dans ce département pour le moment.</p>
        ) : (
          <ul className="space-y-4">
            {events.map((event: any) => {
              const start = getEventStart(event);
              const time = formatTimeDisplay(event);
              const city = formatCityName(event.location_city);
              return (
                <li key={event.id} className="border-b border-white/10 pb-4">
                  <Link
                    href={`/evenement/${eventSlug(event)}`}
                    className="group block"
                  >
                    <span className="text-lg font-medium group-hover:underline">
                      {event.emoji ? `${event.emoji} ` : ""}
                      {event.name}
                    </span>
                    <span className="block text-sm opacity-70 capitalize">
                      {start ? formatFrDateLabel(start) : ""}
                      {time ? ` — ${time}` : ""}
                      {city ? ` • ${city}` : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
