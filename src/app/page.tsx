import HomeClient from "./home-client";
import {
  getUpcomingEvents,
  getLastUpdatedAt,
  getFilterOptions,
} from "@/lib/queries";

// ISR : la home publique est régénérée au plus tard toutes les heures
// (et immédiatement à la demande via /api/revalidate après une mutation admin).
export const revalidate = 3600;

export default async function HomePage() {
  const [events, lastUpdatedAt, filterOptions] = await Promise.all([
    getUpcomingEvents(),
    getLastUpdatedAt(),
    getFilterOptions(),
  ]);

  return (
    <HomeClient
      initialEvents={events}
      lastUpdatedAt={lastUpdatedAt}
      filterOptions={filterOptions}
    />
  );
}
