
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

const EventProposalForm = ({ onClose }: { onClose: () => void }) => {
  const [formData, setFormData] = useState({
    name: "",
    datetime: "",
    endTime: "",
    location: {
      place: "",
      city: "",
      department: "",
    },
    price: "",
    audience: "",
    contactEmail: "",
    description: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    if (name.startsWith("location.")) {
      const locationField = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        location: {
          ...prev.location,
          [locationField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name || !formData.datetime || !formData.contactEmail) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    // This would typically send data to a backend service
    console.log("Event proposal submitted:", formData);
    
    // Show success message
    toast({
      title: "Proposition envoyée !",
      description: "Merci pour votre contribution à l'agenda culturel",
    });
    
    // Close modal
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nom de l'événement *</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="ex: Atelier vélo Good'Huile"
          value={formData.name}
          onChange={handleChange}
          className="border-white/20 bg-white/10 text-white"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="datetime">Date et heure *</Label>
          <Input
            id="datetime"
            name="datetime"
            required
            placeholder="ex: mercredi 21 mai 2025 à 16h30"
            value={formData.datetime}
            onChange={handleChange}
            className="border-white/20 bg-white/10 text-white"
          />
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

      <div className="space-y-4">
        <h3 className="font-medium">Lieu *</h3>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optionnel)</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Décrivez votre événement..."
          value={formData.description}
          onChange={handleChange}
          className="border-white/20 bg-white/10 text-white min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactEmail">Email de contact *</Label>
        <Input
          id="contactEmail"
          name="contactEmail"
          type="email"
          required
          placeholder="votre@email.com"
          value={formData.contactEmail}
          onChange={handleChange}
          className="border-white/20 bg-white/10 text-white"
        />
      </div>

      <div className="flex justify-end space-x-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="border-white/20 text-white hover:bg-white/10"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          className="bg-white text-ephemeride hover:bg-white/80"
        >
          Proposer l'événement
        </Button>
      </div>
    </form>
  );
};

export default EventProposalForm;
