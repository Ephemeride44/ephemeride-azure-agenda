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
  const [events, setEvents] = useState<Event[]>([]);
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
        fetchEvents(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, page, debouncedSearch]);

  const fetchEvents = async (isInitial = false) => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from('events')
      .select('*, theme:theme_id(*)', { count: 'exact' })
      .order('date', { ascending: false })
      .range(from, to);
    if (search) {
      const lower = debouncedSearch.toLowerCase();
      query = query.or(
        `name.ilike.%${lower}%,datetime.ilike.%${lower}%,location_place.ilike.%${lower}%,location_city.ilike.%${lower}%`
      );
    }
    const { data, error, count } = await query;
    if (error) {
      console.error('Erreur lors du chargement des événements :', error);
      return;
    }
    if (data) {
      setEvents(
        data.map((event: any) => ({
          id: event.id,
          datetime: event.datetime,
          date: event.date ?? undefined,
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
          updated_at: event.updated_at ?? null,
        }))
      );
      setTotal(count || 0);
    }
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
    const event = events.find(e => e.id === id);
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
      setEvents(events.filter(event => event.id !== eventToDelete.id));
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
          location_place: eventData.location.place,
          location_city: eventData.location.city,
          location_department: eventData.location.department,
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
          location_place: eventData.location.place,
          location_city: eventData.location.city,
          location_department: eventData.location.department,
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
      await fetchEvents();
      setShowForm(false);
    }
    return success;
  };

  // Barre de recherche
  const filteredEvents = useMemo(() => {
    if (!debouncedSearch) return events;
    const lower = debouncedSearch.toLowerCase();
    return events.filter(e =>
      e.name.toLowerCase().includes(lower) ||
      e.datetime.toLowerCase().includes(lower) ||
      e.location.place.toLowerCase().includes(lower) ||
      e.location.city.toLowerCase().includes(lower)
    );
  }, [debouncedSearch, events]);

  return (
    <AdminLayout>
      <EventsHeader 
        onAdd={handleAddEvent}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher par nom, date ou lieu..."
      />
      <EventsTable events={filteredEvents} onEdit={handleEditEvent} onDelete={confirmDeleteEvent} />
      <EventsPagination page={page} total={total} pageSize={pageSize} onPageChange={setPage} />
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-3/4 max-w-4xl mx-auto">
          <DialogHeader>
            <DialogTitle>{currentEvent ? "Modifier l'événement" : "Ajouter un événement"}</DialogTitle>
          </DialogHeader>
          <EventForm 
            event={currentEvent}
            onSave={handleSaveEvent}
            onCancel={() => setShowForm(false)}
          />
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
