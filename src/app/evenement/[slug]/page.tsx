import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById, getAllAcceptedEvents } from "@/lib/queries";
import { eventSlug, idFromSlug } from "@/lib/utils";
import {
  getEventStart,
  getEventEnd,
  formatFrDateLabel,
  formatTimeDisplay,
  formatCityName,
  formatPrice,
} from "@/lib/utils";
import { formatDepartment } from "@/lib/departments";
import { describeRecurrenceFromEvent } from "@/lib/recurrence";

// ISR : régénération horaire + à la demande (api/revalidate). Les nouveaux
// événements non pré-générés sont rendus à la première visite.
export const revalidate = 3600;
export const dynamicParams = true;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ephemeride.app";

export async function generateStaticParams() {
  const events = await getAllAcceptedEvents();
  return events.map((e) => ({ slug: eventSlug(e) }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const id = idFromSlug(slug);
  const event = id ? await getEventById(id) : null;
  if (!event) {
    return { title: "Événement introuvable" };
  }

  const start = getEventStart(event);
  const place = [event.location_place, formatCityName(event.location_city)]
    .filter(Boolean)
    .join(", ");
  const descParts = [
    start ? formatFrDateLabel(start) : null,
    place || null,
    event.audience || null,
  ].filter(Boolean);
  const description =
    descParts.join(" • ") ||
    "Agenda culturel et citoyen du vignoble nantais";

  return {
    title: event.name,
    description,
    alternates: { canonical: `/evenement/${slug}` },
    openGraph: {
      title: event.name,
      description,
      type: "article",
      url: `/evenement/${slug}`,
      images: event.cover_url ? [event.cover_url] : ["/og-image.jpg"],
    },
  };
}

function buildJsonLd(event: any, slug: string) {
  const start = getEventStart(event);
  const end = getEventEnd(event);
  const offers =
    event.ticketing_url || event.price
      ? {
          "@type": "Offer",
          ...(event.price ? { price: event.price } : {}),
          ...(event.ticketing_url ? { url: event.ticketing_url } : {}),
          availability: event.is_full
            ? "https://schema.org/SoldOut"
            : "https://schema.org/InStock",
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.name,
    ...(start ? { startDate: event.start_at } : {}),
    ...(end ? { endDate: event.end_at } : {}),
    eventStatus: event.is_cancelled
      ? "https://schema.org/EventCancelled"
      : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(event.cover_url ? { image: [event.cover_url] } : {}),
    location: {
      "@type": "Place",
      name: event.location_place || event.location_city || "Vignoble nantais",
      address: {
        "@type": "PostalAddress",
        addressLocality: event.location_city || undefined,
        addressRegion: event.location_department || undefined,
        addressCountry: "FR",
      },
    },
    ...(offers ? { offers } : {}),
    url: `${siteUrl}/evenement/${slug}`,
  };
}

export default async function EventPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const id = idFromSlug(slug);
  const event = id ? await getEventById(id) : null;
  if (!event) notFound();

  const start = getEventStart(event);
  const time = formatTimeDisplay(event);
  const recurrence = describeRecurrenceFromEvent(event, { includeTime: false });
  const city = formatCityName(event.location_city);
  const price = formatPrice(event.price);
  const jsonLd = buildJsonLd(event, slug);

  return (
    <div className="min-h-screen dark:bg-ephemeride">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-10">
        <Link href="/" className="text-sm opacity-70 hover:opacity-100 underline">
          ← Retour à l'agenda
        </Link>

        <article className="mt-6">
          <header className="mb-6">
            <h1 className="text-3xl md:text-4xl font-semibold flex items-center gap-3">
              {event.emoji && <span aria-hidden>{event.emoji}</span>}
              <span>{event.name}</span>
            </h1>
            {event.is_cancelled && (
              <p className="mt-2 inline-block rounded bg-destructive/15 text-destructive px-2 py-1 text-sm font-medium">
                Événement annulé
              </p>
            )}
            {event.is_full && !event.is_cancelled && (
              <p className="mt-2 inline-block rounded bg-muted px-2 py-1 text-sm font-medium">
                Complet
              </p>
            )}
          </header>

          {event.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.cover_url}
              alt={event.name}
              className="w-full rounded-lg mb-6 object-cover max-h-[480px]"
            />
          )}

          <dl className="space-y-3 text-base">
            {start && (
              <div>
                <dt className="font-medium opacity-70">Date</dt>
                <dd className="capitalize">
                  {formatFrDateLabel(start)}
                  {time ? ` — ${time}` : ""}
                </dd>
              </div>
            )}
            {recurrence && (
              <div>
                <dt className="font-medium opacity-70">Récurrence</dt>
                <dd>{recurrence}</dd>
              </div>
            )}
            {(event.location_place || city) && (
              <div>
                <dt className="font-medium opacity-70">Lieu</dt>
                <dd>{[event.location_place, city].filter(Boolean).join(", ")}</dd>
              </div>
            )}
            {event.location_department && (
              <div>
                <dt className="font-medium opacity-70">Département</dt>
                <dd>
                  <Link
                    href={`/departement/${event.location_department}`}
                    className="underline hover:opacity-80"
                  >
                    {formatDepartment(event.location_department)}
                  </Link>
                </dd>
              </div>
            )}
            {event.audience && (
              <div>
                <dt className="font-medium opacity-70">Public</dt>
                <dd>{event.audience}</dd>
              </div>
            )}
            {price && (
              <div>
                <dt className="font-medium opacity-70">Tarif</dt>
                <dd>{price}</dd>
              </div>
            )}
          </dl>

          <div className="flex flex-wrap gap-3 mt-8">
            {event.ticketing_url && (
              <a
                href={event.ticketing_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-4 py-2 font-medium"
              >
                Billetterie
              </a>
            )}
            {event.url && (
              <a
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md border px-4 py-2 font-medium"
              >
                Site de l'événement
              </a>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
