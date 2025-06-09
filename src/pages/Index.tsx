import BackToTop from "@/components/BackToTop";
import EventList from "@/components/EventList";
import EventProposalForm from "@/components/EventProposalForm";
import { useTheme } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase as baseSupabase } from "@/integrations/supabase/client";
import type { Database } from "@/lib/database.types";
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const supabase: SupabaseClient = baseSupabase;

type Event = Database["public"]["Tables"]["events"]["Row"];

const Index = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  const [user, setUser] = useState<User | null>(null);
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
        setEvents(data as Event[]);
      }
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col dark:bg-ephemeride light:bg-[#faf3ec]">
      <header className={`py-4 px-4 md:px-8 transition-all duration-300 z-20 ${isHeaderSticky ? 'fixed top-0 left-0 right-0 dark:bg-ephemeride/95 light:bg-[#faf3ec]/95 shadow-md backdrop-blur-3xl dark:backdrop-blur-sm' : ''}`}>
        <div className="max-w-4xl mx-auto">
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
              {user && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      asChild
                      variant="outline"
                      size="icon"
                      className={
                        theme === 'light'
                          ? 'bg-[#fff7e6] text-[#1B263B] border-[#f3e0c7] hover:bg-[#ffe2b0] hover:text-[#1B263B] shadow-sm'
                          : 'bg-white/10 text-[#faf3ec]'
                      }
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
                    : 'bg-white/10 text-[#faf3ec]'
                }
              >
                Proposer un événement
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className={`flex-1 container mx-auto px-4 md:px-8 py-8 ${isHeaderSticky ? 'mt-48 md:mt-40' : ''}`}>
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
