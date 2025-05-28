import { Event } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Edit, Trash } from "lucide-react";

interface EventsTableProps {
  events: Event[];
  onEdit: (event: Event) => void;
  onDelete: (id: string) => void;
}

const EventsTable = ({ events, onEdit, onDelete }: EventsTableProps) => (
  <div className="bg-ephemeride-light rounded-lg overflow-hidden">
    <table className="w-full text-left">
      <thead>
        <tr className="border-b border-white/10">
          <th className="px-6 py-3 font-medium">Date</th>
          <th className="px-6 py-3 font-medium">Nom</th>
          <th className="px-6 py-3 font-medium">Lieu</th>
          <th className="px-6 py-3 font-medium w-24">Actions</th>
        </tr>
      </thead>
      <tbody>
        {events.map((event) => (
          <tr key={event.id} className="border-b border-white/10">
            <td className="px-6 py-4">{event.datetime}</td>
            <td className="px-6 py-4">{event.name}</td>
            <td className="px-6 py-4">{event.location.place}<br/>{event.location.city}</td>
            <td className="px-6 py-4">
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0 text-white hover:bg-white/10"
                  onClick={() => onEdit(event)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0 text-white hover:bg-white/10"
                  onClick={() => onDelete(event.id)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default EventsTable; 