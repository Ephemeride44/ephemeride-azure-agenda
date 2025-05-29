import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Event, Theme } from "@/lib/types";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDropzone } from "react-dropzone";
import { X } from "lucide-react";

interface EventFormProps {
  event?: Event;
  onSave: (event: Omit<Event, 'id'> & { id?: string }) => void;
  onCancel: () => void;
  showValidationActions?: boolean;
  themes?: Theme[];
}

type EventFormValues = Omit<Event, 'id'> & { id?: string };

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

const EventForm = ({ event, onSave, onCancel, showValidationActions, themes }: EventFormProps) => {
  const { toast } = useToast();
  const isEditing = !!event;
  const [coverPreview, setCoverPreview] = useState<string | null>(event?.cover_url || null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting, errors },
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

  const { data: themesData, isLoading: isLoadingThemes } = useQuery<Theme[]>({
    queryKey: ["themes"],
    queryFn: fetchThemes,
    enabled: !themes,
  });
  const themeList = themes || themesData || [];

  // Dropzone pour l'affiche
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles[0]) {
      setCoverFile(acceptedFiles[0]);
      setCoverPreview(URL.createObjectURL(acceptedFiles[0]));
    }
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
    disabled: isUploading,
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
    let cover_url = data.cover_url || null;
    if (coverFile) {
      setIsUploading(true);
      const filePath = `covers/${Date.now()}_${coverFile.name}`;
      const { error: uploadError } = await supabase.storage.from('event-assets').upload(filePath, coverFile, { upsert: true });
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('event-assets').getPublicUrl(filePath);
        cover_url = publicUrlData.publicUrl;
        setCoverPreview(cover_url);
      } else {
        toast({
          title: "Erreur lors de l'upload de l'affiche",
          description: uploadError.message,
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }
    try {
      await onSave({ ...data, cover_url });
    } catch (e) {
      console.error('[EventForm] onSave error', e);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col md:flex-row gap-6">
        <Card className="w-full md:w-3/4 bg-ephemeride-light border-none text-ephemeride-foreground shadow-lg py-5">
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2 md:col-span-3">
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
                <div className="space-y-2 md:col-span-1">
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
                          <SelectValue placeholder={themes ? "Choisir un thème" : (isLoadingThemes ? "Chargement..." : "Choisir un thème") } />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucun</SelectItem>
                          {themeList.map(theme => (
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
                  <Label htmlFor="date">Date réelle</Label>
                  <Controller
                    name="date"
                    control={control}
                    rules={{ required: "La date réelle est obligatoire" }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="date"
                        type="date"
                        className={`border-white/20 bg-white/10 text-white ${errors.date ? 'border-red-500' : ''}`}
                      />
                    )}
                  />
                  {errors.date && (
                    <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>
                  )}
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
              {/* Champ URL (optionnel) */}
              <div className="space-y-2">
                <Label htmlFor="url">Lien externe (optionnel)</Label>
                <Controller
                  name="url"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="url"
                      type="url"
                      placeholder="ex: https://www.monevenement.com"
                      className="border-white/20 bg-white/10 text-white"
                    />
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Card d'upload affiche avec dropzone */}
        <Card className="w-full md:w-1/4 bg-ephemeride-light border-none text-ephemeride-foreground shadow-lg py-5 flex flex-col items-center justify-start min-h-[350px]">
          <CardContent className="flex flex-col items-center justify-start w-full">
            <Label className="mb-2 text-lg">Affiche</Label>
            <div className="w-full mb-4 relative group">
              {coverPreview ? (
                <>
                  <div {...getRootProps()} className="w-full h-48 p-2 flex items-center justify-center rounded cursor-pointer bg-white/10 overflow-hidden">
                    <input {...getInputProps()} />
                    <img src={coverPreview} alt="Aperçu affiche" className="rounded shadow max-h-40 object-contain w-full" />
                    {/* Bouton suppression */}
                    <button
                      type="button"
                      className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      onClick={e => { e.stopPropagation(); setCoverPreview(null); setCoverFile(null); }}
                      tabIndex={-1}
                      aria-label="Supprimer l'affiche"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </>
              ) : (
                <div
                  {...getRootProps()}
                  className={`w-full h-48 flex flex-col items-center justify-center rounded border-2 border-dashed transition-colors cursor-pointer ${isDragActive ? 'border-green-400 bg-green-50/10' : 'border-white/20 bg-white/10'}`}
                  style={{ outline: 'none' }}
                >
                  <input {...getInputProps()} />
                  <span className="text-white/40">{isDragActive ? "Déposez l'image ici..." : "Glissez-déposez ou cliquez pour choisir une image"}</span>
                </div>
              )}
            </div>
            {isUploading && <span className="text-xs text-white/60">Upload en cours...</span>}
          </CardContent>
        </Card>
      </div>
      {/* Footer global pour les actions */}
      <div className="w-full mt-6 pt-6 flex flex-col items-center">
        <div className="flex flex-col md:flex-row gap-4 w-full max-w-2xl justify-end">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="border-white/20 text-white hover:bg-white/10"
            type="button"
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          {showValidationActions ? (
            <div className="flex gap-2">
              <Button
                type="button"
                className="bg-green-600 text-white hover:bg-green-700"
                disabled={isSubmitting || !!errors.date || !watch('date')}
                onClick={handleSubmit((data) => onSave({ ...data, status: 'accepted' }))}
              >
                Accepter
              </Button>
              <Button
                type="button"
                className="bg-red-600 text-white hover:bg-red-700"
                disabled={isSubmitting}
                onClick={handleSubmit((data) => onSave({ ...data, status: 'rejected' }))}
              >
                Refuser
              </Button>
            </div>
          ) : (
            <Button 
              type="submit"
              className="bg-white text-ephemeride hover:bg-white/80"
              disabled={isSubmitting}
            >
              {isEditing ? "Mettre à jour" : "Créer l'événement"}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
};

export default EventForm;
