
import { Event } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";

interface EventCardProps {
  event: Event;
}

const EventCard = ({ event }: EventCardProps) => {
  // Format datetime string
  const formatDateDisplay = () => {
    if (event.endTime) {
      return `${event.datetime} de ${event.endTime}`;
    }
    return `${event.datetime}`;
  };

  // Format location
  const locationString = `@ ${event.location.place} – ${event.location.city} (${event.location.department})`;
  
  return (
    <Card className="bg-ephemeride-light border-none text-ephemeride-foreground mb-4 animate-fade-in hover:bg-ephemeride-dark transition-colors">
      <CardContent className="p-4">
        <div className="mb-2">
          <p className="text-sm font-medium opacity-80">{formatDateDisplay()} {event.emoji}</p>
        </div>
        <h3 className="text-lg font-bold mb-1">{event.name}</h3>
        <p className="text-sm mb-2">{locationString}</p>
        {(event.price || event.audience) && (
          <p className="text-sm opacity-80">
            {event.price && `${event.price}`}
            {event.price && event.audience && " / "}
            {event.audience && event.audience}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default EventCard;
