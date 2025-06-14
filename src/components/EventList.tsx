import { useState, useEffect } from "react";
import type { Database } from "@/lib/database.types";
type Event = Database["public"]["Tables"]["events"]["Row"];
import EventCard from "./EventCard";
import { Button } from "@/components/ui/button";
import { Share, Mail, MessageSquare, Send, ChevronDown, ChevronUp } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getDayOfWeek, daysOfWeek, monthNames, monthNamesShort, getDateBlockColor } from "@/lib/utils";

interface EventListProps {
  events: Event[];
}

const EventList = ({ events }: EventListProps) => {
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isPastEventsOpen, setIsPastEventsOpen] = useState<boolean>(false);
  const { theme } = useTheme();

  // Get formatted current date and time for "dernière mise à jour"
  useEffect(() => {
    if (!events || events.length === 0) {
      setLastUpdated("");
      return;
    }
    
    // Use current date/time when the component loads or events change
    // This reflects when the categorization of events (upcoming vs past) was last calculated
    const now = new Date();
    const dayName = daysOfWeek[now.getDay()];
    const day = now.getDate();
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    setLastUpdated(`${dayName} ${day} ${month} ${year} à ${hours}h${minutes}`);
  }, [events]);

  // Filter events into upcoming and past based on the current date
  useEffect(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const upcoming: Event[] = [];
    const past: Event[] = [];

    events.forEach(event => {
      if (event.date) {
        if (event.date >= todayStr) {
          upcoming.push(event);
        } else {
          past.push(event);
        }
      } else {
        past.push(event);
      }
    });
    
    // Sort past events from most recent to oldest (descending order)
    past.sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return b.date.localeCompare(a.date);
    });
    
    setUpcomingEvents(upcoming);
    setPastEvents(past);
  }, [events]);

  // Group events by month then by day
  const groupEventsByMonthAndDay = (eventList: Event[]) => {
    const grouped: Record<string, Record<string, Event[]>> = {};
    
    eventList.forEach(event => {
      if (!event.date) return;
      let dateKey = event.datetime.split(" à ")[0].split(" de ")[0];
      let monthKey = "";
      // dateKey = YYYY-MM-DD
      const [year, month, day] = event.date.split("-");
      dateKey = `${day} ${monthNames[parseInt(month, 10)-1].toLowerCase()} ${year}`;
      monthKey = `${monthNames[parseInt(month, 10)-1]} ${year}`;
      if (monthKey) {
        if (!grouped[monthKey]) {
          grouped[monthKey] = {};
        }
        if (!grouped[monthKey][dateKey]) {
          grouped[monthKey][dateKey] = [];
        }
        grouped[monthKey][dateKey].push(event);
      }
    });
    
    return grouped;
  };

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

  return (
    <div>
      {/* Events Count and Last Updated Section - Before upcoming events heading */}
      <div className={`text-lg font-normal opacity-70 mb-8 space-y-1 ${textColorClass}`}>
        <p>{upcomingEvents.length} événements sont recensés au moment où vous consultez cette page</p>
        <p><span className="underline font-medium">dernière mise à jour</span> : {lastUpdated}</p>
        
        {/* Social sharing buttons */}
        <div className="flex space-x-3 pt-3">
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
      
      {/* Upcoming Events Section */}
      <div className="space-y-8 mb-12">
        <h2 className={`text-2xl font-semibold mb-8 ${textColorClass}`}>Événements à venir</h2>
        
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
            
            {Object.entries(dayEvents).map(([date, events]) => {
              const firstEvent = events[0];
              let dayOfWeek = "";
              if (firstEvent && firstEvent.date) {
                dayOfWeek = getDayOfWeek(firstEvent.date);
              }
              const stickyBg = theme === "light" ? "bg-[#faf3ec]" : "bg-[#1B263B]";
              return (
                <div key={date} className="mb-6">
                  <h3 className={`text-xl font-medium border-b border-white/20 pb-2 mb-4 ${textColorClass} sticky top-[168px] md:top-32 z-10 ${stickyBg}`}>
                    {dayOfWeek && <span className="capitalize">{dayOfWeek}</span>} {date}
                  </h3>
                  <div className="space-y-4">
                    {events.map(event => (
                      <EventCard key={event.id} event={event} isPast={false} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Past Events Section - Now collapsible */}
      {Object.keys(groupedPastEvents).length > 0 && (
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
            {Object.entries(groupedPastEvents).map(([month, dayEvents]) => (
              <div key={month} className="mb-12">
                {/* Month separator for past events - nouveau style divider with text */}
                <div className="flex items-center w-full my-8">
                  <div className={`flex-grow border-t ${theme === "light" ? "border-gray-300" : "border-white/20"}`}></div>
                  <span className={`mx-4 font-semibold text-xl opacity-60 ${theme === "light" ? "text-[#1B263B]" : "text-[#1B263B]"}`}>
                    {month}
                  </span>
                  <div className={`flex-grow border-t ${theme === "light" ? "border-gray-300" : "border-white/20"}`}></div>
                </div>
                
                {Object.entries(dayEvents).map(([date, events]) => {
                  // On récupère la date ISO de l'événement pour le jour de la semaine
                  const firstEvent = events[0];
                  let dayOfWeek = "";
                  if (firstEvent && firstEvent.date) {
                    dayOfWeek = getDayOfWeek(firstEvent.date);
                  }
                  return (
                    <div key={date} className="mb-6">
                      <h3 className={`text-xl font-medium border-b border-white/20 pb-2 mb-4 ${textColorClass}`}>
                        {dayOfWeek && <span className="capitalize">{dayOfWeek}</span>} {date}
                      </h3>
                      <div className="space-y-4">
                        {events.map(event => (
                          <EventCard key={event.id} event={event} isPast={true} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

export default EventList;
