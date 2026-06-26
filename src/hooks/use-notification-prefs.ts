"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as baseSupabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const supabase = baseSupabase as unknown as SupabaseClient;

export interface NotificationPrefs {
  notify_bookmarks: boolean;
  notify_cities: boolean;
  notify_organizations: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  notify_bookmarks: true,
  notify_cities: true,
  notify_organizations: true,
};

/**
 * Préférences de notification de l'utilisateur connecté (1 ligne par user).
 * L'absence de ligne équivaut à « tout activé ». `setPref` upsert la ligne.
 */
export const useNotificationPrefs = () => {
  const { user } = useAuth();
  const userId = user?.id as string | undefined;
  const queryClient = useQueryClient();

  const queryKey = ["notification-prefs", userId];

  const { data: prefs = DEFAULT_PREFS, isLoading } = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("notify_bookmarks, notify_cities, notify_organizations")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return (data as NotificationPrefs | null) ?? DEFAULT_PREFS;
    },
  });

  const mutation = useMutation({
    mutationFn: async (next: NotificationPrefs) => {
      if (!userId) throw new Error("not authenticated");
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          { user_id: userId, ...next, updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
      if (error) throw error;
    },
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<NotificationPrefs>(queryKey);
      queryClient.setQueryData(queryKey, next);
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const setPref = useCallback(
    (key: keyof NotificationPrefs, value: boolean) => {
      mutation.mutate({ ...prefs, [key]: value });
    },
    [prefs, mutation],
  );

  return { prefs, setPref, isLoading };
};
