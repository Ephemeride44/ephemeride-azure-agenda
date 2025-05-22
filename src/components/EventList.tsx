
import { useState, useEffect } from "react";
import { Event } from "@/lib/types";
import EventCard from "./EventCard";

interface EventListProps {
  events: Event[];
}

const EventList = ({ events }: EventListProps) => {
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");

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

  return (
    <div>
      {/* Upcoming Events Section */}
      <div className="space-y-8 mb-12">
        <h2 className="text-2xl font-bold mb-8">Événements à venir</h2>
        
        {/* Events Count and Last Updated Section - Updated font size */}
        <div className="text-lg opacity-70 mb-6 space-y-1">
          <p>{upcomingEvents.length} événements sont recensés au moment où vous consultez cette page</p>
          <p><span className="underline">dernière mise à jour</span> : {lastUpdated}</p>
        </div>
        
        {Object.entries(groupedUpcomingEvents).map(([date, dayEvents]) => (
          <div key={date} className="mb-6">
            <h3 className="text-xl font-semibold border-b border-white/20 pb-2 mb-4">{date}</h3>
            <div className="space-y-4">
              {dayEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Past Events Section */}
      {Object.keys(groupedPastEvents).length > 0 && (
        <div className="space-y-8 mt-16">
          <h2 className="text-2xl font-bold mb-8">Événements passés</h2>
          {Object.entries(groupedPastEvents).map(([date, dayEvents]) => (
            <div key={date} className="mb-6">
              <h3 className="text-xl font-semibold border-b border-white/20 pb-2 mb-4">{date}</h3>
              <div className="space-y-4">
                {dayEvents.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventList;
