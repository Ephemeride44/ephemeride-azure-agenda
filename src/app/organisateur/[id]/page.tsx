import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  countOrganizationSubscribers,
  countUpcomingEventsByOrganization,
  getAllOrganizationIds,
  getOrganizationById,
  getUpcomingEventsByOrganization,
} from "@/lib/queries";
import { OrganizerCard } from "@/components/organizer/OrganizerCard";
import { EventsView } from "@/components/events/EventsView";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const ids = await getAllOrganizationIds();
  return ids.map((id) => ({ id }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const org = await getOrganizationById(id);
  if (!org) return { title: "Organisateurice introuvable" };
  const description = org.description ?? `Tous les événements à venir de ${org.name} sur Éphéméride.`;
  return {
    title: org.name,
    description,
    alternates: { canonical: `/organisateur/${id}` },
    openGraph: {
      title: `${org.name} — Éphéméride`,
      description,
      type: "website",
      url: `/organisateur/${id}`,
    },
  };
}

export default async function OrganizerPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const org = await getOrganizationById(id);
  if (!org) notFound();

  const [events, eventCount, subscriberCount] = await Promise.all([
    getUpcomingEventsByOrganization(id),
    countUpcomingEventsByOrganization(id),
    countOrganizationSubscribers(id),
  ]);

  return (
    <div className="min-h-screen flex flex-col dark:bg-ephemeride light:bg-[#faf3ec]">
      <header className="py-4 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l'agenda
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 md:px-8 py-6 md:py-10">
        <div className="max-w-6xl mx-auto grid gap-8 md:grid-cols-[340px_1fr]">
          <aside className="md:sticky md:top-6 md:self-start">
            <OrganizerCard
              organization={org}
              eventCount={eventCount}
              subscriberCount={subscriberCount}
            />
          </aside>

          <div className="min-w-0">
            {events.length === 0 ? (
              <p className="opacity-70">Aucun événement à venir pour cet·te organisateur·ice.</p>
            ) : (
              <Suspense>
                <EventsView events={events} organizationId={id} />
              </Suspense>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
