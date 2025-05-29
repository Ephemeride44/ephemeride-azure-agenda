import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/components/ThemeProvider";

const EventProposalForm = ({ onClose }: { onClose: () => void }) => {
  const { theme } = useTheme();
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
    url: "",
    description: "",
    proposerName: "",
    proposerEmail: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name || !formData.datetime) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    // Insertion dans Supabase avec statut 'pending' et createdby
    const { error } = await supabase.from('events').insert({
      name: formData.name,
      datetime: formData.datetime,
      end_time: formData.endTime || null,
      location_place: formData.location.place || null,
      location_city: formData.location.city || null,
      location_department: formData.location.department || null,
      price: formData.price || null,
      audience: formData.audience || null,
      url: formData.url || null,
      status: 'pending',
      createdby: { name: formData.proposerName, email: formData.proposerEmail },
    });
    if (error) {
      toast({
        title: "Erreur lors de la proposition",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    
    // Show success message
    toast({
      title: "Proposition envoyée !",
      description: "Merci pour votre contribution à l'agenda culturel",
    });
    
    // Close modal
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informations générales */}
      <Card className={theme === 'light' ? 'border-[#f3e0c7] bg-[#fff7e6]' : 'border-white/20 bg-ephemeride-light/50'}>
        <CardContent className="pt-6">
          <h3 className={theme === 'light' ? 'text-[#1B263B] text-lg font-medium mb-4' : 'text-[#faf3ec] text-lg font-medium mb-4'}>Informations générales</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className={theme === 'light' ? 'text-[#1B263B]' : 'text-white'}>Nom de l'événement *</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="ex: Atelier vélo Good'Huile"
                value={formData.name}
                onChange={handleChange}
                className={theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B] mt-1' : 'border-white/20 bg-white/10 text-white mt-1'}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="datetime" className={theme === 'light' ? 'text-[#1B263B]' : 'text-white'}>Date et heure *</Label>
                <Input
                  id="datetime"
                  name="datetime"
                  required
                  placeholder="ex: mercredi 21 mai 2025 à 16h30"
                  value={formData.datetime}
                  onChange={handleChange}
                  className={theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B] mt-1' : 'border-white/20 bg-white/10 text-white mt-1'}
                />
              </div>
              <div>
                <Label htmlFor="endTime" className={theme === 'light' ? 'text-[#1B263B]' : 'text-white'}>Heure de fin (optionnel)</Label>
                <Input
                  id="endTime"
                  name="endTime"
                  placeholder="ex: 19h00"
                  value={formData.endTime}
                  onChange={handleChange}
                  className={theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B] mt-1' : 'border-white/20 bg-white/10 text-white mt-1'}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="url" className={theme === 'light' ? 'text-[#1B263B]' : 'text-white'}>Lien externe (optionnel)</Label>
              <Input
                id="url"
                name="url"
                type="url"
                placeholder="ex: https://www.monevenement.com"
                value={formData.url}
                onChange={handleChange}
                className={theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B] mt-1' : 'border-white/20 bg-white/10 text-white mt-1'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lieu */}
      <Card className={theme === 'light' ? 'border-[#f3e0c7] bg-[#fff7e6]' : 'border-white/20 bg-ephemeride-light/50'}>
        <CardContent className="pt-6">
          <h3 className={theme === 'light' ? 'text-[#1B263B] text-lg font-medium mb-4' : 'text-[#faf3ec] text-lg font-medium mb-4'}>Lieu *</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="location.place" className={theme === 'light' ? 'text-[#1B263B]' : 'text-white'}>Nom du lieu</Label>
              <Input
                id="location.place"
                name="location.place"
                placeholder="ex: La Solid'"
                value={formData.location.place}
                onChange={handleChange}
                className={theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B] mt-1' : 'border-white/20 bg-white/10 text-white mt-1'}
              />
            </div>
            <div>
              <Label htmlFor="location.city" className={theme === 'light' ? 'text-[#1B263B]' : 'text-white'}>Ville</Label>
              <Input
                id="location.city"
                name="location.city"
                placeholder="ex: CLISSON"
                value={formData.location.city}
                onChange={handleChange}
                className={theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B] mt-1' : 'border-white/20 bg-white/10 text-white mt-1'}
              />
            </div>
            <div>
              <Label htmlFor="location.department" className={theme === 'light' ? 'text-[#1B263B]' : 'text-white'}>Département</Label>
              <Input
                id="location.department"
                name="location.department"
                placeholder="ex: 44"
                value={formData.location.department}
                onChange={handleChange}
                className={theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B] mt-1' : 'border-white/20 bg-white/10 text-white mt-1'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Détails additionnels */}
      <Card className={theme === 'light' ? 'border-[#f3e0c7] bg-[#fff7e6]' : 'border-white/20 bg-ephemeride-light/50'}>
        <CardContent className="pt-6">
          <h3 className={theme === 'light' ? 'text-[#1B263B] text-lg font-medium mb-4' : 'text-[#faf3ec] text-lg font-medium mb-4'}>Détails additionnels</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price" className={theme === 'light' ? 'text-[#1B263B]' : 'text-white'}>Prix (optionnel)</Label>
                <Input
                  id="price"
                  name="price"
                  placeholder="ex: 5-8€, gratuit, prix libre"
                  value={formData.price}
                  onChange={handleChange}
                  className={theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B] mt-1' : 'border-white/20 bg-white/10 text-white mt-1'}
                />
              </div>
              <div>
                <Label htmlFor="audience" className={theme === 'light' ? 'text-[#1B263B]' : 'text-white'}>Public visé (optionnel)</Label>
                <Input
                  id="audience"
                  name="audience"
                  placeholder="ex: à partir de 3 ans, tout public"
                  value={formData.audience}
                  onChange={handleChange}
                  className={theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B] mt-1' : 'border-white/20 bg-white/10 text-white mt-1'}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description" className={theme === 'light' ? 'text-[#1B263B]' : 'text-white'}>Description (optionnel)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Décrivez votre événement..."
                value={formData.description}
                onChange={handleChange}
                className={theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B] mt-1 min-h-[100px]' : 'border-white/20 bg-white/10 text-white mt-1 min-h-[100px]'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className={theme === 'light' ? 'border-[#f3e0c7] bg-[#fff7e6]' : 'border-white/20 bg-ephemeride-light/50'}>
        <CardContent className="pt-6">
          <h3 className={theme === 'light' ? 'text-[#1B263B] text-lg font-medium mb-4' : 'text-[#faf3ec] text-lg font-medium mb-4'}>Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="proposerName" className={theme === 'light' ? 'text-[#1B263B]' : 'text-white'}>Votre nom (optionnel)</Label>
              <Input
                id="proposerName"
                name="proposerName"
                placeholder="Votre nom"
                value={formData.proposerName}
                onChange={handleChange}
                className={theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B] mt-1' : 'border-white/20 bg-white/10 text-white mt-1'}
              />
            </div>
            <div>
              <Label htmlFor="proposerEmail" className={theme === 'light' ? 'text-[#1B263B]' : 'text-white'}>Votre email (optionnel)</Label>
              <Input
                id="proposerEmail"
                name="proposerEmail"
                type="email"
                placeholder="votre@email.com"
                value={formData.proposerEmail}
                onChange={handleChange}
                className={theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B] mt-1' : 'border-white/20 bg-white/10 text-white mt-1'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className={theme === 'light' ? 'border-[#f3e0c7] bg-transparent text-[#1B263B] hover:bg-[#ffe2b0]' : 'border-white/20 bg-transparent text-white hover:bg-white/10'}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          className={theme === 'light' ? 'bg-[#fff7e6] text-[#1B263B] border-[#f3e0c7] hover:bg-[#ffe2b0] shadow-sm' : 'bg-white text-ephemeride hover:bg-white/90'}
        >
          Proposer l'événement
        </Button>
      </div>
    </form>
  );
};

export default EventProposalForm;
