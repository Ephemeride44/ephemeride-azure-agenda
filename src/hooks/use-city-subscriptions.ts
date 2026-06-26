"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as baseSupabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/account/AuthDialogProvider";

// Cast pour ignorer le typage strict (tables non encore régénérées dans types.ts).
const supabase = baseSupabase as unknown as SupabaseClient;

/**
 * Abonnements de l'utilisateur connecté aux communes (texte = events.location_city).
 * - `cities` : liste des communes suivies (chaîne d'affichage).
 * - `add(city)` / `remove(city)` : si non connecté, ouvre la modale d'auth.
 */
export const useCitySubscriptions = () => {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id as string | undefined;
  const queryClient = useQueryClient();
  const { openAuthDialog } = useAuthDialog();

  const queryKey = ["city-subscriptions", userId];

  const { data: cities = [], isLoading } = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("city_subscriptions")
        .select("city")
        .eq("user_id", userId)
        .order("city", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row: { city: string }) => row.city);
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ city, next }: { city: string; next: boolean }) => {
      if (!userId) throw new Error("not authenticated");
      if (next) {
        const { error } = await supabase
          .from("city_subscriptions")
          .insert({ user_id: userId, city });
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase
          .from("city_subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("city", city);
        if (error) throw error;
      }
    },
    onMutate: async ({ city, next }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<string[]>(queryKey);
      const set = new Set(prev ?? []);
      if (next) set.add(city);
      else set.delete(city);
      queryClient.setQueryData(queryKey, [...set].sort());
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const add = useCallback(
    (rawCity: string) => {
      const city = rawCity.trim();
      if (!city) return;
      if (!isAuthenticated || !userId) {
        openAuthDialog();
        return;
      }
      if (cities.includes(city)) return;
      mutation.mutate({ city, next: true });
    },
    [isAuthenticated, userId, cities, mutation, openAuthDialog],
  );

  const remove = useCallback(
    (city: string) => {
      if (!isAuthenticated || !userId) return;
      mutation.mutate({ city, next: false });
    },
    [isAuthenticated, userId, mutation],
  );

  return { cities, add, remove, isAuthenticated, isLoading };
};
