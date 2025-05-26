import { Event } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

interface EventCardProps {
  event: Event;
  isPast?: boolean;
}

const EventCard = ({ event, isPast = false }: EventCardProps) => {
  // Format datetime string
  const formatDateDisplay = () => {
    if (event.endTime) {
      return `${event.datetime} ${event.datetime.includes(" de ") ? "à" : "de"} ${event.endTime}`;
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
  
  // Get border color based on day of week with new WCAG compliant colors
  const getBorderColorClass = () => {
    const day = getDayOfWeek();
    switch (day) {
      case "lundi":
        return "border-l-[#81F5FF]"; // Menthe givrée
      case "mardi":
        return "border-l-[#FFD06E]"; // Jaune pamplemousse doux
      case "mercredi":
        return "border-l-[#A8E890]"; // Vert anis pastel
      case "jeudi":
        return "border-l-[#7CC6FE]"; // Bleu ciel doux
      case "vendredi":
        return "border-l-[#FFA69E]"; // Corail clair
      case "samedi":
        return "border-l-[#CAB8FF]"; // Lavande lumineuse
      case "dimanche":
        return "border-l-[#FF6B6B]"; // Rouge cerise lumineux
      default:
        return "border-l-gray-300";
    }
  };
  
  // Check if event contains "vélo" keyword
  const containsVelo = event.name.toLowerCase().includes("vélo");
  
  // Check if event contains book-related keywords
  const containsBookKeywords = () => {
    const eventText = `${event.name} ${event.location.place}`.toLowerCase();
    const bookKeywords = ["librairie", "bibliothèque", "médiathèque", "livres"];
    return bookKeywords.some(keyword => eventText.includes(keyword));
  };
  
  // Get background style for themed events
  const getBackgroundStyle = () => {
    if (containsVelo) {
      return {
        backgroundImage: "url('/lovable-uploads/19a0d8c5-9f24-4be9-90e9-570e97abbdb1.png')",
        backgroundRepeat: "repeat",
        backgroundSize: "auto"
      };
    }
    if (containsBookKeywords()) {
      return {
        backgroundImage: "url('/lovable-uploads/7fcbdc7e-7498-4085-90b6-528ac0a7b672.png')",
        backgroundRepeat: "repeat",
        backgroundSize: "auto"
      };
    }
    return {};
  };
  
  const renderEventName = () => {
    if (event.url) {
      return (
        <a 
          href={event.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center hover:underline"
        >
          <h3 className="text-lg font-medium mb-1">{event.name}</h3>
          <ExternalLink className="ml-2 h-4 w-4" />
        </a>
      );
    }
    return <h3 className="text-lg font-medium mb-1">{event.name}</h3>;
  };
  
  return (
    <Card 
      className={`dark:bg-ephemeride-light light:bg-[#fefeff] text-[#1B263B] dark:text-[#faf3ec] mb-4 animate-fade-in hover:dark:bg-ephemeride-dark hover:light:bg-[#f5f5f3] transition-colors border-l-[15px] ${getBorderColorClass()} border-t-0 border-r-0 border-b-0 rounded-none rounded-r-lg`}
      style={getBackgroundStyle()}
    >
      <CardContent className="p-4">
        <div className="mb-2">
          <p className="text-sm font-semibold opacity-90">{formatDateDisplay()}</p>
        </div>
        {renderEventName()}
        <p className="text-sm font-normal mb-2">{locationString}</p>
        {!isPast && (event.price || event.audience) && (
          <p className="text-sm font-normal opacity-80">
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
