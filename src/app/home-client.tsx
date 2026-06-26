"use client";

import BackToTop from "@/components/BackToTop";
import { TipeeeProvider, TipeeeBanner, TipeeeFooterLogo } from "@/components/TipeeeSupport";
import CalendarView from "@/components/calendar/CalendarView";
import EventList from "@/components/EventList";
import EventFilters from "@/components/events/EventFilters";
import EventProposalForm from "@/components/EventProposalForm";
import { useTheme } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import AccountMenu, { MobileMenu } from "@/components/account/AccountMenu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, List, Moon, Plus, SlidersHorizontal, Sun } from "lucide-react";
import { formatFrDateLabel, formatFrTime, getEventStart } from "@/lib/utils";
import { useDragToClose } from "@/hooks/use-drag-to-close";
import { useEffect, useMemo, useRef, useState } from "react";
import { useUserRoleContext } from "@/components/UserRoleProvider";
import {
  applyFiltersToEvents,
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
  // Bascule entre la liste classique et la vue calendrier « Constellation ».
  const [view, setView] = useState<"list" | "calendar">("list");
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
  const { theme, toggleTheme } = useTheme();
  const { user: contextUser, isSuperAdmin, organizations, isLoading } = useUserRoleContext();

  // Au montage : lit les filtres portés par l'URL (partage / retour navigateur).
  useEffect(() => {
    setFilterValues(readFilterValues(new URLSearchParams(window.location.search)));
  }, []);

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

  const handleFilterChange = (values: FilterValues) => {
    setFilterValues(values);
    const qs = new URLSearchParams(writeFilterParams(values)).toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  };

  const handleFilterReset = () => {
    setFilterValues(readFilterValues(new URLSearchParams()));
    window.history.replaceState(null, "", window.location.pathname);
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
      .select("*, theme:theme_id(*), recurrence:recurrence_id(*)")
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
      .select("*, theme:theme_id(*)")
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

  // Date de dernière mise à jour, formatée en français.
  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdatedAt) return "";
    const updated = new Date(lastUpdatedAt);
    if (Number.isNaN(updated.getTime())) return "";
    return `${formatFrDateLabel(updated)} à ${formatFrTime(updated)}`;
  }, [lastUpdatedAt]);

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
  const mobileBarItem =
    "flex flex-col items-center gap-0.5 px-2 text-[10px] font-medium transition-colors";
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
        <div className="relative flex items-end justify-center gap-7 px-3 pt-2 pb-2">
          {/* Filtres — côté gauche */}
          <button
            type="button"
            onClick={() => setIsFiltersOpen((open) => !open)}
            aria-label="Filtres"
            className={`${mobileBarItem} absolute bottom-2 left-3 ${isFiltersOpen ? "text-accent-peach" : "opacity-60"}`}
          >
            <span className="relative">
              <SlidersHorizontal className="h-5 w-5" />
              {hasActiveFilters(filterValues) && (
                <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#faf3ec] dark:ring-ephemeride" />
              )}
            </span>
            Filtres
          </button>

          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            className={`${mobileBarItem} ${view === "list" ? "text-accent-violet" : "opacity-60"}`}
          >
            <List className="h-5 w-5" />
            Liste
          </button>

          {/* Bouton central « + » (proposer un événement), plus grand et surélevé */}
          <button
            type="button"
            onClick={() => setIsProposalDialogOpen(true)}
            aria-label="Proposer un événement"
            className="-mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-accent-peach text-accent-peach-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <Plus className="h-7 w-7" />
          </button>

          <button
            type="button"
            onClick={() => setView("calendar")}
            aria-pressed={view === "calendar"}
            className={`${mobileBarItem} ${view === "calendar" ? "text-accent-violet" : "opacity-60"}`}
          >
            <CalendarDays className="h-5 w-5" />
            Agenda
          </button>

          {/* Bascule de thème — côté droit */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Changer le thème"
            className={`${mobileBarItem} absolute bottom-2 right-3 opacity-60`}
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            Thème
          </button>
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
            {/* Menu (mobile) : thème + compte + admin regroupés. */}
            <div className="md:hidden absolute right-0 top-1 z-10">
              <MobileMenu />
            </div>
            <div className={`flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 transition-all duration-300 ${isHeaderSticky ? 'py-2' : 'py-4'}`}>
              <div className="flex justify-start">
                <img
                  src={theme === 'light' ? '/images/ephemeride-logo-lite.png' : '/images/ephemeride-logo-dark.png'}
                  alt="Ephemeride"
                  className={`w-auto max-w-full object-contain transition-all duration-300 ${isHeaderSticky ? 'h-12 md:h-20' : 'h-16 md:h-32'}`}
                />
              </div>

              {/* Switch de vue dans le header (desktop) ; sur mobile il est dans
                  le menu du bas. */}
              <div className="hidden md:block">{viewToggle}</div>

              <div className="hidden md:flex gap-4 items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0} className="outline-none focus:ring-2 focus:ring-ring rounded-md">
                      <ThemeToggle />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Changer le thème
                  </TooltipContent>
                </Tooltip>
                <AccountMenu />
                <Button
                  onClick={() => setIsProposalDialogOpen(true)}
                  variant="outline"
                  className="rounded-full bg-accent-peach text-accent-peach-foreground border-transparent hover:bg-accent-peach-hover hover:text-accent-peach-foreground shadow-sm font-medium"
                >
                  Proposer un événement
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className={`flex-1 container mx-auto px-4 md:px-8 py-8 md:py-12 ${isHeaderSticky ? 'mt-32 md:mt-40' : ''}`}>
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
            {/* Compteur + dernière mise à jour (déplacés depuis le haut de page). */}
            <p className="text-sm font-normal opacity-70">
              {upcomingCount} événements sont recensés au moment où vous consultez cette page
            </p>
            {formattedLastUpdated && (
              <p className="text-sm font-normal opacity-70">
                <span className="underline font-medium">dernière mise à jour</span> : {formattedLastUpdated}
              </p>
            )}
            <p className="text-sm font-normal opacity-70 pt-2">
              L'AGENDA CULTUREL ET CITOYEN DU VIGNOBLE NANTAIS
            </p>
            {/* Logo Tipeee cliquable (affiché seulement si une URL est configurée) */}
            <TipeeeFooterLogo />
          </div>
        </footer>

        <Dialog open={isProposalDialogOpen} onOpenChange={setIsProposalDialogOpen}>
          <DialogContent className="dark:bg-ephemeride-light light:bg-[#f8f8f6] border-none dark:text-ephemeride-foreground light:text-ephemeride max-w-3xl max-h-[90vh] overflow-y-auto">
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
