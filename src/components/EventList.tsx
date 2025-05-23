
import { useState, useEffect } from "react";
import { Event } from "@/lib/types";
import EventCard from "./EventCard";
import { Button } from "@/components/ui/button";
import { Share, Mail, MessageSquare, Send, ChevronDown, ChevronUp } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface EventListProps {
  events: Event[];
}

const EventList = ({ events }: EventListProps) => {
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isPastEventsOpen, setIsPastEventsOpen] = useState<boolean>(false);
  const { theme } = useTheme();

  // Get formatted current date for "dernière mise à jour"
  useEffect(() => {
    const getCurrentDate = () => {
      const now = new Date();
      const daysOfWeek = [
        "dimanche", "lundi", "mardi", "mercredi", 
        "jeudi", "vendredi", "samedi"
      ];
      const monthNames = [
        "janvier", "février", "mars", "avril", "mai", "juin",
        "juillet", "août", "septembre", "octobre", "novembre", "décembre"
      ];
      
      const dayName = daysOfWeek[now.getDay()];
      const day = now.getDate();
      const month = monthNames[now.getMonth()];
      const year = now.getFullYear();
      
      return `${dayName} ${day} ${month} ${year} à 00h00`;
    };
    
    setLastUpdated(getCurrentDate());
  }, []);

  // Filter events into upcoming and past based on the current date
  useEffect(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Helper to extract date from event string format
    const extractDateFromEvent = (dateStr: string) => {
      // Convert French month names to numbers
      const monthMap: {[key: string]: number} = {
        'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3,
        'mai': 4, 'juin': 5, 'juillet': 6, 'août': 7,
        'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
      };
      
      // Extract day and month from strings like "mercredi 21 mai 2025"
      const dateParts = dateStr.split(' ');
      if (dateParts.length >= 4) {
        const day = parseInt(dateParts[1], 10);
        const month = monthMap[dateParts[2].toLowerCase()];
        const year = parseInt(dateParts[3], 10);
        
        if (!isNaN(day) && month !== undefined && !isNaN(year)) {
          return new Date(year, month, day);
        }
      }
      
      // Default to today if parsing fails
      return new Date();
    };

    const upcoming: Event[] = [];
    const past: Event[] = [];

    events.forEach(event => {
      // Extract just the date part (e.g., "mercredi 21 mai 2025")
      const dateKey = event.datetime.split(" à ")[0].split(" de ")[0];
      const eventDate = extractDateFromEvent(dateKey);
      
      if (eventDate >= today) {
        upcoming.push(event);
      } else {
        past.push(event);
      }
    });
    
    setUpcomingEvents(upcoming);
    setPastEvents(past);
  }, [events]);

  // Group events by date (just the day part)
  const groupEventsByDay = (eventList: Event[]) => {
    const grouped: Record<string, Event[]> = {};
    
    eventList.forEach(event => {
      // Extract just the date part (e.g., "mercredi 21 mai 2025")
      const dateKey = event.datetime.split(" à ")[0].split(" de ")[0];
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      
      grouped[dateKey].push(event);
    });
    
    return grouped;
  };

  const groupedUpcomingEvents = groupEventsByDay(upcomingEvents);
  const groupedPastEvents = groupEventsByDay(pastEvents);

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

  const textColorClass = theme === "light" ? "text-[#001f98]" : "text-[#faf3ec]";

  return (
    <div>
      {/* Events Count and Last Updated Section - Before upcoming events heading */}
      <div className={`text-lg opacity-70 mb-8 space-y-1 ${textColorClass}`}>
        <p>{upcomingEvents.length} événements sont recensés au moment où vous consultez cette page</p>
        <p><span className="underline">dernière mise à jour</span> : {lastUpdated}</p>
        
        {/* Social sharing buttons */}
        <div className="flex space-x-3 pt-3">
          <Button 
            variant="outline" 
            size="icon" 
            className={`rounded-full border-opacity-20 ${theme === "light" ? "border-[#001f98]/20 text-[#001f98]" : "border-[#faf3ec]/20 text-[#faf3ec]"}`}
            onClick={() => shareWebsite('whatsapp')}
            title="Partager sur WhatsApp"
          >
            <Share className="h-4 w-4" />
            <span className="sr-only">Partager sur WhatsApp</span>
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className={`rounded-full border-opacity-20 ${theme === "light" ? "border-[#001f98]/20 text-[#001f98]" : "border-[#faf3ec]/20 text-[#faf3ec]"}`}
            onClick={() => shareWebsite('telegram')}
            title="Partager sur Telegram"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Partager sur Telegram</span>
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className={`rounded-full border-opacity-20 ${theme === "light" ? "border-[#001f98]/20 text-[#001f98]" : "border-[#faf3ec]/20 text-[#faf3ec]"}`}
            onClick={() => shareWebsite('mastodon')}
            title="Partager sur Mastodon"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="sr-only">Partager sur Mastodon</span>
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className={`rounded-full border-opacity-20 ${theme === "light" ? "border-[#001f98]/20 text-[#001f98]" : "border-[#faf3ec]/20 text-[#faf3ec]"}`}
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
        <h2 className={`text-2xl font-bold mb-8 ${textColorClass}`}>Événements à venir</h2>
        
        {Object.entries(groupedUpcomingEvents).map(([date, dayEvents]) => (
          <div key={date} className="mb-6">
            <h3 className={`text-xl font-semibold border-b border-white/20 pb-2 mb-4 ${textColorClass}`}>{date}</h3>
            <div className="space-y-4">
              {dayEvents.map(event => (
                <EventCard key={event.id} event={event} isPast={false} />
              ))}
            </div>
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
            <h2 className={`text-2xl font-bold ${textColorClass}`}>Événements passés</h2>
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
            {Object.entries(groupedPastEvents).map(([date, dayEvents]) => (
              <div key={date} className="mb-6">
                <h3 className={`text-xl font-semibold border-b border-white/20 pb-2 mb-4 ${textColorClass}`}>{date}</h3>
                <div className="space-y-4">
                  {dayEvents.map(event => (
                    <EventCard key={event.id} event={event} isPast={true} />
                  ))}
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

export default EventList;
