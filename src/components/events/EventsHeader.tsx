import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import EventsSearchBar from "./EventsSearchBar";
import { Switch } from "@/components/ui/switch";

interface EventsHeaderProps {
  onAdd: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  theme?: 'light' | 'dark';
  showPastEvents?: boolean;
  onTogglePastEvents?: (value: boolean) => void;
}

const EventsHeader = ({ onAdd, searchValue, onSearchChange, searchPlaceholder, theme, showPastEvents = false, onTogglePastEvents }: EventsHeaderProps) => (
  <div className="flex justify-between items-center mb-8">
    <h1 className="text-2xl font-bold">Gestion des événements</h1>
    <div className="flex items-stretch gap-2">
      <div className="flex items-center gap-2 mr-2">
        <Switch
          checked={showPastEvents}
          onCheckedChange={onTogglePastEvents}
          id="toggle-past-events"
        />
        <label htmlFor="toggle-past-events" className={theme === 'light' ? 'text-[#1B263B] text-sm' : 'text-white text-sm'}>
          Afficher les événements passés
        </label>
      </div>
      <EventsSearchBar value={searchValue} onChange={onSearchChange} placeholder={searchPlaceholder} theme={theme} />
      <Button
        className={
          theme === 'light'
            ? 'bg-[#fff7e6] text-[#1B263B] border border-[#f3e0c7] hover:bg-[#ffe2b0] hover:text-[#1B263B] shadow-sm rounded px-4 py-2 transition'
            : 'bg-white text-ephemeride hover:bg-white/90 border border-white/20 rounded px-4 py-2 transition'
        }
        onClick={onAdd}
      >
        <Plus className="mr-2 h-4 w-4" />
        Ajouter un événement
      </Button>
    </div>
  </div>
);

export default EventsHeader; 