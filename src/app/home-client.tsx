"use client";

import BackToTop from "@/components/BackToTop";
import { TipeeeProvider, TipeeeBanner, TipeeeFooterLogo } from "@/components/TipeeeSupport";
import CalendarView from "@/components/calendar/CalendarView";
import EventList from "@/components/EventList";
import EventFilters from "@/components/events/EventFilters";
import EventProposalForm from "@/components/EventProposalForm";
import { useTheme } from "@/components/ThemeProvider";
import AccountMenu, { MobileMenu } from "@/components/account/AccountMenu";
import { NotificationBell } from "@/components/account/NotificationBell";
import { LogoLink } from "@/components/LogoLink";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { EVENT_SELECT } from "@/lib/eventSelect";
import { CalendarDays, List, Plus, SlidersHorizontal } from "lucide-react";
import { cn, formatFrDateLabel, formatFrTime, getEventStart } from "@/lib/utils";
import { useDragToClose } from "@/hooks/use-drag-to-close";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryState } from "nuqs";
import { viewParser } from "@/lib/viewParam";
import { useUserRoleContext } from "@/components/UserRoleProvider";
import {
  applyFiltersToEvents,
  eventFilterDefinitions,
  hasActiveFilters,
  readFilterValues,
  writeFilterParams,
  type FilterValues,
} from "@/lib/eventFilters";

type AnyEvent = Record<string, any>;

interface HomeClientProps {
  initialEvents: AnyEvent[];
  lastUpdatedAt: string | null;
  filterOptions: Record<string, string[]>;
}

