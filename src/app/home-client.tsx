"use client";

import BackToTop from "@/components/BackToTop";
import { TipeeeProvider, TipeeeBanner, TipeeeFooterLogo } from "@/components/TipeeeSupport";
import EventList from "@/components/EventList";
import EventProposalForm from "@/components/EventProposalForm";
import { useTheme } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { Shield } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useUserRoleContext } from "@/components/UserRoleProvider";
import {
  applyFiltersToEvents,
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
  // Filtres : valeurs par défaut au rendu serveur, hydratées depuis l'URL après montage.
  const [filterValues, setFilterValues] = useState<FilterValues>(() =>
    readFilterValues(new URLSearchParams()),
  );
  const { theme } = useTheme();
  const { user: contextUser, isSuperAdmin, organizations, isLoading } = useUserRoleContext();

  // Au montage : lit les filtres portés par l'URL (partage / retour navigateur).
  useEffect(() => {
    setFilterValues(readFilterValues(new URLSearchParams(window.location.search)));
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

  return (
    <TipeeeProvider>
      <div className="min-h-screen flex flex-col dark:bg-ephemeride light:bg-[#faf3ec]">
        {/* Bandeau de soutien Tipeee, tout en haut (affiché si activé dans l'admin) */}
        <TipeeeBanner />

        <header className={`py-4 px-4 md:px-8 transition-all duration-300 z-20 ${isHeaderSticky ? 'fixed top-0 left-0 right-0 dark:bg-ephemeride/95 light:bg-[#faf3ec]/95 shadow-md backdrop-blur-3xl dark:backdrop-blur-sm' : ''}`}>
          <div className="max-w-6xl mx-auto">
            <div className={`flex flex-col md:flex-row items-center justify-between transition-all duration-300 ${isHeaderSticky ? 'py-2' : 'py-4'}`}>
              <div className="flex justify-start">
                <img
                  src={theme === 'light' ? '/images/ephemeride-logo-lite.png' : '/images/ephemeride-logo-dark.png'}
                  alt="Ephemeride"
                  className={`transition-all duration-300 ${isHeaderSticky ? 'h-20' : 'h-32 md:h-32'}`}
                />
              </div>
              <div className="flex gap-4 items-center">
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
                {contextUser && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        asChild
                        variant="outline"
                        size="icon"
                        className="bg-accent-peach text-accent-peach-foreground border-transparent hover:bg-accent-peach-hover hover:text-accent-peach-foreground shadow-sm"
                      >
                        <Link href="/admin">
                          <Shield size={22} />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Administration
                    </TooltipContent>
                  </Tooltip>
                )}
                <Button
                  onClick={() => setIsProposalDialogOpen(true)}
                  variant="outline"
                  className="bg-accent-peach text-accent-peach-foreground border-transparent hover:bg-accent-peach-hover hover:text-accent-peach-foreground shadow-sm font-medium"
                >
                  Proposer un événement
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className={`flex-1 container mx-auto px-4 md:px-8 py-8 md:py-12 ${isHeaderSticky ? 'mt-48 md:mt-40' : ''}`}>
          <div className="max-w-6xl mx-auto">
            <EventList
              events={filteredEvents}
              pastEvents={filteredPastEvents}
              onLoadPastEvents={fetchPastEvents}
              lastUpdatedAt={lastUpdatedAt}
              filterOptions={filterOptions}
              filterValues={filterValues}
              onFilterChange={handleFilterChange}
              onFilterReset={handleFilterReset}
            />
          </div>
        </main>

        <footer className="border-t border-white/10 py-6 px-4 md:px-8 dark:border-white/10 light:border-ephemeride/10">
          <div className="container mx-auto text-center">
            <p className="text-sm font-normal opacity-70">
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

        {/* Add Back to Top button */}
        <BackToTop />
      </div>
    </TipeeeProvider>
  );
};

export default HomeClient;
