import EventForm from "@/components/EventForm";
import { AdminLayout } from "@/components/AdminLayout";
import EventsHeader from "@/components/events/EventsHeader";
import EventsPagination from "@/components/events/EventsPagination";
import EventsTable from "@/components/events/EventsTable";
import { useTheme } from "@/components/ThemeProvider";
import { useUserRoleContext } from "@/components/UserRoleProvider";
import { OrganizationSelector } from "@/components/OrganizationSelector";
import { NoOrganizationScreen } from "@/components/NoOrganizationScreen";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Eye } from "lucide-react";

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
  const { user, currentOrganization, isSuperAdmin, organizations } = useUserRoleContext();

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
    organization_id: null,
    ticketing_url: null,
  };

  useEffect(() => {
    // Ne charger les événements que si l'utilisateur a accès à des organisations ou est super admin
    if (user && (isSuperAdmin || currentOrganization || organizations.length > 0)) {
      fetchPendingEvents();
      fetchAcceptedEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, showPastEvents, currentOrganization, isSuperAdmin, user]);

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
    let query = supabase
      .from('events')
      .select('*, theme:theme_id(*)')
      .eq('status', 'pending');

    // Filtrer par organisation selon le type d'utilisateur
    if (currentOrganization) {
      // Organisation spécifique sélectionnée
      query = query.eq('organization_id', currentOrganization.organization_id);
    } else if (!isSuperAdmin) {
      // Utilisateur normal avec "Toutes mes organisations" - filtrer par ses organisations
      const userOrgIds = organizations.map(org => org.organization_id);
      query = query.in('organization_id', userOrgIds);
    }
    // Super admin avec "Toutes les organisations" - pas de filtre

    query = query
      .order('date', { ascending: false })
      .order('datetime', { ascending: false });

    const { data, error } = await query;
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

    // Filtrer par organisation selon le type d'utilisateur
    if (currentOrganization) {
      // Organisation spécifique sélectionnée
      query = query.eq('organization_id', currentOrganization.organization_id);
    } else if (!isSuperAdmin) {
      // Utilisateur normal avec "Toutes mes organisations" - filtrer par ses organisations
      const userOrgIds = organizations.map(org => org.organization_id);
      query = query.in('organization_id', userOrgIds);
    }
    // Super admin avec "Toutes les organisations" - pas de filtre

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
      // Update existing event
      // Nettoyer les données pour éviter les UUID vides
      const cleanData = { ...eventData };
      if (cleanData.organization_id === '') cleanData.organization_id = null;
      if (cleanData.theme_id === '') cleanData.theme_id = null;
      
      const { error: updateError } = await supabase
        .from('events')
        .update({
          ...cleanData,
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
      // Create new event
      const organizationId = eventData.organization_id ?? currentOrganization?.organization_id ?? null;
      
      const { error: insertError } = await supabase
        .from('events')
        .insert({
          datetime: eventData.datetime,
          date: eventData.date || null,
          end_time: eventData.end_time || null,
          name: eventData.name,
          location_place: eventData.location_place || null,
          location_city: eventData.location_city,
          location_department: eventData.location_department || null,
          price: eventData.price || null,
          audience: eventData.audience || null,
          url: eventData.url || null,
          ticketing_url: eventData.ticketing_url || null,
          emoji: eventData.emoji || null,
          theme_id: eventData.theme_id || null,
          organization_id: organizationId,
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

  // Affichage d'un message si l'utilisateur n'a pas d'organisation et n'est pas super admin
  if (!isSuperAdmin && organizations.length === 0) {
    return (
      <AdminLayout title="Aucune organisation" subtitle="Contactez un administrateur pour être ajouté">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">Aucune organisation</h2>
              <p className="text-muted-foreground">
                Vous n'êtes membre d'aucune organisation. Contactez un administrateur pour être ajouté à une organisation.
              </p>
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  // Affichage de l'écran "aucune organisation" pour les utilisateurs sans organisation
  if (!isSuperAdmin && organizations.length === 0) {
    return <NoOrganizationScreen />;
  }


  return (
    <AdminLayout title="Tableau de bord" subtitle="Gestion des événements">
      <div className="space-y-6">

      {/* Section événements en attente */}
      {pendingEvents.length > 0 && (
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-orange-600">Événements en attente de validation</h2>
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                {pendingEvents.length} en attente
              </Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Lieu</TableHead>
                  <TableHead>Proposé par</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingEvents.map(event => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.datetime}</TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="font-medium truncate">{event.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{event.location_place}</p>
                        <p className="text-sm text-muted-foreground">{event.location_city}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        {event.createdby && typeof event.createdby === 'object' && 'name' in event.createdby ? (
                          <p className="font-medium">{(event.createdby as { name?: string }).name}</p>
                        ) : null}
                        {event.createdby && typeof event.createdby === 'object' && 'email' in event.createdby ? (
                          <a 
                            href={`mailto:${(event.createdby as { email?: string }).email}`} 
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {(event.createdby as { email?: string }).email}
                          </a>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => { setCurrentEvent(event); setShowForm(true); }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Voir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
      <EventsTable events={acceptedEvents} onEdit={handleEditEvent} onDelete={confirmDeleteEvent} />
      <EventsPagination page={page} total={total} pageSize={pageSize} onPageChange={setPage} />
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className={`w-3/4 max-w-4xl mx-auto ${theme === 'light' ? 'bg-[#f8f8f6] text-ephemeride border-none' : 'bg-ephemeride-light text-ephemeride-foreground border-none'}`} >
          <DialogHeader>
            <DialogTitle>{currentEvent ? (currentEvent.status === 'pending' ? "Valider une proposition" : "Modifier l'événement") : "Ajouter un événement"}</DialogTitle>
          </DialogHeader>
          <EventForm
            event={currentEvent}
            onSave={async (eventData) => {
              try {
                const mappedData = {
                  ...eventData,
                  updated_at: new Date().toISOString(),
                } as EventRow & { theme: ThemeRow };
                delete mappedData.theme;

                if (eventData.status === 'accepted') {
                  // Nettoyer les données pour éviter les UUID vides
                  const cleanData = { ...mappedData, status: 'accepted' };
                  // Convertir les chaînes vides en null pour les champs UUID
                  if (cleanData.organization_id === '') cleanData.organization_id = null;
                  if (cleanData.theme_id === '') cleanData.theme_id = null;
                  
                  const { error } = await supabase.from('events').update(cleanData).eq('id', currentEvent?.id);
                  if (error) throw error;
                  setShowForm(false);
                  await fetchPendingEvents();
                  await fetchAcceptedEvents();
                  toast({ title: "Événement accepté", description: "L'événement a été accepté." });
                  return true;
                } else if (eventData.status === 'rejected') {
                  const { error } = await supabase.from('events').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', currentEvent?.id);
                  if (error) throw error;
                  setShowForm(false);
                  await fetchPendingEvents();
                  await fetchAcceptedEvents();
                  toast({ title: "Événement refusé", description: "L'événement a été refusé." });
                  return true;
                } else {
                  // Edition classique ou ajout
                  const success = await handleSaveEvent({ ...eventData, id: currentEvent?.id } as Omit<EventRow, 'id'> & { id?: string });
                  return success;
                }
              } catch (error) {
                toast({
                  title: "Erreur de sauvegarde",
                  description: "Une erreur est survenue lors de la sauvegarde de l'événement.",
                  variant: "destructive",
                });
                return false;
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
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
