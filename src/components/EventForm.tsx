import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Event, Theme } from "@/lib/types";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface EventFormProps {
  event?: Event;
  onSave: (event: Omit<Event, 'id'> & { id?: string }) => void;
  onCancel: () => void;
}

type EventFormValues = Omit<Event, 'id' | 'theme'> & { id?: string };

const defaultValues: EventFormValues = {
  id: '',
  datetime: '',
  date: '',
  endTime: '',
  name: '',
  location: {
    place: '',
    city: '',
    department: '',
  },
  price: '',
  audience: '',
  emoji: '',
  url: '',
  theme_id: null,
};

const fetchThemes = async (): Promise<Theme[]> => {
  const { data, error } = await supabase.from("themes").select("*").order("name");
  if (error) throw error;
  return data as Theme[];
};

const EventForm = ({ event, onSave, onCancel }: EventFormProps) => {
  const { toast } = useToast();
  const isEditing = !!event;

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
    reset,
  } = useForm<EventFormValues>({
    defaultValues,
  });

  // Remplir le formulaire si édition
  useEffect(() => {
    if (event) {
      reset({
        ...event,
        endTime: event.endTime || '',
        emoji: event.emoji || '',
        url: event.url || '',
        theme_id: event.theme_id || null,
        date: event.date || '',
      });
    } else {
      reset(defaultValues);
    }
  }, [event, reset]);

  const { data: themes, isLoading: isLoadingThemes } = useQuery<Theme[]>({
    queryKey: ["themes"],
    queryFn: fetchThemes,
  });

  const onSubmit = async (data: EventFormValues) => {
    if (!data.datetime || !data.name || !data.location.city) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }
    try {
      await onSave(data);
    } catch (e) {
      console.error('[EventForm] onSave error', e);
    }
  };

  return (
    <Card className="w-full bg-ephemeride-light border-none text-ephemeride-foreground shadow-lg py-5">
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de l'événement</Label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="name"
                  placeholder="ex: Atelier vélo Good'Huile"
                  className="border-white/20 bg-white/10 text-white"
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="datetime">Date et heure</Label>
              <Controller
                name="datetime"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="datetime"
                    placeholder="ex: mercredi 21 mai 2025 à 16h30"
                    className="border-white/20 bg-white/10 text-white"
                  />
                )}
              />
              <p className="text-xs text-white/60">Format : jour date mois année à/de heure</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date réelle (optionnelle)</Label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="date"
                    type="date"
                    className="border-white/20 bg-white/10 text-white"
                  />
                )}
              />
              <p className="text-xs text-white/60">Permet un tri fiable par date</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Heure de fin (optionnel)</Label>
              <Controller
                name="endTime"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="endTime"
                    placeholder="ex: 19h00"
                    className="border-white/20 bg-white/10 text-white"
                  />
                )}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location.place">Nom du lieu (optionnel)</Label>
                <Controller
                  name="location.place"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="location.place"
                      placeholder="ex: La Solid'"
                      className="border-white/20 bg-white/10 text-white"
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location.city">Ville</Label>
                <Controller
                  name="location.city"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="location.city"
                      placeholder="ex: CLISSON"
                      className="border-white/20 bg-white/10 text-white"
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location.department">Département (optionnel)</Label>
                <Controller
                  name="location.department"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="location.department"
                      placeholder="ex: 44"
                      className="border-white/20 bg-white/10 text-white"
                    />
                  )}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Prix (optionnel)</Label>
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="price"
                    placeholder="ex: 5-8€, gratuit, prix libre"
                    className="border-white/20 bg-white/10 text-white"
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audience">Public visé (optionnel)</Label>
              <Controller
                name="audience"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="audience"
                    placeholder="ex: à partir de 3 ans, tout public"
                    className="border-white/20 bg-white/10 text-white"
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emoji">Emoji (optionnel)</Label>
              <Controller
                name="emoji"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="emoji"
                    placeholder="ex: 📖, ❤️"
                    className="border-white/20 bg-white/10 text-white"
                  />
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="theme_id">Thème visuel</Label>
              <Controller
                name="theme_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || 'none'}
                    onValueChange={value => field.onChange(value === 'none' ? null : value)}
                  >
                    <SelectTrigger className="border-white/20 bg-white/10 text-white">
                      <SelectValue placeholder={isLoadingThemes ? "Chargement..." : "Choisir un thème"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {themes && themes.map(theme => (
                        <SelectItem key={theme.id} value={theme.id}>
                          <div className="flex items-center gap-2">
                            {theme.image_url && <img src={theme.image_url} alt={theme.name} className="w-6 h-6 rounded object-cover" />}
                            <span>{theme.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="border-white/20 text-white hover:bg-white/10"
            type="button"
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button 
            type="submit"
            className="bg-white text-ephemeride hover:bg-white/80"
            disabled={isSubmitting}
          >
            {isEditing ? "Mettre à jour" : "Créer l'événement"}
          </Button>
        </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
};

export default EventForm;
