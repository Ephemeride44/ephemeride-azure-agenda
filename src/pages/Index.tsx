
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import EventList from "@/components/EventList";
import { Event } from "@/lib/types";
import { sampleEvents } from "@/lib/sample-data";

const Index = () => {
  const [events] = useState<Event[]>(sampleEvents);

  return (
    <div className="min-h-screen bg-ephemeride flex flex-col">
      <header className="py-8 px-4 md:px-8">
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            <img 
              src="/lovable-uploads/131a8b24-2c42-453d-8e62-bb48e8c55b00.png" 
              alt="Ephemeride" 
              className="h-12 md:h-16"
            />
            <Button 
              asChild
              variant="outline" 
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Link to="/admin">Administration</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 md:px-8 py-8">
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
    </div>
  );
};

export default Index;
