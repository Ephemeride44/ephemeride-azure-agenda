import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDropzone } from "react-dropzone";
import { X } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useUserRoleContext } from "@/components/UserRoleProvider";

type Event = Database["public"]["Tables"]["events"]["Row"];
type Theme = Database["public"]["Tables"]["themes"]["Row"];

type EventFormValues = {
  id?: string;
  datetime: string;
  date: string;
  end_time?: string | null;
  name: string;
  location_place?: string;
  location_city: string;
  location_department?: string;
  price?: string | null;
  audience?: string | null;
  emoji?: string | null;
  url?: string | null;
  ticketing_url?: string | null;
  theme_id?: string | null;
  cover_url?: string | null;
  organization_id?: string | null;
};

interface EventFormProps {
  event?: Partial<Event>;
  onSave: (event: Partial<Event>) => Promise<boolean>;
  onCancel: () => void;
  showValidationActions?: boolean;
  themes?: Theme[];
  theme?: 'light' | 'dark';
}

const defaultValues: EventFormValues = {
  id: '',
  datetime: '',
  date: '',
  end_time: '',
  name: '',
  location_place: '',
  location_city: '',
  location_department: '',
  price: '',
  audience: '',
  emoji: '',
  url: '',
  ticketing_url: '',
  theme_id: '',
  cover_url: '',
  organization_id: '',
};

const fetchThemes = async (): Promise<Theme[]> => {
  const { data, error } = await supabase.from("themes").select("*").order("name");
  if (error) throw error;
  return data as Theme[];
};

