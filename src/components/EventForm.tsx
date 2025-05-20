
import { useState } from "react";
import { Event } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface EventFormProps {
  event?: Event;
  onSave: (event: Omit<Event, 'id'> & { id?: string }) => void;
  onCancel: () => void;
}

const EventForm = ({ event, onSave, onCancel }: EventFormProps) => {
  const [formData, setFormData] = useState({
    id: event?.id || "",
    datetime: event?.datetime || "",
    endTime: event?.endTime || "",
    name: event?.name || "",
    location: {
      place: event?.location.place || "",
      city: event?.location.city || "",
      department: event?.location.department || "",
    },
    price: event?.price || "",
    audience: event?.audience || "",
    emoji: event?.emoji || "",
  });
  
  const { toast } = useToast();
  const isEditing = !!event;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith("location.")) {
      const locationField = name.split(".")[1];
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          [locationField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.datetime || !formData.name || !formData.location.place || !formData.location.city || !formData.location.department) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }
    
    // Save event
    onSave(formData);
  };

  return (
    <Card className="w-full bg-ephemeride-light border-none text-ephemeride-foreground shadow-lg">
      <CardHeader>
        <CardTitle>{isEditing ? "Modifier l'événement" : "Nouvel événement"}</CardTitle>
        <CardDescription className="text-white/70">
          {isEditing ? "Modifiez les détails de l'événement" : "Ajoutez un nouvel événement au calendrier"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="datetime">Date et heure</Label>
              <Input
                id="datetime"
                name="datetime"
                placeholder="ex: mercredi 21 mai 2025 à 16h30"
                value={formData.datetime}
                onChange={handleChange}
                className="border-white/20 bg-white/10 text-white"
              />
              <p className="text-xs text-white/60">Format : jour date mois année à/de heure</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endTime">Heure de fin (optionnel)</Label>
              <Input
                id="endTime"
                name="endTime"
                placeholder="ex: 19h00"
                value={formData.endTime}
                onChange={handleChange}
                className="border-white/20 bg-white/10 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nom de l'événement</Label>
            <Input
              id="name"
              name="name"
              placeholder="ex: Atelier vélo Good'Huile"
              value={formData.name}
              onChange={handleChange}
              className="border-white/20 bg-white/10 text-white"
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Lieu</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location.place">Nom du lieu</Label>
                <Input
                  id="location.place"
                  name="location.place"
                  placeholder="ex: La Solid'"
                  value={formData.location.place}
                  onChange={handleChange}
                  className="border-white/20 bg-white/10 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location.city">Ville</Label>
                <Input
                  id="location.city"
                  name="location.city"
                  placeholder="ex: CLISSON"
                  value={formData.location.city}
                  onChange={handleChange}
                  className="border-white/20 bg-white/10 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location.department">Département</Label>
                <Input
                  id="location.department"
                  name="location.department"
                  placeholder="ex: 44"
                  value={formData.location.department}
                  onChange={handleChange}
                  className="border-white/20 bg-white/10 text-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Prix (optionnel)</Label>
              <Input
                id="price"
                name="price"
                placeholder="ex: 5-8€, gratuit, prix libre"
                value={formData.price}
                onChange={handleChange}
                className="border-white/20 bg-white/10 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="audience">Public visé (optionnel)</Label>
              <Input
                id="audience"
                name="audience"
                placeholder="ex: à partir de 3 ans, tout public"
                value={formData.audience}
                onChange={handleChange}
                className="border-white/20 bg-white/10 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="emoji">Emoji (optionnel)</Label>
              <Input
                id="emoji"
                name="emoji"
                placeholder="ex: 📖, ❤️"
                value={formData.emoji}
                onChange={handleChange}
                className="border-white/20 bg-white/10 text-white"
              />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="border-white/20 text-white hover:bg-white/10"
        >
          Annuler
        </Button>
        <Button 
          onClick={handleSubmit}
          className="bg-white text-ephemeride hover:bg-white/80"
        >
          {isEditing ? "Mettre à jour" : "Créer l'événement"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default EventForm;
