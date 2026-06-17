import type { Database } from "@/integrations/supabase/types";
type Event = Database["public"]["Tables"]["events"]["Row"];
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash, Repeat } from "lucide-react";
import { describeRecurrenceFromEvent } from "@/lib/recurrence";

interface EventsTableProps {
  events: Event[];
  onEdit: (event: Event) => void;
  onDelete: (id: string) => void;
  onDeleteSeries?: (event: Event) => void;
}

const EventsTable = ({ events, onEdit, onDelete, onDeleteSeries }: EventsTableProps) => (
  <Card>
    <CardContent className="p-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Lieu</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="font-medium">{event.datetime}</TableCell>
              <TableCell>
                <div className="max-w-xs">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{event.name}</p>
                    {event.recurrence_id && (
                      <Badge variant="secondary" className="gap-1 shrink-0">
                        <Repeat className="h-3 w-3" />
                        Récurrent
                      </Badge>
                    )}
                  </div>
                  {event.recurrence_id && describeRecurrenceFromEvent(event) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {describeRecurrenceFromEvent(event)}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{event.location_place}</p>
                  <p className="text-sm text-muted-foreground">{event.location_city}</p>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(event)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(event.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                  {event.recurrence_id && onDeleteSeries && (
                    <Button
                      size="sm"
                      variant="destructive"
                      title="Supprimer toute la série"
                      onClick={() => onDeleteSeries(event)}
                    >
                      <Repeat className="h-4 w-4 mr-1" />
                      <Trash className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

export default EventsTable; 