"use client";

/**
 * Skeleton de la liste d'événements, affiché pendant le bref instant où
 * EventList dérive les événements à venir côté client (avant que le useEffect
 * ne peuple la liste). Reproduit la structure du redesign : rail timeline +
 * cards. Les teintes sont pilotées par les variantes Tailwind `dark:` (CSS,
 * sans dépendre du thème JS) pour éviter tout flash.
 */

// Barre grise neutre, contrastée sur le fond comme sur les cards.
const Bar = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-gray-200 dark:bg-white/10 ${className}`} />
);

const SkeletonCard = () => (
  <div className="flex flex-col md:flex-row overflow-hidden rounded-2xl shadow-sm bg-white dark:bg-ephemeride-light">
    {/* Emplacement de l'affiche */}
    <div className="h-56 w-full md:h-auto md:w-56 flex-shrink-0 animate-pulse bg-gray-200 dark:bg-white/10" />
    {/* Contenu */}
    <div className="flex-1 p-6 space-y-3">
      <Bar className="h-6 w-2/3" />
      <Bar className="h-4 w-1/2" />
      <Bar className="h-4 w-1/3" />
      <div className="flex justify-end pt-6">
        <Bar className="h-9 w-44 rounded-full" />
      </div>
    </div>
  </div>
);

const SkeletonDayGroup = ({ cards }: { cards: number }) => (
  <div className="mb-6 flex gap-4 md:gap-6">
    {/* Rail timeline : pastille + date empilée */}
    <div className="flex-shrink-0 w-20 md:w-28">
      <div className="flex items-start gap-2">
        <span className="mt-2 h-3.5 w-3.5 flex-shrink-0 rounded-full bg-gray-300 dark:bg-white/15" />
        <div className="space-y-2">
          <Bar className="h-3 w-14" />
          <Bar className="h-8 w-10" />
          <Bar className="h-3 w-12" />
          <Bar className="h-3 w-10" />
        </div>
      </div>
    </div>
    {/* Colonne des cards */}
    <div className="flex-1 min-w-0 space-y-4">
      {Array.from({ length: cards }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  </div>
);

const EventListSkeleton = () => (
  <div className="animate-in fade-in duration-300" aria-hidden="true">
    {/* Compteur + dernière mise à jour */}
    <div className="mb-8 space-y-2">
      <Bar className="h-5 w-2/3 max-w-xl" />
      <Bar className="h-4 w-1/2 max-w-md" />
    </div>

    {/* Filtre (pilule) */}
    <Bar className="mb-10 h-10 w-[240px] rounded-full" />

    {/* Titre « Événements à venir » */}
    <Bar className="mb-8 h-8 w-64" />

    {/* Séparateur de mois */}
    <div className="my-8 flex items-center gap-4">
      <div className="h-px flex-grow bg-gray-200 dark:bg-white/10" />
      <Bar className="h-5 w-28" />
      <div className="h-px flex-grow bg-gray-200 dark:bg-white/10" />
    </div>

    <SkeletonDayGroup cards={2} />
    <SkeletonDayGroup cards={1} />
  </div>
);

export default EventListSkeleton;
