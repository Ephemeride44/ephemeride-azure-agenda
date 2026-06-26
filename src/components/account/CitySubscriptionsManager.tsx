"use client";

import { useState } from "react";
import { MapPin, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCitySubscriptions } from "@/hooks/use-city-subscriptions";

/**
 * Recherche + ajout de communes suivies, avec chips de suppression. Pas de
 * suggestions pour l'instant (saisie libre). Réutilisé par le wizard d'onboarding
 * et la page « Notifications » du compte.
 */
export const CitySubscriptionsManager = () => {
  const { cities, add, remove } = useCitySubscriptions();
  const [value, setValue] = useState("");

  const submit = () => {
    const city = value.trim();
    if (!city) return;
    add(city);
    setValue("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Rechercher une commune…"
            className="pl-9"
            aria-label="Ajouter une commune"
          />
        </div>
        <Button type="button" onClick={submit} disabled={!value.trim()}>
          <Plus className="mr-1 h-4 w-4" />
          Ajouter
        </Button>
      </div>

      {cities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {cities.map((city) => (
            <span
              key={city}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
            >
              {city}
              <button
                type="button"
                onClick={() => remove(city)}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label={`Retirer ${city}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default CitySubscriptionsManager;
