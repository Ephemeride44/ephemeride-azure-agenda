"use client";

import { useState, useEffect } from "react";
import type { Database } from "@/lib/database.types";
type Event = Database["public"]["Tables"]["events"]["Row"];
import EventCard from "./EventCard";
import EventListSkeleton from "./EventListSkeleton";
import { Button } from "@/components/ui/button";
import { Share, Mail, MessageSquare, Send, ChevronDown, ChevronUp } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { daysOfWeek, monthNames, monthNamesShort, getDateBlockColor, getEventStart } from "@/lib/utils";

interface EventListProps {
  events: Event[];
  pastEvents?: Event[];
  onLoadPastEvents?: () => void;
  /**
   * Affiche le bloc date dans chaque carte. À désactiver quand la frise
   * temporelle (rail de gauche) porte déjà la date pour éviter la redondance.
   */
  showCardDate?: boolean;
}

const EventList = ({ events, pastEvents = [], onLoadPastEvents, showCardDate = true }: EventListProps) => {
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [isPastEventsOpen, setIsPastEventsOpen] = useState<boolean>(false);
  // Faux tant que la liste « à venir » n'a pas été dérivée côté client : on
  // affiche alors un skeleton (la dérivation se fait dans un effet pour utiliser
  // le « aujourd'hui » local du visiteur).
  const [ready, setReady] = useState(false);
  const { theme } = useTheme();

  // Filter events into upcoming based on the current date
  // Les événements passés sont maintenant passés directement en props
  useEffect(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const pad = (n: number) => String(n).padStart(2, "0");
    const upcoming: Event[] = [];

    events.forEach(event => {
      const start = getEventStart(event);
      if (!start) return;
      const startStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
      if (startStr >= todayStr) {
        upcoming.push(event);
      }
    });

    setUpcomingEvents(upcoming);
    setReady(true);
  }, [events]);

  // Déclencher le chargement des événements passés quand on ouvre la section
  useEffect(() => {
    if (isPastEventsOpen && onLoadPastEvents) {
      onLoadPastEvents();
    }
  }, [isPastEventsOpen, onLoadPastEvents]);

  // Group events by month then by day
  const groupEventsByMonthAndDay = (eventList: Event[]) => {
    const grouped: Record<string, Record<string, Event[]>> = {};
    
    eventList.forEach(event => {
      const start = getEventStart(event);
      if (!start) return;
      const monthName = monthNames[start.getMonth()];
      const dateKey = `${start.getDate()} ${monthName.toLowerCase()} ${start.getFullYear()}`;
      const monthKey = `${monthName} ${start.getFullYear()}`;
      if (!grouped[monthKey]) {
        grouped[monthKey] = {};
      }
      if (!grouped[monthKey][dateKey]) {
        grouped[monthKey][dateKey] = [];
      }
      grouped[monthKey][dateKey].push(event);
    });
    
    return grouped;
  };

  // Le filtrage est désormais effectué côté serveur (requête Supabase) :
  // les listes reçues sont déjà filtrées.
  const groupedUpcomingEvents = groupEventsByMonthAndDay(upcomingEvents);
  const groupedPastEvents = groupEventsByMonthAndDay(pastEvents);

  // Share website function
  const shareWebsite = (platform: string) => {
    const url = window.location.href;
    const text = "Découvrez l'agenda culturel et citoyen du vignoble nantais";
    
    let shareUrl = "";
    
    switch (platform) {
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        break;
      case 'mastodon':
        shareUrl = `https://toot.kytta.dev/?text=${encodeURIComponent(text + " " + url)}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`;
        break;
      default:
        shareUrl = `https://share.diaspodon.fr/?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    }
    
    window.open(shareUrl, '_blank');
  };

  const textColorClass = theme === "light" ? "text-[#1B263B]" : "text-[#faf3ec]";

  // Premier rendu (serveur + hydratation) : la liste « à venir » n'est pas
  // encore dérivée → on affiche le skeleton plutôt qu'un état vide qui clignote.
  if (!ready) return <EventListSkeleton />;

  // Rail timeline : pastille colorée (couleur du jour) + date empilée, posée
  // sur une ligne verticale. Sticky pour les événements à venir.
  const renderDayMarker = (firstStart: Date | null, sticky: boolean) => {
    const dayName = firstStart ? daysOfWeek[firstStart.getDay()] : "";
    const dayNum = firstStart ? firstStart.getDate() : "";
    const monthShort = firstStart ? monthNamesShort[firstStart.getMonth()] : "";
    const year = firstStart ? firstStart.getFullYear() : "";
    const dotColor = getDateBlockColor(dayName || "lundi");
    const stickyBg = theme === "light" ? "bg-[#faf3ec]" : "bg-[#1B263B]";
    const lineColor = theme === "light" ? "bg-gray-300" : "bg-white/15";
    const ringColor = theme === "light" ? "ring-[#faf3ec]" : "ring-[#1B263B]";
    return (
      <div className="relative flex-shrink-0 w-20 md:w-28">
        <div className={`absolute top-2 bottom-0 left-[7px] w-px ${lineColor}`} />
        <div className={`${sticky ? "sticky top-[184px] md:top-36" : ""} z-10 ${stickyBg} pb-2`}>
          <div className="flex items-start gap-2">
            <span className={`mt-2 h-3.5 w-3.5 rounded-full ring-4 ${ringColor} ${dotColor} flex-shrink-0`} />
            <div className={`leading-tight ${textColorClass} ${sticky ? "" : "opacity-70"}`}>
              <div className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wide opacity-70 whitespace-nowrap">{dayName}</div>
              <div className="text-3xl md:text-4xl font-bold">{dayNum}</div>
              <div className="text-sm font-medium uppercase">{monthShort}</div>
              <div className="text-sm opacity-60">{year}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDayGroup = (date: string, dayEvents: Event[], isPast: boolean) => {
    const firstStart = dayEvents[0] ? getEventStart(dayEvents[0]) : null;
    return (
      <div key={date} className="mb-6 flex gap-4 md:gap-6">
        {renderDayMarker(firstStart, !isPast)}
        <div className="flex-1 min-w-0 space-y-4">
          {dayEvents.map(event => (
            <EventCard key={event.id} event={event} isPast={isPast} showDate={showCardDate} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Boutons de partage du site — masqués pour le moment (conservés dans le
          code ; réactiver en remplaçant `false` par `true`). */}
      {false && (
      <div className={`mb-8 ${textColorClass}`}>
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            size="icon" 
            className={`rounded-full border-opacity-20 ${theme === "light" ? "border-[#1B263B]/20 text-[#1B263B]" : "border-[#faf3ec]/20 text-[#faf3ec]"}`}
            onClick={() => shareWebsite('whatsapp')}
            title="Partager sur WhatsApp"
          >
            <Share className="h-4 w-4" />
            <span className="sr-only">Partager sur WhatsApp</span>
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className={`rounded-full border-opacity-20 ${theme === "light" ? "border-[#1B263B]/20 text-[#1B263B]" : "border-[#faf3ec]/20 text-[#faf3ec]"}`}
            onClick={() => shareWebsite('telegram')}
            title="Partager sur Telegram"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Partager sur Telegram</span>
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className={`rounded-full border-opacity-20 ${theme === "light" ? "border-[#1B263B]/20 text-[#1B263B]" : "border-[#faf3ec]/20 text-[#faf3ec]"}`}
            onClick={() => shareWebsite('mastodon')}
            title="Partager sur Mastodon"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="sr-only">Partager sur Mastodon</span>
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className={`rounded-full border-opacity-20 ${theme === "light" ? "border-[#1B263B]/20 text-[#1B263B]" : "border-[#faf3ec]/20 text-[#faf3ec]"}`}
            onClick={() => shareWebsite('email')}
            title="Partager par email"
          >
            <Mail className="h-4 w-4" />
            <span className="sr-only">Partager par email</span>
          </Button>
        </div>
      </div>
      )}

      {/* Upcoming Events Section */}
      <div className="space-y-8 mb-12">
        {upcomingEvents.length === 0 && (
          <p className={`opacity-70 ${textColorClass}`}>
            Aucun événement à venir ne correspond à votre recherche.
          </p>
        )}

        {Object.entries(groupedUpcomingEvents).map(([month, dayEvents]) => (
          <div key={month} className="mb-12">
            {/* Month separator */}
            <div className="flex items-center w-full my-8">
              <div className={`flex-grow border-t ${theme === "light" ? "border-gray-300" : "border-white/20"}`}></div>
              <span className={`mx-4 font-semibold text-xl ${theme === "light" ? "text-[#1B263B]" : "text-[#faf3ec]"}`}>
                {month}
              </span>
              <div className={`flex-grow border-t ${theme === "light" ? "border-gray-300" : "border-white/20"}`}></div>
            </div>
            
            {Object.entries(dayEvents).map(([date, events]) =>
              renderDayGroup(date, events, false)
            )}
          </div>
        ))}
      </div>

      {/* Past Events Section - Now collapsible */}
      <Collapsible 
        open={isPastEventsOpen} 
        onOpenChange={setIsPastEventsOpen} 
        className="space-y-8 mt-16"
      >
        <div className="flex items-center">
          <h2 className={`text-2xl font-semibold ${textColorClass}`}>Événements passés</h2>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="ml-4 p-0 hover:bg-transparent"
              aria-label={isPastEventsOpen ? "Masquer les événements passés" : "Afficher les événements passés"}
            >
              {isPastEventsOpen ? (
                <ChevronUp className={`h-6 w-6 ${textColorClass}`} />
              ) : (
                <ChevronDown className={`h-6 w-6 ${textColorClass}`} />
              )}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="space-y-8">
          {Object.keys(groupedPastEvents).length > 0 ? (
            Object.entries(groupedPastEvents).map(([month, dayEvents]) => (
              <div key={month} className="mb-12">
                {/* Month separator for past events - nouveau style divider with text */}
                <div className="flex items-center w-full my-8">
                  <div className={`flex-grow border-t ${theme === "light" ? "border-gray-300" : "border-white/20"}`}></div>
                  <span className={`mx-4 font-semibold text-xl opacity-60 ${theme === "light" ? "text-[#1B263B]" : "text-[#1B263B]"}`}>
                    {month}
                  </span>
                  <div className={`flex-grow border-t ${theme === "light" ? "border-gray-300" : "border-white/20"}`}></div>
                </div>
                
                {Object.entries(dayEvents).map(([date, events]) =>
                  renderDayGroup(date, events, true)
                )}
              </div>
            ))
          ) : (
            <p className={`text-center opacity-70 ${textColorClass}`}>
              Chargement des événements passés...
            </p>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default EventList;