import type { Database } from "@/integrations/supabase/types";
type Event = Database["public"]["Tables"]["events"]["Row"];
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Euro, Ticket, Pencil, Repeat } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useUserRoleContext } from "@/components/UserRoleProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import EventForm from "@/components/EventForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { daysOfWeek, getDateBlockColor, getDateParts, getEventStart, formatTimeDisplay, isToday, formatCityName, formatPrice } from "@/lib/utils";
import { describeRecurrenceFromEvent } from "@/lib/recurrence";

interface EventCardProps {
  event: Event;
  isPast?: boolean;
}

const EventCard = ({ event: eventProp, isPast = false }: EventCardProps) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  // Copie locale de l'événement : permet de refléter une modification admin
  // sans recharger la page (on reste exactement au même endroit).
  const [event, setEvent] = useState(eventProp);
  const { theme } = useTheme();
  const { toast } = useToast();
  const { isSuperAdmin, isOrganizationAdmin } = useUserRoleContext();
  const canEdit = isSuperAdmin || isOrganizationAdmin;

  useEffect(() => {
    setEvent(eventProp);
  }, [eventProp]);

  const handleSaveEvent = async (data: Partial<typeof event>): Promise<boolean> => {
    // Nettoyer les données avant l'update (retirer la relation jointe et l'id,
    // convertir les UUID vides en null).
    const cleanData = { ...data } as Record<string, unknown>;
    delete cleanData.theme;
    delete cleanData.recurrence;
    delete cleanData.id;
    if (cleanData.organization_id === '') cleanData.organization_id = null;
    if (cleanData.theme_id === '') cleanData.theme_id = null;

    const updated = { ...cleanData, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('events').update(updated).eq('id', event.id);

    if (error) {
      toast({
        title: "Erreur lors de la mise à jour",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    setEvent(prev => ({ ...prev, ...updated }) as typeof event);
    toast({
      title: "Événement mis à jour",
      description: "L'événement a été mis à jour avec succès",
    });
    setShowEdit(false);
    return true;
  };

  const { day, month, year } = getDateParts(event);
  const eventStart = getEventStart(event);
  const dayName = eventStart ? daysOfWeek[eventStart.getDay()] : "lundi";
  const recurrenceLabel = describeRecurrenceFromEvent(event, { includeTime: false, withPrefix: false });

  // Format location
  const locationString = `${event.location_place || ''}${event.location_city ? ` — ${formatCityName(event.location_city)}` : ''}${event.location_department ? ` (${event.location_department})` : ''}`;

  const cardContent = (
    <div className="flex h-full">
      {/* Date block à gauche */}
      <div className={`${getDateBlockColor(dayName)} text-white flex flex-col items-center justify-center px-4 py-6 w-[150px] flex-shrink-0 ${isPast ? 'opacity-60' : ''}`}>
        {isToday(event) ? (
          <>
            <div className="text-lg font-bold leading-none mb-1">Aujourd'hui</div>
            {formatTimeDisplay(event) && (
              <>
                <div className="w-8 border-t border-white/30 my-2"></div>
                <div className="text-xs font-medium">{formatTimeDisplay(event)}</div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="text-2xl font-bold leading-none">{day}</div>
            <div className="text-sm font-medium mt-1">{month}</div>
            <div className="text-lg font-bold mt-1">{year}</div>
            {formatTimeDisplay(event) && (
              <>
                <div className="w-8 border-t border-white/30 my-2"></div>
                <div className="text-xs font-medium">{formatTimeDisplay(event)}</div>
              </>
            )}
          </>
        )}
      </div>

      {/* Affiche à gauche si présente - prend toute la hauteur */}
      {event.cover_url && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex-shrink-0">
                <img
                  src={event.cover_url}
                  alt="Affiche de l'événement"
                  className="h-full w-24 object-cover cursor-pointer transition-transform hover:scale-105"
                  onClick={e => { e.preventDefault(); setOpenDialog(true); }}
                  tabIndex={0}
                  aria-label="Voir l'affiche en grand"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Voir l'affiche en grand
            </TooltipContent>
          </Tooltip>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogContent className="max-w-2xl flex flex-col items-center bg-black/95">
              <img
                src={event.cover_url}
                alt="Affiche de l'événement"
                className="max-h-[80vh] w-auto object-contain rounded shadow-lg"
                style={{ background: '#fff' }}
              />
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Contenu principal */}
      <div className="flex-1 p-6 relative">
        {/* Bouton Modifier (admins uniquement) */}
        {canEdit && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowEdit(true);
                }}
                aria-label="Modifier l'événement"
                className={`absolute top-4 right-4 z-10 p-2 rounded-full border transition-colors ${theme === 'dark'
                    ? 'border-white/20 text-white/70 hover:text-white hover:bg-white/10'
                    : 'border-gray-300 text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
              >
                <Pencil className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              Modifier l'événement
            </TooltipContent>
          </Tooltip>
        )}

        {/* Dialog d'édition (admins) : s'ouvre sur place, la fermeture ne déplace pas la page */}
        {canEdit && (
          <Dialog open={showEdit} onOpenChange={setShowEdit}>
            <DialogContent
              className={`w-3/4 max-w-4xl mx-auto max-h-[90vh] overflow-y-auto ${theme === 'light' ? 'bg-[#f8f8f6] text-ephemeride border-none' : 'bg-ephemeride-light text-ephemeride-foreground border-none'}`}
            >
              <DialogHeader>
                <DialogTitle>Modifier l'événement</DialogTitle>
              </DialogHeader>
              <EventForm
                event={event}
                onSave={handleSaveEvent}
                onCancel={() => setShowEdit(false)}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Nom de l'événement */}
        <h3 className={`text-xl font-bold mb-3 leading-tight ${canEdit ? 'pr-10' : ''}`}>{event.name}</h3>

        {/* Lieu */}
        <div className="flex items-center text-sm mb-2">
          <img
            src="/lovable-uploads/680f536f-accd-4c50-8dd4-82707544fbe1.png"
            alt="Lieu"
            className={`w-4 h-4 mr-2 ${theme === 'dark' ? 'brightness-0 invert' : 'brightness-0'
              }`}
          />
          {locationString}
        </div>

        {/* Prix avec icône euro */}
        {!isPast && event.price && (
          <div className={`flex items-center text-sm mb-3 ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}`}>
            <Euro className={`w-4 h-4 mr-1 ${theme === 'dark' ? 'brightness-0 invert' : 'brightness-0'
              }`} />
            {formatPrice(event.price)}
          </div>
        )}

        {/* Récurrence avec icône (même style que le prix) */}
        {recurrenceLabel && (
          <div className={`flex items-center text-sm mb-3 ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}`}>
            <Repeat className={`w-4 h-4 mr-1 shrink-0 ${theme === 'dark' ? 'brightness-0 invert' : 'brightness-0'}`} />
            {recurrenceLabel}
          </div>
        )}

        {/* Type d'événement en bas - Ne s'affiche que si audience n'est pas vide */}
        {event.audience && (
          <div className={`text-xs font-medium uppercase tracking-wide ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
            {event.audience}
          </div>
        )}

        {/* Boutons billeterie et plus d'infos */}
        {(event.ticketing_url || event.url) && (
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            {/* Bouton billeterie */}
            {event.ticketing_url && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={event.ticketing_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer"
                  >
                    <Ticket className={`w-5 h-5 transition-transform hover:scale-110 ${theme === 'dark'
                        ? 'text-white/70 hover:text-white'
                        : 'text-gray-600 hover:text-gray-800'
                      }`} />
                  </a>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  Accéder à la billeterie
                </TooltipContent>
              </Tooltip>
            )}

            {/* Bouton plus d'infos */}
            {event.url && (
              <>
                {!isPast ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-4 py-2 text-xs font-medium border transition-colors ${theme === 'dark'
                            ? 'border-white/20 text-white hover:bg-white/10'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        PLUS D'INFOS
                      </a>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-xs">
                      Accéder au site de l'événement
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer"
                      >
                        <ArrowRight className={`w-5 h-5 transition-transform hover:scale-110 ${theme === 'dark'
                            ? 'text-white/70 hover:text-white'
                            : 'text-gray-600 hover:text-gray-800'
                          }`} />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-xs">
                      Accéder au site de l'événement
                    </TooltipContent>
                  </Tooltip>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const card = (
    <Card
      className={`${theme === 'dark' ? 'bg-ephemeride-light' : 'bg-white'} ${theme === 'dark' ? 'text-[#faf3ec]' : 'text-[#1B263B]'} mb-4 animate-fade-in hover:shadow-lg transition-all duration-200 border-0 shadow-sm overflow-hidden`}
    >
      <CardContent className="p-0 h-full">
        {cardContent}
      </CardContent>
    </Card>
  );

  if (event.url) {
    return (
      <a
        href={event.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block focus:outline-none"
        style={{ textDecoration: "none" }}
      >
        {card}
      </a>
    );
  }
  return card;
};

export default EventCard;
