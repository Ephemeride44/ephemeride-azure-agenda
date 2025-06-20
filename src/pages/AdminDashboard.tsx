import EventForm from "@/components/EventForm";
import AdminLayout from "@/components/events/AdminLayout";
import EventsHeader from "@/components/events/EventsHeader";
import EventsPagination from "@/components/events/EventsPagination";
import EventsTable from "@/components/events/EventsTable";
import { useTheme } from "@/components/ThemeProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/lib/database.types";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type ThemeRow = Database["public"]["Tables"]["themes"]["Row"];

const AdminDashboard = () => {
  const [pendingEvents, setPendingEvents] = useState<EventRow[]>([]);
  const [acceptedEvents, setAcceptedEvents] = useState<EventRow[]>([]);
  const [themes, setThemes] = useState<ThemeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [showForm, setShowForm] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<EventRow | undefined>(undefined);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<EventRow | null>(null);
  const [showPastEvents, setShowPastEvents] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const emptyEvent: EventRow = {
    id: '',
    name: '',
    datetime: '',
    date: '',
    end_time: null,
    location_place: '',
    location_city: '',
    location_department: '',
    price: '',
    audience: '',
    url: '',
    emoji: '',
    cover_url: null,
    theme_id: null,
    status: 'pending',
    createdby: null,
    updated_at: '',
  };

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
  }, [navigate, page, debouncedSearch, showPastEvents]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

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
    setPendingEvents(data || []);
  };

  const fetchAcceptedEvents = async () => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from('events')
      .select('*, theme:theme_id(*)', { count: 'exact' })
      .eq('status', 'accepted');

    const today = new Date().toISOString().slice(0, 10); // format YYYY-MM-DD
    // Filtrer sur la date si on ne veut pas les événements passés
    if (!showPastEvents) {
      query = query.gte('date', today).order('date', { ascending: true });
    } else {
      query = query.lt('date', today).order('date', { ascending: false });
    }
    query = query
      .order('datetime', { ascending: false })
      .range(from, to);
    if (search) {
      const lower = debouncedSearch.toLowerCase();
      query = query.or(
        `name.ilike.%${lower}%,datetime.ilike.%${lower}%,location_place.ilike.%${lower}%,location_city.ilike.%${lower}%,location_department.ilike.%${lower}%`
      );
    }
    const { data, error, count } = await query;
    if (error) {
      console.error('Erreur lors du chargement des événements acceptés :', error);
      return;
    }
    setAcceptedEvents(data || []);
    setTotal(count || 0);
  };

  const handleAddEvent = () => {
    setCurrentEvent(undefined);
    setShowForm(true);
  };

  const handleEditEvent = (event: EventRow) => {
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
    const { error: deleteError } = await supabase.from('events').delete().eq('id', eventToDelete.id);
    if (deleteError) {
      toast({
        title: "Erreur lors de la suppression",
        description: deleteError.message,
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

  const handleSaveEvent = async (eventData: Omit<EventRow, 'id'> & { id?: string }) => {
    let success = false;
    if (eventData.id) {
      // Update existing event dans Supabase
      const { error: updateError } = await supabase
        .from('events')
        .update({
          ...eventData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventData.id);
      if (updateError) {
        toast({
          title: "Erreur lors de la mise à jour",
          description: updateError.message,
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
      const { error: insertError } = await supabase
        .from('events')
        .insert({
          datetime: eventData.datetime,
          date: eventData.date || null,
          end_time: eventData.end_time ?? null,
          name: eventData.name,
          location_place: eventData.location_place ?? null,
          location_city: eventData.location_city ?? null,
          location_department: eventData.location_department ?? null,
          price: eventData.price,
          audience: eventData.audience,
          url: eventData.url ?? null,
          emoji: eventData.emoji ?? null,
          theme_id: eventData.theme_id ?? null,
          updated_at: new Date().toISOString(),
          status: "accepted",
        });
      if (insertError) {
        toast({
          title: "Erreur lors de la création",
          description: insertError.message,
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

  return (
    <AdminLayout>
      {/* Section événements en attente */}
      {pendingEvents.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-orange-600">Événements en attente de validation</h2>
          <table className={`w-full text-left mb-4 rounded-lg overflow-hidden ${theme === 'light' ? 'bg-white text-[#1B263B] border border-[#f3e0c7]' : 'bg-ephemeride-light text-white border border-white/10'}`}>
            <thead>
              <tr className={theme === 'light' ? 'border-b border-[#f3e0c7]' : 'border-b border-white/10'}>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Nom</th>
                <th className="px-6 py-3 font-medium">Lieu</th>
                <th className="px-6 py-3 font-medium">Proposé par</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingEvents.map(event => (
                <tr key={event.id} className={theme === 'light' ? 'border-b border-[#f3e0c7]' : 'border-b border-white/10'}>
                  <td className="px-6 py-4">{event.datetime}</td>
                  <td className="px-6 py-4">{event.name}</td>
                  <td className="px-6 py-4">{event.location_place}<br/>{event.location_city}</td>
                  <td className="px-6 py-4">
                    {event.createdby && typeof event.createdby === 'object' && 'name' in event.createdby ? (event.createdby as { name?: string }).name : ''}<br/>
                    {event.createdby && typeof event.createdby === 'object' && 'email' in event.createdby ? (
                      <a href={`mailto:${(event.createdby as { email?: string }).email}`} className="underline text-blue-600">{(event.createdby as { email?: string }).email}</a>
                    ) : ''}
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

      {/* Section événements acceptés */}
      <EventsHeader
        onAdd={handleAddEvent}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher par nom, date ou lieu..."
        theme={theme}
        showPastEvents={showPastEvents}
        onTogglePastEvents={setShowPastEvents}
      />
      {/* Tableau principal des événements */}
      <EventsTable events={acceptedEvents} onEdit={handleEditEvent} onDelete={confirmDeleteEvent} theme={theme} />
      <EventsPagination page={page} total={total} pageSize={pageSize} onPageChange={setPage} />
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className={`w-3/4 max-w-4xl mx-auto ${theme === 'light' ? 'bg-[#f8f8f6] text-ephemeride border-none' : 'bg-ephemeride-light text-ephemeride-foreground border-none'}`} >
          <DialogHeader>
            <DialogTitle>{currentEvent ? (currentEvent.status === 'pending' ? "Valider une proposition" : "Modifier l'événement") : "Ajouter un événement"}</DialogTitle>
          </DialogHeader>
          <EventForm
            event={currentEvent ?? emptyEvent}
            onSave={async (eventData) => {
              const mappedData = {
                ...eventData,
                updated_at: new Date().toISOString(),
              } as EventRow & { theme: ThemeRow };
              delete mappedData.theme;

              if (eventData.status === 'accepted') {
                await supabase.from('events').update({ ...mappedData, status: 'accepted' }).eq('id', currentEvent?.id);
                setShowForm(false);
                await fetchPendingEvents();
                await fetchAcceptedEvents();
                toast({ title: "Événement accepté", description: "L'événement a été accepté." });
                return true;
              } else if (eventData.status === 'rejected') {
                await supabase.from('events').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', currentEvent?.id);
                setShowForm(false);
                await fetchPendingEvents();
                await fetchAcceptedEvents();
                toast({ title: "Événement refusé", description: "L'événement a été refusé." });
                return true;
              } else {
                // Edition classique ou ajout
                await handleSaveEvent({ ...(currentEvent ?? emptyEvent), ...eventData, id: currentEvent?.id });
                return true;
              }
            }}
            onCancel={() => setShowForm(false)}
            showValidationActions={currentEvent?.status === 'pending'}
            themes={themes}
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
