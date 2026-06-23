import type { MetadataRoute } from "next";
import { getAllAcceptedEvents } from "@/lib/queries";
import { eventSlug } from "@/lib/utils";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ephemeride.app";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = await getAllAcceptedEvents();

  const eventEntries: MetadataRoute.Sitemap = events.map((e) => ({
    url: `${siteUrl}/evenement/${eventSlug(e)}`,
    lastModified: e.updated_at ? new Date(e.updated_at) : undefined,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const departmentCodes = Array.from(
    new Set(
      events
        .map((e) => e.location_department)
        .filter((c): c is string => !!c && String(c).trim() !== ""),
    ),
  );
  const departmentEntries: MetadataRoute.Sitemap = departmentCodes.map((code) => ({
    url: `${siteUrl}/departement/${code}`,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  return [
    {
      url: siteUrl,
      changeFrequency: "daily",
      priority: 1,
    },
    ...departmentEntries,
    ...eventEntries,
  ];
}
