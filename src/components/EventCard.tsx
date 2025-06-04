
import { Event } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, ArrowRight } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useState } from "react";

interface EventCardProps {
  event: Event;
  isPast?: boolean;
}

const EventCard = ({ event, isPast = false }: EventCardProps) => {
  const [openDialog, setOpenDialog] = useState(false);
  const { theme } = useTheme();

  // Format datetime string
  const formatDateDisplay = () => {
    if (event.endTime) {
      return `${event.datetime} ${event.datetime.includes(" de ") ? "à" : "de"} ${event.endTime}`;
    }
    return `${event.datetime}`;
  };

  // Format location
  const locationString = `${event.location.place} – ${event.location.city} ${event.location.department ? `(${event.location.department})` : ''}`;
  
  // Get day of week from date for border color
  const getDayOfWeek = () => {
    const d = new Date(event.date);
    const days = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    return days[d.getDay()];
    
  };
  
  // Get border color based on day of week with new earthy/pastel colors
  const getBorderColorClass = () => {
    const day = getDayOfWeek();
    switch (day) {
      case "lundi":
        return "border-l-[#8B9DC3]"; // Bleu ardoise doux
      case "mardi":
        return "border-l-[#D4A574]"; // Jaune ocre pastel
      case "mercredi":
        return "border-l-[#9CAF88]"; // Vert sauge
      case "jeudi":
        return "border-l-[#A8B5C8]"; // Bleu gris doux
      case "vendredi":
        return "border-l-[#C89B7B]"; // Rouge brique doux
      case "samedi":
        return "border-l-[#B8A9D9]"; // Lavande désaturée
      case "dimanche":
        return "border-l-[#D4A5A5]"; // Rose terreux
      default:
        return "border-l-gray-300";
    }
  };
  
  // Get background style pour le thème choisi
  const getBackgroundStyle = () => {
    if (!event.theme) return {};
    if (theme === 'light' && event.theme.image_url_light) {
      return {
        backgroundImage: `url('${event.theme.image_url_light}')`,
        backgroundRepeat: "repeat",
        backgroundSize: "auto"
      };
    }
    if (event.theme.image_url) {
      return {
        backgroundImage: `url('${event.theme.image_url}')`,
        backgroundRepeat: "repeat",
        backgroundSize: "auto"
      };
    }
    return {};
  };
  
  const renderEventName = () => (
    <h3 className="text-lg font-bold mb-1">{event.name}</h3>
  );

  console.log(event.cover_url)
  
  const cardContent = (
    <CardContent className="p-4 relative flex flex-row gap-4 items-center">
      {/* Affiche à gauche si présente, avec son Tooltip */}
      {event.cover_url && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex-shrink-0 flex items-center">
                <img
                  src={event.cover_url}
                  alt="Affiche de l'événement"
                  className="w-20 h-28 object-cover rounded shadow-lg cursor-pointer transition-transform hover:scale-105 border border-white/20"
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
      {/* Contenu textuel */}
      <div className="flex-1 min-w-0">
        <div className="mb-2">
          <p className="text-sm font-semibold opacity-90">{formatDateDisplay()}</p>
        </div>
        {renderEventName()}
        <div className="flex items-center text-sm font-normal mb-2">
          <img 
            src="/lovable-uploads/680f536f-accd-4c50-8dd4-82707544fbe1.png" 
            alt="Lieu" 
            className={`w-4 h-4 mr-2 ${
              theme === 'dark' ? 'brightness-0 invert' : 'brightness-0'
            }`} 
          />
          {locationString}
        </div>
        {!isPast && (event.price || event.audience) && (
          <p className="text-sm font-normal opacity-80">
            {event.price && `${event.price}`}
            {event.price && event.audience && " / "}
            {event.audience && event.audience}
          </p>
        )}
      </div>
      {/* ArrowRight en bas à droite, visible en permanence si event.url */}
      {event.url && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="absolute bottom-3 right-3 flex items-center transition-transform hover:scale-110 cursor-pointer">
              <ArrowRight className={`w-5 h-5 ${
                theme === 'dark' 
                  ? 'text-white/70 hover:text-white' 
                  : 'text-gray-600 hover:text-gray-800'
              } drop-shadow-sm`} />
            </span>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            Accéder au site de l'événement
          </TooltipContent>
        </Tooltip>
      )}
    </CardContent>
  );

  const card = (
    <Card
      className={`dark:bg-ephemeride-light light:bg-[#fefeff] text-[#1B263B] dark:text-[#faf3ec] mb-4 animate-fade-in hover:dark:bg-ephemeride-dark hover:light:bg-[#f5f5f3] transition-colors border-l-[15px] ${getBorderColorClass()} border-t-0 border-r-0 border-b-0 rounded-none rounded-r-lg`}
      style={getBackgroundStyle()}
    >
      {cardContent}
    </Card>
  );

  if (event.url) {
    return (
      <a
        href={event.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`group block focus:outline-none`}
        style={{ textDecoration: "none" }}
      >
        {card}
      </a>
    );
  }
  return card;
};

export default EventCard;
