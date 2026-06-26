"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as baseSupabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/account/AuthDialogProvider";
import { usePushPrompt } from "@/components/account/PushPromptProvider";

// Cast pour ignorer le typage strict (tables non encore régénérées dans types.ts).
const supabase = baseSupabase as unknown as SupabaseClient;

/**
 * Gestion des favoris de l'utilisateur connecté.
 * - `bookmarkedIds` : ensemble des ids d'événements favorisés (état partagé).
 * - `toggle(id)` : ajoute/retire un favori. Si l'utilisateur n'est pas
 *   connecté, ouvre la modale d'authentification au lieu d'écrire.
 */
export const useBookmarks = () => {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id as string | undefined;
  const queryClient = useQueryClient();
  const { openAuthDialog } = useAuthDialog();
  const { promptPushIfEligible } = usePushPrompt();

  const queryKey = ["bookmarks", userId];

  const { data: bookmarkedIds = new Set<string>(), isLoading } = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("event_id")
        .eq("user_id", userId);
      if (error) throw error;
      return new Set<string>((data ?? []).map((row: { event_id: string }) => row.event_id));
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ eventId, next }: { eventId: string; next: boolean }) => {
      if (!userId) throw new Error("not authenticated");
      if (next) {
        const { error } = await supabase
          .from("bookmarks")
          .insert({ user_id: userId, event_id: eventId });
        // 23505 = doublon (déjà en favori) → on ignore.
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", userId)
          .eq("event_id", eventId);
        if (error) throw error;
      }
    },
    onMutate: async ({ eventId, next }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<Set<string>>(queryKey);
      const optimistic = new Set(prev ?? []);
      if (next) optimistic.add(eventId);
      else optimistic.delete(eventId);
      queryClient.setQueryData(queryKey, optimistic);
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["my-bookmarked-events", userId] });
    },
  });

  const isBookmarked = useCallback(
    (eventId: string) => bookmarkedIds.has(eventId),
    [bookmarkedIds],
  );

  const toggle = useCallback(
    (eventId: string) => {
      if (!isAuthenticated || !userId) {
        openAuthDialog();
        return;
      }
      const next = !bookmarkedIds.has(eventId);
      mutation.mutate({ eventId, next });
      // À l'ajout d'un favori, proposer d'activer les notifications (si éligible).
      if (next) promptPushIfEligible();
    },
    [isAuthenticated, userId, bookmarkedIds, mutation, openAuthDialog, promptPushIfEligible],
  );

  return { bookmarkedIds, isBookmarked, toggle, isAuthenticated, isLoading };
};
