
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import EventList from "@/components/EventList";
import { Event } from "@/lib/types";
import { sampleEvents } from "@/lib/sample-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EventProposalForm from "@/components/EventProposalForm";

const Index = () => {
  const [events] = useState<Event[]>(sampleEvents);
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);

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
    <div className="min-h-screen bg-ephemeride flex flex-col">
      <header className={`py-4 px-4 md:px-8 transition-all duration-300 z-10 ${isHeaderSticky ? 'fixed top-0 left-0 right-0 bg-ephemeride shadow-md' : ''}`}>
        <div className="container mx-auto">
          <div className={`flex flex-col md:flex-row items-center justify-between transition-all duration-300 ${isHeaderSticky ? 'py-2' : 'py-4'}`}>
            <div className="w-full flex justify-center mb-4 md:mb-0">
              <img 
                src="/lovable-uploads/131a8b24-2c42-453d-8e62-bb48e8c55b00.png" 
                alt="Ephemeride" 
                className={`transition-all duration-300 ${isHeaderSticky ? 'h-12' : 'h-24 md:h-32'}`}
              />
            </div>
            <div className="flex gap-4">
              <Button 
                onClick={() => setIsProposalDialogOpen(true)}
                variant="outline" 
                className="bg-white text-ephemeride hover:bg-white/90 border-white/20"
              >
                Proposer un événement
              </Button>
              <Button 
                asChild
                variant="outline" 
                className="bg-white text-ephemeride hover:bg-white/90 border-white/20"
              >
                <Link to="/admin">Administration</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className={`flex-1 container mx-auto px-4 md:px-8 py-8 ${isHeaderSticky ? 'mt-32 md:mt-24' : ''}`}>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-8">Événements à venir</h1>
          
          <EventList events={events} />
        </div>
      </main>

      <footer className="border-t border-white/10 py-6 px-4 md:px-8">
        <div className="container mx-auto text-center">
          <p className="text-sm opacity-70">
            L'AGENDA CULTUREL ET CITOYEN DU VIGNOBLE NANTAIS
          </p>
        </div>
      </footer>

      <Dialog open={isProposalDialogOpen} onOpenChange={setIsProposalDialogOpen}>
        <DialogContent className="bg-ephemeride-light border-none text-ephemeride-foreground max-w-3xl max-h-[90vh] overflow-y-auto">
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
