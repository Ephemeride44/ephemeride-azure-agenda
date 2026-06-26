"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as baseSupabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/account/AuthDialogProvider";

const supabase = baseSupabase as unknown as SupabaseClient;

export interface OrganizerSummary {
  id: string;
  name: string;
  location_city: string | null;
  location_department: string | null;
  logo_url: string | null;
}

/**
 * Abonnements de l'utilisateur connecté aux organisateur·ices (organizations).
 * Expose aussi la liste des organisations actives pour les écrans de sélection.
 */
export const useOrganizerSubscriptions = () => {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id as string | undefined;
  const queryClient = useQueryClient();
  const { openAuthDialog } = useAuthDialog();

  const queryKey = ["organizer-subscriptions", userId];

  const { data: subscribedIds = new Set<string>(), isLoading } = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_subscriptions")
        .select("organization_id")
        .eq("user_id", userId);
      if (error) throw error;
      return new Set<string>(
        (data ?? []).map((row: { organization_id: string }) => row.organization_id),
      );
    },
  });

  // Liste des organisations actives (pour le wizard / la page Compte).
  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, location_city, location_department, logo_url")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as OrganizerSummary[];
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ orgId, next }: { orgId: string; next: boolean }) => {
      if (!userId) throw new Error("not authenticated");
      if (next) {
        const { error } = await supabase
          .from("organization_subscriptions")
          .insert({ user_id: userId, organization_id: orgId });
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase
          .from("organization_subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("organization_id", orgId);
        if (error) throw error;
      }
    },
    onMutate: async ({ orgId, next }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<Set<string>>(queryKey);
      const optimistic = new Set(prev ?? []);
      if (next) optimistic.add(orgId);
      else optimistic.delete(orgId);
      queryClient.setQueryData(queryKey, optimistic);
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const isSubscribed = useCallback(
    (orgId: string) => subscribedIds.has(orgId),
    [subscribedIds],
  );

  const toggle = useCallback(
    (orgId: string) => {
      if (!isAuthenticated || !userId) {
        openAuthDialog();
        return;
      }
      mutation.mutate({ orgId, next: !subscribedIds.has(orgId) });
    },
    [isAuthenticated, userId, subscribedIds, mutation, openAuthDialog],
  );

  return { subscribedIds, isSubscribed, toggle, organizations, isAuthenticated, isLoading };
};
