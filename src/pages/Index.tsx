
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import EventList from "@/components/EventList";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";
import { Event } from "@/lib/types";
import { sampleEvents } from "@/lib/sample-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EventProposalForm from "@/components/EventProposalForm";

const Index = () => {
  // Filter out test events from May 19 and 20
  const filteredEvents = sampleEvents.filter(event => {
    // Check if it's not May 19 or May 20
    return !event.datetime.includes("lundi 19 mai 2025") && 
           !event.datetime.includes("mardi 20 mai 2025");
  });
  
  const [events] = useState<Event[]>(filteredEvents);
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
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

  return (
    <div className="min-h-screen flex flex-col dark:bg-ephemeride light:bg-[#faf3ec]">
      <header className={`py-4 px-4 md:px-8 transition-all duration-300 z-10 ${isHeaderSticky ? 'fixed top-0 left-0 right-0 dark:bg-ephemeride/95 light:bg-[#faf3ec]/95 shadow-md backdrop-blur-sm' : ''}`}>
        <div className="container mx-auto">
          <div className={`flex flex-col md:flex-row items-center justify-between transition-all duration-300 ${isHeaderSticky ? 'py-2' : 'py-4'}`}>
            <div className="flex justify-start">
              {theme === 'light' ? (
                <img 
                  src="/lovable-uploads/1f2f7642-583f-45b5-bddd-2c5f1276b430.png" 
                  alt="Ephemeride" 
                  className={`transition-all duration-300 ${isHeaderSticky ? 'h-20' : 'h-32 md:h-40'}`}
                />
              ) : (
                <img 
                  src="/lovable-uploads/f285eade-aadf-47e3-80d0-a33c668ff99d.png" 
                  alt="Ephemeride" 
                  className={`transition-all duration-300 ${isHeaderSticky ? 'h-20' : 'h-32 md:h-40'}`}
                />
              )}
            </div>
            <div className="flex gap-4 items-center">
              <ThemeToggle />
              <Button 
                onClick={() => setIsProposalDialogOpen(true)}
                variant="outline" 
                className="bg-white text-ephemeride hover:bg-white/90 border-white/20 dark:bg-white dark:text-ephemeride dark:hover:bg-white/90 light:bg-ephemeride light:text-white light:hover:bg-ephemeride/90"
              >
                Proposer un événement
              </Button>
              <Button 
                asChild
                variant="outline" 
                className="bg-white text-ephemeride hover:bg-white/90 border-white/20 dark:bg-white dark:text-ephemeride dark:hover:bg-white/90 light:bg-ephemeride light:text-white light:hover:bg-ephemeride/90"
              >
                <Link to="/admin">Administration</Link>
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
    </div>
  );
};

export default Index;
