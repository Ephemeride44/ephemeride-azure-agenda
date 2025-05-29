import EventForm from "@/components/EventForm";
import AdminLayout from "@/components/events/AdminLayout";
import EventsHeader from "@/components/events/EventsHeader";
import EventsPagination from "@/components/events/EventsPagination";
import EventsTable from "@/components/events/EventsTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Event, Theme } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import EventsSearchBar from "@/components/events/EventsSearchBar";

const AdminDashboard = () => {
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
  const [acceptedEvents, setAcceptedEvents] = useState<Event[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [showForm, setShowForm] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | undefined>(undefined);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/admin");
      } else {
        fetchPendingEvents();
        fetchAcceptedEvents();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, page, debouncedSearch]);

  useEffect(() => {
    // Charger les thèmes au montage
    const fetchThemes = async () => {
      const { data, error } = await supabase.from("themes").select("*").order("name");
      if (!error && data) setThemes(data);
    };
    fetchThemes();
  }, []);

  const fetchPendingEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*, theme:theme_id(*)')
      .eq('status', 'pending')
      .order('date', { ascending: false })
      .order('datetime', { ascending: false });
    if (error) {
      console.error('Erreur lors du chargement des événements en attente :', error);
      return;
    }
    setPendingEvents((data || []).map(({end_time, location_place, location_city, location_department, ...event}: any) => ({
      ...event,
      endTime: end_time ?? undefined,          
      location: {
        place: location_place ?? '',
        city: location_city ?? '',
        department: location_department ?? '',
      }
    })));
  };

  const fetchAcceptedEvents = async () => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from('events')
      .select('*, theme:theme_id(*)', { count: 'exact' })
      .eq('status', 'accepted')
      .order('date', { ascending: false })
      .order('datetime', { ascending: false })
      .range(from, to);
    if (search) {
      const lower = debouncedSearch.toLowerCase();
      query = query.or(
        `name.ilike.%${lower}%,datetime.ilike.%${lower}%,location_place.ilike.%${lower}%,location_city.ilike.%${lower}%`
      );
    }
    const { data, error, count } = await query;
    if (error) {
      console.error('Erreur lors du chargement des événements acceptés :', error);
      return;
    }
    setAcceptedEvents((data || []).map(({end_time, location_place, location_city, location_department, ...event}: any) => ({
      ...event,
      endTime: end_time ?? undefined,          
      location: {
        place: location_place ?? '',
        city: location_city ?? '',
        department: location_department ?? '',
      }
    })));
    setTotal(count || 0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
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

  const confirmDeleteEvent = (id: string) => {
    const event = acceptedEvents.find(e => e.id === id);
    if (!event) return;
    setEventToDelete(event);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!eventToDelete) return;
    const { error } = await supabase.from('events').delete().eq('id', eventToDelete.id);
    if (error) {
      toast({
        title: "Erreur lors de la suppression",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setAcceptedEvents(acceptedEvents.filter(event => event.id !== eventToDelete.id));
      toast({
        title: "Événement supprimé",
        description: "L'événement a été supprimé avec succès",
      });
    }
    setShowDeleteConfirm(false);
    setEventToDelete(null);
  };

  const handleSaveEvent = async (eventData: Omit<Event, 'id'> & { id?: string }) => {
    let success = false;
    if (eventData.id) {
      // Update existing event dans Supabase
      const { error } = await supabase
        .from('events')
        .update({
          datetime: eventData.datetime,
          date: eventData.date || null,
          end_time: eventData.endTime ?? null,
          name: eventData.name,
          location_place: eventData.location?.place ?? null,
          location_city: eventData.location?.city ?? null,
          location_department: eventData.location?.department ?? null,
          price: eventData.price,
          audience: eventData.audience,
          url: eventData.url ?? null,
          emoji: eventData.emoji ?? null,
          theme_id: eventData.theme_id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventData.id);
      if (error) {
        toast({
          title: "Erreur lors de la mise à jour",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Événement mis à jour",
          description: "L'événement a été mis à jour avec succès",
        });
        success = true;
      }
    } else {
      // Add new event dans Supabase
      const { error } = await supabase
        .from('events')
        .insert({
          id: Date.now().toString(),
          datetime: eventData.datetime,
          date: eventData.date || null,
          end_time: eventData.endTime ?? null,
          name: eventData.name,
          location_place: eventData.location?.place ?? null,
          location_city: eventData.location?.city ?? null,
          location_department: eventData.location?.department ?? null,
          price: eventData.price,
          audience: eventData.audience,
          url: eventData.url ?? null,
          emoji: eventData.emoji ?? null,
          theme_id: eventData.theme_id ?? null,
          updated_at: new Date().toISOString(),
        });
      if (error) {
        toast({
          title: "Erreur lors de la création",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Événement créé",
          description: "Le nouvel événement a été créé avec succès",
        });
        success = true;
      }
    }
    // Rafraîchir la liste
    if (success) {
      await fetchPendingEvents();
      await fetchAcceptedEvents();
      setShowForm(false);
    }
    return success;
  };

  // Barre de recherche
  const filteredEvents = useMemo(() => {
    if (!debouncedSearch) return acceptedEvents;
    const lower = debouncedSearch.toLowerCase();
    return acceptedEvents.filter(e =>
      e.name.toLowerCase().includes(lower) ||
      e.datetime.toLowerCase().includes(lower) ||
      e.location.place.toLowerCase().includes(lower) ||
      e.location.city.toLowerCase().includes(lower)
    );
  }, [debouncedSearch, acceptedEvents]);


  return (
    <AdminLayout>
      <EventsHeader 
        onAdd={handleAddEvent}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher par nom, date ou lieu..."
      />
      {/* Section événements en attente */}
      {pendingEvents.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-orange-600">Événements en attente de validation</h2>
          <table className="w-full text-left mb-4">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Nom</th>
                <th className="px-6 py-3 font-medium">Lieu</th>
                <th className="px-6 py-3 font-medium">Proposé par</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingEvents.map(event => (
                <tr key={event.id} className="border-b border-white/10">
                  <td className="px-6 py-4">{event.datetime}</td>
                  <td className="px-6 py-4">{event.name}</td>
                  <td className="px-6 py-4">{event.location.place}<br/>{event.location.city}</td>
                  <td className="px-6 py-4">
                    {event.createdby?.name}<br/>
                    <a href={`mailto:${event.createdby?.email}`} className="underline text-blue-600">{event.createdby?.email}</a>
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => { setCurrentEvent(event); setShowForm(true); }}>Voir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Tableau principal des événements */}
      <EventsTable events={filteredEvents} onEdit={handleEditEvent} onDelete={confirmDeleteEvent} />
      <EventsPagination page={page} total={total} pageSize={pageSize} onPageChange={setPage} />
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-3/4 max-w-4xl mx-auto">
          <DialogHeader>
            <DialogTitle>{currentEvent ? (currentEvent.status === 'pending' ? "Valider une proposition" : "Modifier l'événement") : "Ajouter un événement"}</DialogTitle>
          </DialogHeader>
          {currentEvent && (
            <EventForm
              event={currentEvent}
              onSave={async (eventData) => {
                console.log(eventData);
                // Mapping camelCase vers snake_case pour la base
                const mappedData = {
                  ...eventData,
                  end_time: eventData.endTime ?? null,
                  location_place: eventData.location?.place ?? null,
                  location_city: eventData.location?.city ?? null,
                  location_department: eventData.location?.department ?? null,
                  theme_id: eventData.theme_id ?? null,
                  updated_at: new Date().toISOString(),
                };
                delete mappedData.endTime;
                delete mappedData.location;
                delete mappedData.theme;

                // Si on clique sur Accepter, on passe le statut à accepted
                if (eventData.status === 'accepted') {
                  await supabase.from('events').update({ ...mappedData, status: 'accepted' }).eq('id', currentEvent.id);
                  setShowForm(false);
                  await fetchPendingEvents();
                  await fetchAcceptedEvents();
                  toast({ title: "Événement accepté", description: "L'événement a été accepté." });
                  return true;
                } else if (eventData.status === 'rejected') {
                  await supabase.from('events').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', currentEvent.id);
                  setShowForm(false);
                  await fetchPendingEvents();
                  await fetchAcceptedEvents();
                  toast({ title: "Événement refusé", description: "L'événement a été refusé." });
                  return true;
                } else {
                  // Edition classique
                  await handleSaveEvent({ ...eventData, id: currentEvent.id });
                  return true;
                }
              }}
              onCancel={() => setShowForm(false)}
              showValidationActions={currentEvent.status === 'pending'}
              themes={themes}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p>Voulez-vous vraiment supprimer l'événement <b>{eventToDelete?.name}</b> ?</p>
          <div className="flex justify-end gap-2 mt-4">
            <button
              className="btn btn-secondary"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Annuler
            </button>
            <button
              className="btn btn-danger"
              onClick={handleDeleteConfirmed}
            >
              Supprimer
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminDashboard;
