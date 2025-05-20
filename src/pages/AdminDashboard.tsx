
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Event } from "@/lib/types";
import { sampleEvents } from "@/lib/sample-data";
import EventForm from "@/components/EventForm";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash } from "lucide-react";

const AdminDashboard = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | undefined>(undefined);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication
    const isAdmin = localStorage.getItem("ephemeride-admin") === "true";
    setIsAuthenticated(isAdmin);
    
    if (!isAdmin) {
      navigate("/admin");
      return;
    }
    
    // Load events (in a real app, this would be from an API/database)
    setEvents(sampleEvents);
    setIsLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("ephemeride-admin");
    setIsAuthenticated(false);
    navigate("/admin");
  };

  const handleAddEvent = () => {
    setCurrentEvent(undefined);
    setShowForm(true);
  };

  const handleEditEvent = (event: Event) => {
    setCurrentEvent(event);
    setShowForm(true);
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(events.filter(event => event.id !== id));
    
    toast({
      title: "Événement supprimé",
      description: "L'événement a été supprimé avec succès",
    });
  };

  const handleSaveEvent = (eventData: Omit<Event, 'id'> & { id?: string }) => {
    if (eventData.id) {
      // Update existing event
      setEvents(events.map(event => 
        event.id === eventData.id ? { ...eventData, id: event.id } as Event : event
      ));
      
      toast({
        title: "Événement mis à jour",
        description: "L'événement a été mis à jour avec succès",
      });
    } else {
      // Add new event
      const newEvent = {
        ...eventData,
        id: Date.now().toString(), // Simple ID generation
      } as Event;
      
      setEvents([...events, newEvent]);
      
      toast({
        title: "Événement créé",
        description: "Le nouvel événement a été créé avec succès",
      });
    }
    
    setShowForm(false);
  };

  if (!isAuthenticated || isLoading) {
    return <div className="min-h-screen bg-ephemeride flex items-center justify-center">
      <p className="text-white">Chargement...</p>
    </div>;
  }

  return (
    <div className="min-h-screen bg-ephemeride flex flex-col">
      <header className="py-4 px-4 md:px-8 border-b border-white/10">
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            <Link to="/">
              <img 
                src="/lovable-uploads/131a8b24-2c42-453d-8e62-bb48e8c55b00.png" 
                alt="Ephemeride" 
                className="h-10"
              />
            </Link>
            <div className="flex items-center gap-4">
              <Button 
                asChild
                variant="ghost" 
                className="text-white hover:bg-white/10"
              >
                <Link to="/">Voir le site</Link>
              </Button>
              <Button 
                variant="outline" 
                className="border-white/20 text-white hover:bg-white/10"
                onClick={handleLogout}
              >
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 md:px-8 py-8">
        {showForm ? (
          <div className="max-w-4xl mx-auto">
            <EventForm 
              event={currentEvent}
              onSave={handleSaveEvent}
              onCancel={() => setShowForm(false)}
            />
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-2xl font-bold">Gestion des événements</h1>
              <Button 
                className="bg-white text-ephemeride hover:bg-white/80"
                onClick={handleAddEvent}
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un événement
              </Button>
            </div>
            
            <div className="bg-ephemeride-light rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Nom</th>
                    <th className="px-6 py-3 font-medium">Lieu</th>
                    <th className="px-6 py-3 font-medium w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="border-b border-white/10">
                      <td className="px-6 py-4">{event.datetime}</td>
                      <td className="px-6 py-4">{event.name}</td>
                      <td className="px-6 py-4">{event.location.city}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0 text-white hover:bg-white/10"
                            onClick={() => handleEditEvent(event)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0 text-white hover:bg-white/10"
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
