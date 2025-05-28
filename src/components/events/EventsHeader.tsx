import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import EventsSearchBar from "./EventsSearchBar";

interface EventsHeaderProps {
  onAdd: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
}

const EventsHeader = ({ onAdd, searchValue, onSearchChange, searchPlaceholder }: EventsHeaderProps) => (
  <div className="flex justify-between items-center mb-8">
    <h1 className="text-2xl font-bold">Gestion des événements</h1>
    <div className="flex items-stretch gap-2">
      <EventsSearchBar value={searchValue} onChange={onSearchChange} placeholder={searchPlaceholder} />
      <Button 
        className="bg-white text-ephemeride hover:bg-white/80"
        onClick={onAdd}
      >
        <Plus className="mr-2 h-4 w-4" />
        Ajouter un événement
      </Button>
    </div>
  </div>
);

export default EventsHeader; 