const HomeClient = ({ initialEvents, lastUpdatedAt, filterOptions }: HomeClientProps) => {
  const [events, setEvents] = useState<AnyEvent[]>(initialEvents);
  const [pastEvents, setPastEvents] = useState<AnyEvent[]>([]);
  const [isPastEventsLoaded, setIsPastEventsLoaded] = useState(false);
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  // Bascule entre la liste classique et la vue calendrier « Constellation »,
  // synchronisée avec l'URL (?v=cal). Par défaut : vue liste (pas de paramètre).
  const [view, setView] = useQueryState("v", viewParser);
  // Tiroir de filtres (mobile), ouvert depuis le menu du bas.
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  // Détection d'un swipe vers le haut sur la barre pour « attraper » le tiroir.
  const barTouchStartY = useRef<number | null>(null);
  // Mesure de la hauteur réelle du menu mobile → variable CSS `--mobile-menu-h`,
  // utilisée par les tiroirs pour s'aligner pile sur le haut du menu.
  const mobileBarRef = useRef<HTMLElement>(null);
  // Glissé vertical du tiroir de filtres (suivi du doigt) pour le refermer.
  const { dragY: filtersDragY, handlers: filtersDragHandlers } = useDragToClose(() =>
    setIsFiltersOpen(false),
  );
  // Filtres : valeurs par défaut au rendu serveur, hydratées depuis l'URL après montage.
  const [filterValues, setFilterValues] = useState<FilterValues>(() =>
    readFilterValues(new URLSearchParams()),
  );
  const { theme } = useTheme();
  const { user: contextUser, isSuperAdmin, organizations, isLoading } = useUserRoleContext();

  // Scroll fluide vers une carte d'événement (#event-<id>), avec quelques essais
  // le temps que la liste soit rendue, puis une surbrillance temporaire.
  const scrollToEvent = useCallback((eventId: string) => {
    let tries = 0;
    const tick = () => {
      const el = document.getElementById(`event-${eventId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-accent-peach", "ring-offset-2");
        window.setTimeout(
          () => el.classList.remove("ring-2", "ring-accent-peach", "ring-offset-2"),
          2500,
        );
        // Nettoie `focus` de l'URL une fois la cible atteinte.
        const params = new URLSearchParams(window.location.search);
        params.delete("focus");
        const qs = params.toString();
        window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
        return;
      }
      if (tries++ < 40) window.setTimeout(tick, 50);
    };
    tick();
  }, []);

  // Lit les filtres + un éventuel `focus` portés par l'URL (partage, retour
  // navigateur, clic depuis le centre de notifications) et agit en conséquence :
  // applique le filtre commune et fait défiler jusqu'à l'événement ciblé.
  const applyFocusFromLocation = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    setFilterValues(readFilterValues(params));
    const focus = params.get("focus");
    if (focus) {
      setView("list");
      scrollToEvent(focus);
    }
  }, [scrollToEvent]);

  // Au montage (et sur navigation cross-page vers la home).
  useEffect(() => {
    applyFocusFromLocation();
  }, [applyFocusFromLocation]);

  // Clic depuis le centre de notifications alors qu'on est déjà sur la home :
  // l'URL a été mise à jour, on relit et on agit sans remontage.
  useEffect(() => {
    const handler = () => applyFocusFromLocation();
    window.addEventListener("ephemeride:navigate-focus", handler);
    return () => window.removeEventListener("ephemeride:navigate-focus", handler);
  }, [applyFocusFromLocation]);

  // Expose la hauteur réelle du menu mobile (padding + safe-area inclus) en
  // variable CSS, pour que les tiroirs s'arrêtent exactement au-dessus de lui.
  useEffect(() => {
    const el = mobileBarRef.current;
    if (!el) return;
    const setVar = () =>
      document.documentElement.style.setProperty("--mobile-menu-h", `${el.offsetHeight}px`);
    setVar();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(setVar);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Met à jour les filtres dans l'URL en PRÉSERVANT les autres paramètres
  // (notamment `v` géré par nuqs) : on repart des params courants.
  const handleFilterChange = (values: FilterValues) => {
    setFilterValues(values);
    const params = new URLSearchParams(window.location.search);
    for (const def of eventFilterDefinitions) params.delete(def.key);
    for (const [key, value] of Object.entries(writeFilterParams(values))) params.set(key, value);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  };

  const handleFilterReset = () => {
    setFilterValues(readFilterValues(new URLSearchParams()));
    const params = new URLSearchParams(window.location.search);
    for (const def of eventFilterDefinitions) params.delete(def.key);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  };

  // Header sticky au scroll.
  useEffect(() => {
    const handleScroll = () => setIsHeaderSticky(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Vue restreinte aux organisations de l'utilisateur connecté (membre d'orga).
  // Les visiteurs anonymes et les super admins conservent la vue publique
  // rendue côté serveur (ISR) — identique à ce qu'ils chargeraient.
  useEffect(() => {
    if (isLoading) return;
    const isOrgMember = contextUser && !isSuperAdmin && organizations.length > 0;
    if (!isOrgMember) {
      setEvents(initialEvents);
      return;
    }
    const orgIds = organizations.map((org) => org.organization_id);
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("events")
      .select(EVENT_SELECT)
      .eq("status", "accepted")
      .gte("start_at", today)
      .in("organization_id", orgIds)
      .order("start_at", { nullsFirst: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Erreur lors du chargement des événements (scope orga) :", error);
          return;
        }
        setEvents((data || []) as AnyEvent[]);
      });
  }, [contextUser, isSuperAdmin, organizations, isLoading, initialEvents]);

  const fetchPastEvents = async () => {
    if (isPastEventsLoaded) return;
    const today = new Date().toISOString().slice(0, 10);

    let pastQuery = supabase
      .from("events")
      .select(EVENT_SELECT)
      .eq("status", "accepted")
      .lt("start_at", today);

    if (contextUser && !isSuperAdmin && organizations.length > 0) {
      const orgIds = organizations.map((org) => org.organization_id);
      pastQuery = pastQuery.in("organization_id", orgIds);
    }

    const { data, error } = await pastQuery
      .order("start_at", { ascending: false, nullsFirst: false })
      .limit(200);

    if (error) {
      console.error("Erreur lors du chargement des événements passés :", error);
      return;
    }
    setPastEvents((data || []) as AnyEvent[]);
    setIsPastEventsLoaded(true);
  };

  // Filtrage côté client (instantané) sur les listes déjà chargées.
  const filteredEvents = useMemo(
    () => applyFiltersToEvents(events, filterValues),
    [events, filterValues],
  );
  const filteredPastEvents = useMemo(
    () => applyFiltersToEvents(pastEvents, filterValues),
    [pastEvents, filterValues],
  );

  // Nombre d'événements à venir (filtrés) — affiché dans le footer.
  const upcomingCount = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return filteredEvents.filter((event) => {
      const start = getEventStart(event);
      if (!start) return false;
      const pad = (n: number) => String(n).padStart(2, "0");
      const startStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
      return startStr >= todayStr;
    }).length;
  }, [filteredEvents]);

  // Phrase de statut affichée sous le logo : nombre d'événements + dernière
  // mise à jour relative (aujourd'hui / Hier / date complète) à l'heure près.
  const stats = useMemo(() => {
    const plural = upcomingCount > 1 ? "s" : "";

    if (!lastUpdatedAt) return { plural, lastUpdated: null as string | null };
    const updated = new Date(lastUpdatedAt);
    if (Number.isNaN(updated.getTime())) return { plural, lastUpdated: null as string | null };

    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((startOfDay(new Date()) - startOfDay(updated)) / 86_400_000);
    const day =
      diffDays === 0 ? "aujourd'hui" : diffDays === 1 ? "Hier" : formatFrDateLabel(updated);

    return { plural, lastUpdated: `${day} à ${formatFrTime(updated)}` };
  }, [upcomingCount, lastUpdatedAt]);

  // Met en gras les groupes de chiffres (jour, année, heure « 14h12 »).
  const boldNumbers = (text: string) =>
    text.split(/(\d+(?:h\d+)?)/).map((part, i) =>
      /^\d/.test(part) ? <strong key={i} className="font-semibold">{part}</strong> : part,
    );

  // Bascule Liste / Calendrier — placée dans le header (sticky) pour rester
  // accessible en permanence sur desktop comme sur mobile.
  const viewToggle = (
    <div className="inline-flex rounded-full bg-foreground/5 p-1">
      {(["list", "calendar"] as const).map((v) => {
        const Icon = v === "list" ? List : CalendarDays;
        return (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-colors ${
              view === v
                ? "bg-accent-violet text-accent-violet-foreground font-bold shadow-sm"
                : "font-medium text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {v === "list" ? "Liste" : "Calendrier"}
          </button>
        );
      })}
    </div>
  );

  // Barre de navigation fixe en bas d'écran (mobile uniquement) : les deux
  // modes de vue (liste / agenda) encadrent un bouton « + » central pour
  // proposer un événement ; le thème est accessible sur le côté. Le retour en
  // haut reste un bouton flottant indépendant (cf. BackToTop).
  const mobileBottomBar = (
    <>
      {/* Tiroir de filtres custom : émerge de sous le menu (translateY + easeIn),
          coin supérieur arrondi, SANS overlay. En `pointer-events-none` quand il
          est fermé → il ne bloque jamais le menu. Glissé vers le bas pour fermer. */}
      <div
        className={`md:hidden fixed inset-x-0 z-50 ${isFiltersOpen ? "" : "pointer-events-none"}`}
        style={{ bottom: "var(--mobile-menu-h, 52px)" }}
        aria-hidden={!isFiltersOpen}
      >
        <div
          className="rounded-t-3xl border-t border-foreground/10 bg-background px-4 pb-8 pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.18)]"
          style={{
            transform: isFiltersOpen ? `translateY(${filtersDragY}px)` : "translateY(120%)",
            transition: filtersDragY ? "none" : "transform 300ms ease-in",
          }}
          {...filtersDragHandlers}
        >
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />
          <div className="mb-4 text-center font-display text-lg font-bold">Filtres</div>
          <EventFilters
            options={filterOptions}
            values={filterValues}
            onChange={handleFilterChange}
            onReset={handleFilterReset}
          />
        </div>
      </div>

      <nav
        ref={mobileBarRef}
        className="md:hidden fixed inset-x-0 bottom-0 z-[60] border-t dark:border-white/10 light:border-ephemeride/10 dark:bg-ephemeride/95 light:bg-[#faf3ec]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
        onTouchStart={(e) => {
          barTouchStartY.current = e.touches[0].clientY;
        }}
        onTouchMove={(e) => {
          // Swipe vers le haut sur la barre → on « tire » le tiroir de filtres.
          if (barTouchStartY.current != null && barTouchStartY.current - e.touches[0].clientY > 28) {
            setIsFiltersOpen(true);
            barTouchStartY.current = null;
          }
        }}
        onTouchEnd={() => {
          barTouchStartY.current = null;
        }}
      >
        <div className="relative flex items-end justify-between px-4 pt-2 pb-2">
          {/* Groupe gauche : bascule de vue (liste / agenda) */}
          <div className="flex items-end gap-3">
            {/* Bascule liste / agenda : un toggle segmenté (soit l'un, soit l'autre) */}
            <div
              role="group"
              aria-label="Mode d'affichage"
              className="mb-1 flex items-center rounded-full p-0.5 dark:bg-white/10 light:bg-ephemeride/10"
            >
              <button
                type="button"
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
                aria-label="Liste"
                className={cn(
                  "flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-medium transition-all duration-300 ease-out",
                  view === "list"
                    ? "bg-accent-violet text-accent-violet-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <List className="h-5 w-5 shrink-0" />
                <span
                  className={cn(
                    "overflow-hidden whitespace-nowrap transition-all duration-300 ease-out",
                    view === "list" ? "ml-1.5 max-w-[5rem] opacity-100" : "ml-0 max-w-0 opacity-0",
                  )}
                >
                  Liste
                </span>
              </button>
              <button
                type="button"
                onClick={() => setView("calendar")}
                aria-pressed={view === "calendar"}
                aria-label="Agenda"
                className={cn(
                  "flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-medium transition-all duration-300 ease-out",
                  view === "calendar"
                    ? "bg-accent-violet text-accent-violet-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <CalendarDays className="h-5 w-5 shrink-0" />
                <span
                  className={cn(
                    "overflow-hidden whitespace-nowrap transition-all duration-300 ease-out",
                    view === "calendar" ? "ml-1.5 max-w-[5rem] opacity-100" : "ml-0 max-w-0 opacity-0",
                  )}
                >
                  Agenda
                </span>
              </button>
            </div>
          </div>

          {/* Bouton central « + » (proposer un événement), plus grand et surélevé */}
          <button
            type="button"
            onClick={() => setIsProposalDialogOpen(true)}
            aria-label="Proposer un événement"
            className="absolute left-1/2 -top-8 -translate-x-1/2 flex h-16 w-16 items-center justify-center rounded-full bg-accent-peach text-accent-peach-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <Plus className="h-7 w-7" />
          </button>

          {/* Groupe droit : filtres + notifications + compte */}
          <div className="flex items-center gap-1 pb-1">
            <button
              type="button"
              onClick={() => setIsFiltersOpen((open) => !open)}
              aria-label="Filtres"
              className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                isFiltersOpen ? "text-accent-peach" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <SlidersHorizontal className="h-5 w-5" />
              {hasActiveFilters(filterValues) && (
                <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#faf3ec] dark:ring-ephemeride" />
              )}
            </button>
            <NotificationBell />
            <MobileMenu />
          </div>
        </div>
      </nav>
    </>
  );

  return (
    <TipeeeProvider>
      <div className="min-h-screen flex flex-col dark:bg-ephemeride light:bg-[#faf3ec] pb-20 md:pb-0">
        {/* Bandeau de soutien Tipeee, tout en haut (affiché si activé dans l'admin) */}
        <TipeeeBanner />

        <header className={`py-4 px-4 md:px-8 transition-all duration-300 z-20 ${isHeaderSticky ? 'fixed top-0 left-0 right-0 dark:bg-ephemeride/95 light:bg-[#faf3ec]/95 shadow-md backdrop-blur-3xl dark:backdrop-blur-sm' : ''}`}>
          <div className="relative max-w-6xl mx-auto">
            <div className={`flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 transition-all duration-300 ${isHeaderSticky ? 'py-2' : 'py-4'}`}>
              <div className="flex flex-col items-center md:items-start gap-1">
                <LogoLink
                  src={theme === 'light' ? '/images/ephemeride-logo-lite.png' : '/images/ephemeride-logo-dark.png'}
                  alt="Ephemeride"
                  className={`w-auto max-w-full object-contain transition-all duration-300 ${isHeaderSticky ? 'h-12 md:h-20' : 'h-16 md:h-32'}`}
                />
                {!isHeaderSticky && (
                  <p className="text-xs opacity-60 text-center md:text-left">
                    <strong className="font-semibold">{upcomingCount}</strong> événement{stats.plural} recensé{stats.plural}.
                    {stats.lastUpdated && (
                      <>
                        {" "}
                        <span className="underline">dernière mise à jour</span>: {boldNumbers(stats.lastUpdated)}
                      </>
                    )}
                  </p>
                )}
              </div>

              {/* Switch de vue dans le header (desktop) ; sur mobile il est dans
                  le menu du bas. */}
              <div className="hidden md:block">{viewToggle}</div>

              <div className="hidden md:flex flex-col items-end gap-2 self-start">
                <div className="flex items-center gap-2">
                  <NotificationBell />
                  <AccountMenu />
                </div>
                <Button
                  onClick={() => setIsProposalDialogOpen(true)}
                  variant="outline"
                  className="rounded-full bg-accent-peach text-accent-peach-foreground border-transparent hover:bg-accent-peach-hover hover:text-accent-peach-foreground shadow-sm font-medium"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Proposer un événement
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className={`flex-1 container mx-auto px-4 md:px-8 pt-2 pb-8 md:pt-4 md:pb-12 ${isHeaderSticky ? 'mt-32 md:mt-40' : ''}`}>
          <div className="max-w-6xl mx-auto">
            {/* Filtres (desktop) — partagés par les vues Liste et Calendrier.
                Sur mobile, ils sont accessibles via le tiroir du menu du bas. */}
            <div className="hidden md:block">
              <EventFilters
                options={filterOptions}
                values={filterValues}
                onChange={handleFilterChange}
                onReset={handleFilterReset}
              />
            </div>

            {view === "list" ? (
              <EventList
                events={filteredEvents}
                pastEvents={filteredPastEvents}
                onLoadPastEvents={fetchPastEvents}
              />
            ) : (
              <CalendarView filterValues={filterValues} />
            )}
          </div>
        </main>

        <footer className="border-t border-white/10 py-6 px-4 md:px-8 dark:border-white/10 light:border-ephemeride/10">
          <div className="container mx-auto text-center space-y-1">
            <p className="text-sm font-normal opacity-70">
              L'AGENDA CULTUREL ET CITOYEN DU VIGNOBLE NANTAIS
            </p>
            {/* Logo Tipeee cliquable (affiché seulement si une URL est configurée) */}
            <TipeeeFooterLogo />
          </div>
        </footer>

        <Dialog open={isProposalDialogOpen} onOpenChange={setIsProposalDialogOpen}>
          <DialogContent className="dark:bg-ephemeride-light light:bg-[#f8f8f6] border-none dark:text-ephemeride-foreground light:text-ephemeride max-w-3xl max-h-[90vh] overflow-y-auto z-[70] max-sm:inset-0 max-sm:left-0 max-sm:top-0 max-sm:h-full max-sm:w-full max-sm:max-w-none max-sm:max-h-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none">
            <DialogHeader>
              <DialogTitle className="text-xl">Proposer un événement</DialogTitle>
            </DialogHeader>
            <EventProposalForm onClose={() => setIsProposalDialogOpen(false)} />
          </DialogContent>
        </Dialog>

        {/* Bouton flottant « retour en haut » (positionné au-dessus de la barre
            du bas sur mobile) */}
        <BackToTop />

        {/* Menu fixe en bas d'écran (mobile uniquement) */}
        {mobileBottomBar}
      </div>
    </TipeeeProvider>
  );
};

export default HomeClient;
