import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById, getAllAcceptedEvents } from "@/lib/queries";
import { eventSlug, idFromSlug } from "@/lib/utils";
import {
  getEventStart,
  getEventEnd,
  formatFrDateLabel,
  formatCityName,
} from "@/lib/utils";
import EventCard from "@/components/EventCard";

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

  const jsonLd = buildJsonLd(event, slug);

  return (
    <div className="min-h-screen dark:bg-ephemeride light:bg-[#faf3ec]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-10">
        <Link href="/" className="text-sm opacity-70 hover:opacity-100 underline">
          ← Retour à l'agenda
        </Link>

        {/* On réutilise la carte d'événement de l'agenda : même visuel, toutes
            les infos (date, lieu, prix, récurrence, organisateur, favori…). */}
        <article className="mt-6">
          <EventCard event={event as never} />
        </article>
      </div>
    </div>
  );
}
