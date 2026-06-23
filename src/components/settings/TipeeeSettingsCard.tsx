"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  DEFAULT_TIPEEE_SETTINGS,
  fetchTipeeeSettings,
  saveTipeeeSettings,
  type TipeeeMode,
  type TipeeeSettings,
} from "@/lib/siteSettings";

/**
 * Carte de configuration du widget de soutien Tipeee dans l'administration.
 * Permet d'activer/désactiver le widget, de renseigner l'URL et de choisir
 * entre un bouton flottant ou un widget embarqué.
 */
const TipeeeSettingsCard = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<TipeeeSettings>(DEFAULT_TIPEEE_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["site-settings", "tipeee"],
    queryFn: fetchTipeeeSettings,
  });

  // Synchroniser le formulaire avec les données chargées
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: TipeeeSettings = { ...form, url: form.url.trim() };
      await saveTipeeeSettings(payload);
      queryClient.invalidateQueries({ queryKey: ["site-settings", "tipeee"] });
      toast({ title: "Configuration enregistrée", description: "Le widget de soutien a été mis à jour." });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'enregistrer la configuration.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Soutien (Tipeee)</CardTitle>
        <CardDescription>
          Affichez un widget de soutien Tipeee sur la page d'accueil.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Chargement…</p>
        ) : (
          <div className="space-y-4 max-w-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="tipeee-enabled">Activer le widget</Label>
                <p className="text-sm text-muted-foreground">Affiche le bouton/widget de soutien sur le site.</p>
              </div>
              <Switch
                id="tipeee-enabled"
                checked={form.enabled}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, enabled: checked }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipeee-url">URL Tipeee</Label>
              <Input
                id="tipeee-url"
                type="url"
                placeholder="https://fr.tipeee.com/mon-projet"
                value={form.url}
                onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
              />
              <p className="text-sm text-muted-foreground">
                En mode « Widget embarqué », utilisez l'URL d'intégration fournie par Tipeee (la page doit autoriser l'affichage en iframe).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipeee-mode">Affichage</Label>
              <Select
                value={form.mode}
                onValueChange={(value) => setForm((prev) => ({ ...prev, mode: value as TipeeeMode }))}
              >
                <SelectTrigger id="tipeee-mode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="button">Bouton flottant</SelectItem>
                  <SelectItem value="embed">Widget embarqué</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TipeeeSettingsCard;