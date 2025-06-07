
import { Event } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
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

  // Extract date parts from event.date (YYYY-MM-DD format)
  const getDateParts = () => {
    if (!event.date) return { day: "", month: "", year: "" };
    
    const [year, month, day] = event.date.split("-");
    const monthNames = ["JAN.", "FÉV.", "MAR.", "AVR.", "MAI", "JUIN", "JUIL.", "AOÛT", "SEP.", "OCT.", "NOV.", "DÉC."];
    
    return {
      day: parseInt(day, 10).toString().padStart(2, '0'),
      month: monthNames[parseInt(month, 10) - 1] || "",
      year: year
    };
  };

  const { day, month, year } = getDateParts();

  // Format location
  const locationString = `${event.location.place}${event.location.city ? ` — ${event.location.city}` : ''}${event.location.department ? ` (${event.location.department})` : ''}`;
  
  // Format time display
  const formatTimeDisplay = () => {
    // Extract time from datetime string
    const timeMatch = event.datetime.match(/(\d{1,2}h\d{2})/);
    if (timeMatch) {
      if (event.endTime) {
        return `${timeMatch[1]} — ${event.endTime}`;
      }
      return timeMatch[1];
    }
    return "";
  };

  // Get day of week for color
  const getDayOfWeek = () => {
    if (!event.date) return "lundi";
    const d = new Date(event.date);
    const days = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    return days[d.getDay()];
  };
  
  // Get background color based on day of week
  const getDateBlockColor = () => {
    const day = getDayOfWeek();
    switch (day) {
      case "lundi":
        return "bg-[#8B9DC3]"; // Bleu ardoise doux
      case "mardi":
        return "bg-[#D4A574]"; // Jaune ocre pastel
      case "mercredi":
        return "bg-[#9CAF88]"; // Vert sauge
      case "jeudi":
        return "bg-[#A8B5C8]"; // Bleu gris doux
      case "vendredi":
        return "bg-[#C89B7B]"; // Rouge brique doux
      case "samedi":
        return "bg-[#B8A9D9]"; // Lavande désaturée
      case "dimanche":
        return "bg-[#D4A5A5]"; // Rose terreux
      default:
        return "bg-gray-400";
    }
  };

  const cardContent = (
    <div className="flex">
      {/* Date block à gauche */}
      <div className={`${getDateBlockColor()} text-white flex flex-col items-center justify-center px-4 py-6 min-w-[120px] ${isPast ? 'opacity-60' : ''}`}>
        <div className="text-2xl font-bold leading-none">{day}</div>
        <div className="text-sm font-medium mt-1">{month}</div>
        <div className="text-lg font-bold mt-1">{year}</div>
        {formatTimeDisplay() && (
          <>
            <div className="w-8 border-t border-white/30 my-2"></div>
            <div className="text-xs font-medium">{formatTimeDisplay()}</div>
          </>
        )}
      </div>

      {/* Contenu principal */}
      <div className="flex-1 p-6 relative">
        <div className="flex gap-4">
          {/* Affiche à gauche si présente */}
          {event.cover_url && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex-shrink-0">
                    <img
                      src={event.cover_url}
                      alt="Affiche de l'événement"
                      className="w-16 h-20 object-cover rounded shadow-sm cursor-pointer transition-transform hover:scale-105"
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

          {/* Texte de l'événement */}
          <div className="flex-1 min-w-0">
            {/* Nom de l'événement */}
            <h3 className="text-xl font-bold mb-3 leading-tight">{event.name}</h3>

            {/* Lieu */}
            <div className="flex items-center text-sm mb-2">
              <img 
                src="/lovable-uploads/680f536f-accd-4c50-8dd4-82707544fbe1.png" 
                alt="Lieu" 
                className={`w-4 h-4 mr-2 ${
                  theme === 'dark' ? 'brightness-0 invert' : 'brightness-0'
                }`} 
              />
              {locationString}
            </div>

            {/* Prix */}
            {!isPast && event.price && (
              <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}`}>
                {event.price}
              </p>
            )}

            {/* Type d'événement en bas - Ne s'affiche que si audience n'est pas vide */}
            {event.audience && (
              <div className={`text-xs font-medium uppercase tracking-wide ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
                {event.audience}
              </div>
            )}
          </div>
        </div>

        {/* Bouton plus d'infos / flèche en bas à droite */}
        {event.url && (
          <div className="absolute bottom-4 right-4">
            {!isPast ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className={`px-4 py-2 text-xs font-medium border transition-colors ${
                    theme === 'dark' 
                      ? 'border-white/20 text-white hover:bg-white/10' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}>
                    PLUS D'INFOS
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  Accéder au site de l'événement
                </TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-pointer">
                    <ArrowRight className={`w-5 h-5 transition-transform hover:scale-110 ${
                      theme === 'dark' 
                        ? 'text-white/70 hover:text-white' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`} />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  Accéder au site de l'événement
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const card = (
    <Card
      className={`${theme === 'dark' ? 'bg-ephemeride-light' : 'bg-white'} ${theme === 'dark' ? 'text-[#faf3ec]' : 'text-[#1B263B]'} mb-4 animate-fade-in hover:shadow-lg transition-all duration-200 border-0 shadow-sm overflow-hidden`}
    >
      <CardContent className="p-0">
        {cardContent}
      </CardContent>
    </Card>
  );

  if (event.url) {
    return (
      <a
        href={event.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block focus:outline-none"
        style={{ textDecoration: "none" }}
      >
        {card}
      </a>
    );
  }
  return card;
};

export default EventCard;
