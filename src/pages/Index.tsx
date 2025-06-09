import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import EventList from "@/components/EventList";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";
import type { Database } from "@/lib/database.types";
import { supabase as baseSupabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EventProposalForm from "@/components/EventProposalForm";
import BackToTop from "@/components/BackToTop";
import { Shield } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { SupabaseClient, User } from '@supabase/supabase-js';

// HACK : cast temporaire pour ignorer le typage strict de Supabase
const supabase: SupabaseClient = baseSupabase;

type Event = Database["public"]["Tables"]["events"]["Row"];
type Theme = Database["public"]["Tables"]["themes"]["Row"];

const Index = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [eventsAdded, setEventsAdded] = useState(false);
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

  // Function to add new events
  const addNewEvents = async () => {
    if (eventsAdded) return; // Éviter d'ajouter plusieurs fois

    const newEvents = [
      {
        name: "Supertramp",
        datetime: "samedi 14 juin 2025 de 20h30 à 22h30",
        date: "2025-06-14",
        end_time: "22h30",
        location_place: "La Quintaine",
        location_city: "SAINT-JULIEN-DE-CONCELLES",
        location_department: "44",
        url: "https://www.levignobledenantes-tourisme.com/agenda/supertramp/",
        status: "accepted"
      },
      {
        name: "Fête de la musique",
        datetime: "samedi 14 juin 2025 de 18h00 à 00h00",
        date: "2025-06-14",
        end_time: "00h00",
        location_place: "centre-ville",
        location_city: "CLISSON",
        location_department: "44",
        url: "https://www.levignobledenantes-tourisme.com/agenda/fete-de-la-musique-5/",
        status: "accepted"
      },
      {
        name: "Alinéa autour d'un livre",
        datetime: "samedi 14 juin 2025 de 16h00 à 18h00",
        date: "2025-06-14",
        end_time: "18h00",
        location_place: "Médiathèque le Passe Muraille",
        location_city: "SAINT-JULIEN-DE-CONCELLES",
        location_department: "44",
        url: "https://www.levignobledenantes-tourisme.com/agenda/alinea-autour-dun-livre-a-la-mediatheque-le-passe-muraille-a-saint-julien-de-concelles/",
        status: "accepted"
      },
      {
        name: "Concert Cocodri",
        datetime: "samedi 14 juin 2025 de 19h00 à 20h00",
        date: "2025-06-14",
        end_time: "20h00",
        location_place: "La Pierre Percée",
        location_city: "DIVATTE-SUR-LOIRE",
        location_department: "44",
        url: "https://www.levignobledenantes-tourisme.com/agenda/concert-cocodri-a-la-pierre-percee/",
        status: "accepted"
      },
      {
        name: "Concert Fó da Garoa",
        datetime: "samedi 14 juin 2025 de 20h30 à 22h00",
        date: "2025-06-14",
        end_time: "22h00",
        location_place: "La Pierre Percée",
        location_city: "DIVATTE-SUR-LOIRE",
        location_department: "44",
        url: "https://www.levignobledenantes-tourisme.com/agenda/concert-fo-da-garoa/",
        status: "accepted"
      },
      {
        name: "Escape Game à Pont Caffino",
        datetime: "samedi 14 juin 2025 de 14h00 à 18h00",
        date: "2025-06-14",
        end_time: "18h00",
        location_place: "Carrière",
        location_city: "MAISDON-SUR-SEVRE",
        location_department: "44",
        url: "https://www.levignobledenantes-tourisme.com/agenda/escape-game-a-pont-caffino-3/",
        status: "accepted"
      },
      {
        name: "Fête de la fleur de Vigne",
        datetime: "dimanche 15 juin 2025 de 10h00 à 18h00",
        date: "2025-06-15",
        end_time: "18h00",
        location_place: "Château de la Frémoire",
        location_city: "VERTOU",
        location_department: "44",
        url: "https://www.levignobledenantes-tourisme.com/agenda/fete-de-la-fleur-de-vigne/",
        status: "accepted"
      },
      {
        name: "Les secrets de la Loire",
        datetime: "dimanche 15 juin 2025 de 10h30 à 12h30",
        date: "2025-06-15",
        end_time: "12h30",
        location_place: "La Chebuette",
        location_city: "SAINT-JULIEN-DE-CONCELLES",
        location_department: "44",
        url: "https://www.levignobledenantes-tourisme.com/agenda/les-secrets-de-la-loire-au-depart-de-saint-julien-de-concelles/",
        status: "accepted"
      },
      {
        name: "Visite guidée – Les Secrets de la Loire",
        datetime: "dimanche 15 juin 2025 de 15h00 à 17h00",
        date: "2025-06-15",
        end_time: "17h00",
        location_place: "Pierre-Perçée",
        location_city: "DIVATTE-SUR-LOIRE",
        location_department: "44",
        url: "https://www.levignobledenantes-tourisme.com/agenda/visite-guidee-les-secrets-de-la-loire-dans-le-cadre-de-debord-de-loire-au-depart-de-la-pierre-percee-a-divatte-sur-loire/",
        status: "accepted"
      },
      {
        name: "Les Dimanches au Port",
        datetime: "dimanche 15 juin 2025 de 11h00 à 17h00",
        date: "2025-06-15",
        end_time: "17h00",
        location_place: "Port communal",
        location_city: "LA HAIE-FOUASSIERE",
        location_department: "44",
        url: "https://www.levignobledenantes-tourisme.com/agenda/les-dimanches-au-port-12/",
        status: "accepted"
      },
      {
        name: "Sanseverino & Lise Cabaret",
        datetime: "dimanche 15 juin 2025 de 18h00 à 20h00",
        date: "2025-06-15",
        end_time: "20h00",
        location_place: "La Pierre Percée",
        location_city: "DIVATTE-SUR-LOIRE",
        location_department: "44",
        url: "https://www.levignobledenantes-tourisme.com/agenda/sanseverino-lise-cabaret/",
        status: "accepted"
      },
      {
        name: "Présentation des techniques ancestrales ligériennes de pêche",
        datetime: "dimanche 15 juin 2025 de 10h00 à 12h00",
        date: "2025-06-15",
        end_time: "12h00",
        location_place: "Bords de Loire",
        location_city: "DIVATTE-SUR-LOIRE",
        location_department: "44",
        url: "https://www.levignobledenantes-tourisme.com/agenda/presentation-des-techniques-ancestrales-ligeriennes-de-peche/",
        status: "accepted"
      },
      {
        name: "La Nature nous émerveille",
        datetime: "dimanche 15 juin 2025 de 10h00 à 17h00",
        date: "2025-06-15",
        end_time: "17h00",
        location_city: "HAUTE-GOULAINE",
        location_department: "44",
        url: "https://www.levignobledenantes-tourisme.com/agenda/la-nature-nous-emerveille-5/",
        status: "accepted"
      },
      {
        name: "Débord de Loire",
        datetime: "dimanche 15 juin 2025 de 12h00 à 18h00",
        date: "2025-06-15",
        end_time: "18h00",
        location_place: "Quai",
        location_city: "SAINT-JULIEN-DE-CONCELLES",
        location_department: "44",
        url: "https://www.levignobledenantes-tourisme.com/agenda/debord-de-loire/",
        status: "accepted"
      },
      {
        name: "Couleurs de Loire",
        datetime: "du mardi 10 juin au dimanche 15 juin 2025 de 10h00 à 18h00",
        date: "2025-06-10",
        end_time: "18h00",
        location_city: "SAINT-JULIEN-DE-CONCELLES",
        location_department: "44",
        url: "https://www.levignobledenantes-tourisme.com/agenda/couleurs-de-loire-3/",
        status: "accepted"
      },
      {
        name: "Fest Deiz",
        datetime: "dimanche 15 juin 2025 de 15h00 à 17h00",
        date: "2025-06-15",
        end_time: "17h00",
        location_place: "Musée du Vignoble Nantais",
        location_city: "LE PALLET",
        location_department: "44",
        url: "https://www.levignobledenantes-tourisme.com/agenda/fest-deiz/",
        status: "accepted"
      }
    ];

    try {
      console.log('Début de l\'ajout des événements...');
      const { data, error } = await supabase
        .from('events')
        .insert(newEvents);
      
      if (error) {
        console.error('Erreur lors de l\'ajout des événements :', error);
      } else {
        console.log('Événements ajoutés avec succès');
        setEventsAdded(true);
        // Refresh the events list
        const { data: updatedEvents, error: fetchError } = await supabase
          .from('events')
          .select('*, theme:theme_id(*)')
          .eq('status', 'accepted')
          .order('date', { nullsFirst: false })
          .order('datetime');
        
        if (!fetchError && updatedEvents) {
          setEvents(updatedEvents as Event[]);
        }
      }
    } catch (error) {
      console.error('Erreur :', error);
    }
  };

  // Add events when component mounts
  useEffect(() => {
    if (events.length > 0 && !eventsAdded) {
      // Vérifie s'il y a déjà des événements de juin 2025
      const hasJuneEvents = events.some(event => event.date?.startsWith('2025-06'));
      if (!hasJuneEvents) {
        addNewEvents();
      }
    }
  }, [events, eventsAdded]);

  return (
    <div className="min-h-screen flex flex-col dark:bg-ephemeride light:bg-[#faf3ec]">
      <header className={`py-4 px-4 md:px-8 transition-all duration-300 z-10 ${isHeaderSticky ? 'fixed top-0 left-0 right-0 dark:bg-ephemeride/95 light:bg-[#faf3ec]/95 shadow-md backdrop-blur-sm' : ''}`}>
        <div className="max-w-4xl mx-auto">
          <div className={`flex flex-col md:flex-row items-center justify-between transition-all duration-300 ${isHeaderSticky ? 'py-2' : 'py-4'}`}>
            <div className="flex justify-start">
              {/* Logos encore plus gros */}
              <img 
                src={theme === 'light' ? '/lovable-uploads/276e159d-8434-4c77-947f-731eaf4b8606.png' : '/lovable-uploads/5bf9022e-e505-4018-a848-1c576760dd26.png'}
                alt="Ephemeride" 
                className={`transition-all duration-300 ${isHeaderSticky ? 'h-32' : 'h-56 md:h-60'}`}
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
