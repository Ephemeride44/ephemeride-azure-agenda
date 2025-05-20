
import { Event } from "@/lib/types";
import EventCard from "./EventCard";

interface EventListProps {
  events: Event[];
}

const EventList = ({ events }: EventListProps) => {
  // Group events by date (just the day part)
  const groupEventsByDay = () => {
    const grouped: Record<string, Event[]> = {};
    
    events.forEach(event => {
      // Extract just the date part (e.g., "mercredi 21 mai 2025")
      const dateKey = event.datetime.split(" à ")[0].split(" de ")[0];
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      
      grouped[dateKey].push(event);
    });
    
    return grouped;
  };

  const groupedEvents = groupEventsByDay();

  return (
    <div className="space-y-8">
      {Object.entries(groupedEvents).map(([date, dayEvents]) => (
        <div key={date} className="mb-6">
          <h2 className="text-xl font-semibold border-b border-white/20 pb-2 mb-4">{date}</h2>
          <div className="space-y-4">
            {dayEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default EventList;
