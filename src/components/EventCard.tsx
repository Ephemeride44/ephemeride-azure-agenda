
import { Event } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";

interface EventCardProps {
  event: Event;
  isPast?: boolean;
}

const EventCard = ({ event, isPast = false }: EventCardProps) => {
  // Format datetime string
  const formatDateDisplay = () => {
    if (event.endTime) {
      return `${event.datetime} de ${event.endTime}`;
    }
    return `${event.datetime}`;
  };

  // Format location
  const locationString = `@ ${event.location.place} – ${event.location.city} ${event.location.department ? `(${event.location.department})` : ''}`;
  
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
  
  // Get border color based on day of week with thicker 15px borders
  const getBorderColorClass = () => {
    const day = getDayOfWeek();
    switch (day) {
      case "lundi":
        return "border-l-[#9b5fe0]"; // Purple for Monday
      case "mardi":
        return "border-l-[#16a4d8]"; // Blue for Tuesday
      case "mercredi":
        return "border-l-[#efdf48]"; // Yellow for Wednesday
      case "jeudi":
        return "border-l-[#8bd346]"; // Green for Thursday
      case "vendredi":
        return "border-l-[#60dbe8]"; // Light blue for Friday
      case "samedi":
        return "border-l-[#f9a52c]"; // Orange for Saturday
      case "dimanche":
        return "border-l-[#d64e12]"; // Red for Sunday
      default:
        return "border-l-gray-300";
    }
  };
  
  return (
    <Card 
      className={`dark:bg-ephemeride-light light:bg-[#fefeff] text-[#001f98] dark:text-[#faf3ec] mb-4 animate-fade-in hover:dark:bg-ephemeride-dark hover:light:bg-[#f5f5f3] transition-colors border-l-[15px] ${getBorderColorClass()} border-t-0 border-r-0 border-b-0 rounded-none rounded-r-lg`}
    >
      <CardContent className="p-4">
        <div className="mb-2">
          <p className="text-sm font-medium opacity-80">{formatDateDisplay()}</p>
        </div>
        <h3 className="text-lg font-bold mb-1">{event.name}</h3>
        <p className="text-sm mb-2">{locationString}</p>
        {!isPast && (event.price || event.audience) && (
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