const EventForm = ({ event, onSave, onCancel, showValidationActions, themes, theme: themeProp }: EventFormProps) => {
  const { toast } = useToast();
  const { currentOrganization, isSuperAdmin, organizations } = useUserRoleContext();
  const isEditing = !!event;
  const [coverPreview, setCoverPreview] = useState<string | null>(event?.cover_url || null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [formData, setFormData] = useState<EventFormValues>(defaultValues);
  const formDataRef = useRef<EventFormValues>(defaultValues);
  const { theme: contextTheme } = useTheme();
  const theme = themeProp || contextTheme;
  
  // Synchroniser formData avec la ref
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Remplir le formulaire si édition
  useEffect(() => {
    if (event) {
      // Convertir les valeurs null en chaînes vides pour éviter les warnings React
      const sanitizedEvent = Object.fromEntries(
        Object.entries(event).map(([key, value]) => [
          key, 
          value === null ? '' : value
        ])
      );
      
      const newValues = {
        ...defaultValues,
        ...sanitizedEvent,
      };
      
      setFormData(newValues);
      formDataRef.current = newValues;
    } else {
      setFormData(defaultValues);
      formDataRef.current = defaultValues;
    }
  }, [event]);

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

  const onSubmit = async (data: Partial<Event>) => {
    console.log('🔄 [EventForm] onSubmit appelée avec:', data);
    // La validation est maintenant faite par React Hook Form

    // Nettoyer les données : convertir les chaînes vides en null pour la base de données
    const cleanData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key, 
        value === '' ? null : value
      ])
    ) as Partial<Event>;
    console.log('🧹 [EventForm] Données nettoyées:', cleanData);
    let cover_url = cleanData.cover_url || null;
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
    // Gestion de l'organization_id
    let organization_id = cleanData.organization_id;
    
    if (isSuperAdmin) {
      // Super admin : utiliser l'organisation sélectionnée dans le formulaire (peut être null)
      organization_id = cleanData.organization_id && cleanData.organization_id !== 'none' ? cleanData.organization_id : null;
    } else if (organizations.length > 1) {
      // Utilisateur avec plusieurs organisations : utiliser la sélection du formulaire
      organization_id = cleanData.organization_id && cleanData.organization_id !== 'none' ? cleanData.organization_id : null;
    } else if (organizations.length === 1) {
      // Utilisateur avec une seule organisation : assignation automatique
      organization_id = organizations[0].organization_id;
    } else if (!isEditing && currentOrganization) {
      // Fallback : utiliser l'organisation courante
      organization_id = currentOrganization.organization_id;
    }
    
    try {
      console.log('💾 [EventForm] Appel de onSave avec:', { ...cleanData, cover_url, organization_id });
      const success = await onSave({ ...cleanData, cover_url, organization_id });
      console.log('📊 [EventForm] onSave a retourné:', success);
      if (!success) {
        console.log('❌ [EventForm] onSave a échoué, formulaire conservé');
        // Si onSave retourne false, ne pas fermer le formulaire
        return;
      }
      console.log('✅ [EventForm] onSave a réussi');
    } catch (e) {
      console.error('💥 [EventForm] onSave error', e);
      toast({
        title: "Erreur de sauvegarde",
        description: "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive",
      });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Récupérer les valeurs actuelles depuis la ref (plus fiable)
    const currentFormData = formDataRef.current;
    
    // Validation manuelle simple
    const errors: string[] = [];
    const fieldErrors: {[key: string]: string} = {};
    
    if (!currentFormData.name?.trim()) {
      errors.push('Nom de l\'événement');
      fieldErrors.name = 'Le nom de l\'événement est obligatoire';
    }
    if (!currentFormData.datetime?.trim()) {
      errors.push('Date et heure');
      fieldErrors.datetime = 'La date et heure sont obligatoires';
    }
    if (!currentFormData.date?.trim()) {
      errors.push('Date réelle');
      fieldErrors.date = 'La date réelle est obligatoire';
    }
    if (!currentFormData.location_city?.trim()) {
      errors.push('Ville');
      fieldErrors.location_city = 'La ville est obligatoire';
    }
    
    if (errors.length > 0) {
      setValidationErrors(fieldErrors);
      toast({
        title: "Champs obligatoires manquants",
        description: `Veuillez remplir : ${errors.join(', ')}`,
        variant: "destructive",
      });
      
      // Restaurer les données après un délai pour éviter la réinitialisation
      setTimeout(() => {
        setFormData(formDataRef.current);
      }, 100);
      
      return;
    }
    
    // Nettoyer les erreurs si validation OK
    setValidationErrors({});
    
    await onSubmit(currentFormData);
  };

  return (
    <form onSubmit={handleFormSubmit}>
      <div className="flex flex-col md:flex-row gap-6">
        <Card className={theme === 'light' ? 'w-full md:w-3/4 bg-[#fff7e6] border-[#f3e0c7] text-[#1B263B] shadow-lg py-5' : 'w-full md:w-3/4 bg-ephemeride-light border-none text-ephemeride-foreground shadow-lg py-5'}>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="name">Nom de l'événement *</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ex: Atelier vélo Good'Huile"
                    className={`${theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B]' : 'border-white/20 bg-white/10 text-white'} ${validationErrors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  {validationErrors.name && (
                    <p className="text-red-500 text-sm">{validationErrors.name}</p>
                  )}
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="theme_id">Thème visuel</Label>
                  <Select
                    value={formData.theme_id || 'none'}
                    onValueChange={value => setFormData(prev => ({ ...prev, theme_id: value === 'none' ? null : value }))}
                  >
                    <SelectTrigger className={theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B]' : 'border-white/20 bg-white/10 text-white'}>
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
                </div>
              </div>

              {/* Sélecteur d'organisation - visible si super admin ou plusieurs organisations */}
              {(isSuperAdmin || organizations.length > 1) && (
                <div className="space-y-2">
                  <Label htmlFor="organization_id">Organisation</Label>
                  <Select
                    value={formData.organization_id || 'none'}
                    onValueChange={value => setFormData(prev => ({ ...prev, organization_id: value === 'none' ? null : value }))}
                    disabled={organizations.length === 0}
                  >
                    <SelectTrigger className={theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B]' : 'border-white/20 bg-white/10 text-white'}>
                      <SelectValue placeholder={
                        organizations.length === 0 ? "Aucune organisation disponible" :
                        organizations.length === 1 ? organizations[0].organization_name :
                        "Sélectionner une organisation"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Option "Aucune organisation" seulement pour les super admins */}
                      {isSuperAdmin && (
                        <SelectItem value="none">Aucune organisation</SelectItem>
                      )}
                      {organizations.map(org => (
                        <SelectItem key={org.organization_id} value={org.organization_id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{org.organization_name}</span>
                            {org.role && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({org.role === 'organization_admin' ? 'Admin' : 
                                  org.role === 'organization_member' ? 'Membre' : 
                                  org.role === 'super_admin' ? 'Super Admin' : org.role})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {organizations.length === 1 && !isSuperAdmin && (
                    <p className="text-xs text-muted-foreground">
                      Événement automatiquement assigné à votre organisation
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="datetime">Date et heure *</Label>
                  <Input
                    id="datetime"
                    value={formData.datetime || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, datetime: e.target.value }))}
                    placeholder="ex: mercredi 21 mai 2025 à 16h30"
                    className={`${theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B]' : 'border-white/20 bg-white/10 text-white'} ${validationErrors.datetime ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  {validationErrors.datetime ? (
                    <p className="text-red-500 text-sm">{validationErrors.datetime}</p>
                  ) : (
                    <p className="text-xs text-white/60">Format : jour date mois année à/de heure</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date réelle *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className={`${theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B]' : 'border-white/20 bg-white/10 text-white'} ${validationErrors.date ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  {validationErrors.date ? (
                    <p className="text-red-500 text-sm">{validationErrors.date}</p>
                  ) : (
                    <p className="text-xs text-white/60">Permet un tri fiable par date</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">Heure de fin (optionnel)</Label>
                  <Input
                    id="end_time"
                    value={formData.end_time || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                    placeholder="ex: 19h00"
                    className={theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B]' : 'border-white/20 bg-white/10 text-white'}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location_place">Nom du lieu (optionnel)</Label>
                    <Input
                      id="location_place"
                      value={formData.location_place || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, location_place: e.target.value }))}
                      placeholder="ex: La Solid'"
                      className={theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B]' : 'border-white/20 bg-white/10 text-white'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location_city">Ville *</Label>
                    <Input
                      id="location_city"
                      value={formData.location_city || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, location_city: e.target.value }))}
                      placeholder="ex: CLISSON"
                      className={`${theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B]' : 'border-white/20 bg-white/10 text-white'} ${validationErrors.location_city ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                    {validationErrors.location_city && (
                      <p className="text-red-500 text-sm">{validationErrors.location_city}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location_department">Département (optionnel)</Label>
                    <Input
                      id="location_department"
                      value={formData.location_department || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, location_department: e.target.value }))}
                      placeholder="ex: 44"
                      className={theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B]' : 'border-white/20 bg-white/10 text-white'}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Prix (optionnel)</Label>
                  <Input
                    id="price"
                    value={formData.price || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="ex: 5-8€, gratuit, prix libre"
                    className={theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B]' : 'border-white/20 bg-white/10 text-white'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audience">Public visé (optionnel)</Label>
                  <Input
                    id="audience"
                    value={formData.audience || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, audience: e.target.value }))}
                    placeholder="ex: à partir de 3 ans, tout public"
                    className={theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B]' : 'border-white/20 bg-white/10 text-white'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emoji">Emoji (optionnel)</Label>
                  <Input
                    id="emoji"
                    value={formData.emoji || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, emoji: e.target.value }))}
                    placeholder="ex: 📖, ❤️"
                    className={theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B]' : 'border-white/20 bg-white/10 text-white'}
                  />
                </div>
              </div>
              {/* Champ URL (optionnel) */}
              <div className="space-y-2">
                <Label htmlFor="url">Lien externe (optionnel)</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="ex: https://www.monevenement.com"
                  className={theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B]' : 'border-white/20 bg-white/10 text-white'}
                />
              </div>

              {/* Champ URL billeterie (optionnel) */}
              <div className="space-y-2">
                <Label htmlFor="ticketing_url">Lien billeterie (optionnel)</Label>
                <Input
                  id="ticketing_url"
                  type="url"
                  value={formData.ticketing_url || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, ticketing_url: e.target.value }))}
                  placeholder="ex: https://billetterie.exemple.com"
                  className={theme === 'light' ? 'border-[#f3e0c7] bg-white text-[#1B263B]' : 'border-white/20 bg-white/10 text-white'}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Card d'upload affiche avec dropzone */}
        <Card className={theme === 'light' ? 'w-full md:w-1/4 bg-[#fff7e6] border-[#f3e0c7] text-[#1B263B] shadow-lg py-5 flex flex-col items-center justify-start min-h-[350px]' : 'w-full md:w-1/4 bg-ephemeride-light border-none text-ephemeride-foreground shadow-lg py-5 flex flex-col items-center justify-start min-h-[350px]'}>
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
                  className={`w-full h-48 flex flex-col items-center justify-center rounded border-2 border-dashed transition-colors cursor-pointer ${isDragActive ? (theme === 'light' ? 'border-green-400 bg-green-50/10' : 'border-green-400 bg-green-50/10') : (theme === 'light' ? 'border-[#f3e0c7] bg-white' : 'border-white/20 bg-white/10')}`}
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
            className={theme === 'light' ? 'border-[#f3e0c7] text-[#1B263B] hover:bg-[#ffe2b0]' : 'border-white/20 text-white hover:bg-white/10'}
            type="button"
            disabled={false}
          >
            Annuler
          </Button>
          {showValidationActions ? (
            <div className="flex gap-2">
              <Button
                type="button"
                className="bg-green-600 text-white hover:bg-green-700"
                disabled={false}
                onClick={() => onSave({ ...formData, status: 'accepted' })}
              >
                Accepter
              </Button>
              <Button
                type="button"
                className="bg-red-600 text-white hover:bg-red-700"
                disabled={false}
                onClick={() => onSave({ ...formData, status: 'rejected' })}
              >
                Refuser
              </Button>
            </div>
          ) : (
            <Button
              type="submit"
              className={theme === 'light' ? 'bg-[#fff7e6] text-[#1B263B] border-[#f3e0c7] hover:bg-[#ffe2b0] shadow-sm' : 'bg-white text-ephemeride hover:bg-white/80'}
              disabled={false}
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
