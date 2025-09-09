import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase as baseSupabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const supabase: SupabaseClient = baseSupabase;

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

interface OrganizationFormProps {
  organization?: Organization;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const OrganizationForm: React.FC<OrganizationFormProps> = ({
  organization,
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name: organization?.name || '',
    description: organization?.description || '',
    contact_email: organization?.contact_email || '',
    contact_phone: organization?.contact_phone || '',
    address: organization?.address || '',
    website_url: organization?.website_url || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let result;
      
      if (organization) {
        // Mise à jour
        result = await supabase
          .from('organizations')
          .update(formData)
          .eq('id', organization.id);
      } else {
        // Création
        result = await supabase
          .from('organizations')
          .insert([formData]);
      }

      if (result.error) {
        throw result.error;
      }

      toast({
        title: "Succès",
        description: organization 
          ? "Organisation mise à jour avec succès" 
          : "Organisation créée avec succès",
      });

      onSuccess?.();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'organisation:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la sauvegarde",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nom de l'organisation *</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="Ex: Festival de Jazz de Nantes"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Description de l'organisation..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact_email">Email de contact</Label>
          <Input
            id="contact_email"
            name="contact_email"
            type="email"
            value={formData.contact_email}
            onChange={handleChange}
            placeholder="contact@organisation.fr"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_phone">Téléphone</Label>
          <Input
            id="contact_phone"
            name="contact_phone"
            value={formData.contact_phone}
            onChange={handleChange}
            placeholder="02 XX XX XX XX"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Adresse</Label>
        <Input
          id="address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="123 Rue de la Musique, 44000 Nantes"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="website_url">Site web</Label>
        <Input
          id="website_url"
          name="website_url"
          type="url"
          value={formData.website_url}
          onChange={handleChange}
          placeholder="https://www.organisation.fr"
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Sauvegarde...' : organization ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  );
};
