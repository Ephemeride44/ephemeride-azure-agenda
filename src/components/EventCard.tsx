
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
  
  // Get day of week from datetime string for border color
  const getDayOfWeek = () => {
    const days = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    for (const day of days) {
      if (event.datetime.toLowerCase().startsWith(day)) {
        return day;
      }
    }
    return "autre";
  };
  
  // Get border color based on day of week
  const getBorderColorClass = () => {
    const day = getDayOfWeek();
    switch (day) {
      case "lundi":
        return "border-l-[12px] border-l-purple-500";
      case "mardi":
        return "border-l-[12px] border-l-emerald-400";
      case "mercredi":
        return "border-l-[12px] border-l-amber-400";
      case "jeudi":
        return "border-l-[12px] border-l-sky-400";
      case "vendredi":
        return "border-l-[12px] border-l-rose-400";
      case "samedi":
        return "border-l-[12px] border-l-orange-400";
      case "dimanche":
        return "border-l-[12px] border-l-teal-400";
      default:
        return "border-l-[12px] border-l-gray-300";
    }
  };
  
  return (
    <Card className={`bg-ephemeride-light border-none text-ephemeride-foreground mb-4 animate-fade-in hover:bg-ephemeride-dark transition-colors ${getBorderColorClass()}`}>
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
