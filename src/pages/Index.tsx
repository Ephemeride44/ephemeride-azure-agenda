import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import EventList from "@/components/EventList";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";
import { Event, Theme } from "@/lib/types";
import { supabase as baseSupabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EventProposalForm from "@/components/EventProposalForm";
import BackToTop from "@/components/BackToTop";
import { Shield } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

// HACK : cast temporaire pour ignorer le typage strict de Supabase
const supabase: any = baseSupabase;

const Index = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { theme } = useTheme();

  // Add scroll event listener to detect when to make the header sticky
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsHeaderSticky(true);
      } else {
        setIsHeaderSticky(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, theme:theme_id(*)')
        .eq('status', 'accepted')
        .order('date', { nullsFirst: false })
        .order('datetime');
      if (error) {
        console.error('Erreur lors du chargement des événements :', error);
        return;
      }
      if (data) {
        setEvents(
          data.map((event: any) => ({
            id: event.id,
            datetime: event.datetime,
            endTime: event.end_time ?? undefined,
            name: event.name,
            location: {
              place: event.location_place ?? '',
              city: event.location_city ?? '',
              department: event.location_department ?? '',
            },
            price: event.price ?? '',
            audience: event.audience ?? '',
            url: event.url ?? undefined,
            emoji: event.emoji ?? undefined,
            theme_id: event.theme_id ?? null,
            theme: event.theme ?? null,
            date: event.date ?? null,
            updated_at: event.updated_at ?? null,
          }))
        );
      }
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col dark:bg-ephemeride light:bg-[#faf3ec]">
      <header className={`py-4 px-4 md:px-8 transition-all duration-300 z-10 ${isHeaderSticky ? 'fixed top-0 left-0 right-0 dark:bg-ephemeride/95 light:bg-[#faf3ec]/95 shadow-md backdrop-blur-sm' : ''}`}>
        <div className="max-w-4xl mx-auto">
          <div className={`flex flex-col md:flex-row items-center justify-between transition-all duration-300 ${isHeaderSticky ? 'py-2' : 'py-4'}`}>
            <div className="flex justify-start">
              {/* Use different logos for light and dark themes */}
              <img 
                src={theme === 'light' ? '/images/ephemeride-logo-lite.png' : '/images/ephemeride-logo-dark.png'}
                alt="Ephemeride" 
                className={`transition-all duration-300 ${isHeaderSticky ? 'h-12' : 'h-20 md:h-24'}`}
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
              {user && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      asChild
                      variant="outline"
                      size="icon"
                      className={`border-white/20 hover:bg-white/20 ${
                        theme === 'light' 
                          ? 'bg-white/10 text-ephemeride' 
                          : 'bg-white/10 text-[#faf3ec]'
                      }`}
                    >
                      <Link to="/admin">
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
                className={
                  theme === 'light'
                    ? 'bg-[#fff7e6] text-[#1B263B] border-[#f3e0c7] hover:bg-[#ffe2b0] hover:text-[#1B263B] shadow-sm'
                    : 'bg-white text-ephemeride hover:bg-white/90 border-white/20'
                }
              >
                Proposer un événement
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className={`flex-1 container mx-auto px-4 md:px-8 py-8 ${isHeaderSticky ? 'mt-32 md:mt-24' : ''}`}>
        <div className="max-w-4xl mx-auto">
          <EventList events={events} />
        </div>
      </main>

      <footer className="border-t border-white/10 py-6 px-4 md:px-8 dark:border-white/10 light:border-ephemeride/10">
        <div className="container mx-auto text-center">
          <p className="text-sm font-normal opacity-70">
            L'AGENDA CULTUREL ET CITOYEN DU VIGNOBLE NANTAIS
          </p>
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
  );
};

export default Index;
