"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as baseSupabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const supabase = baseSupabase as unknown as SupabaseClient;

export type NotificationType = "bookmark" | "city" | "organization";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  url: string | null;
  event_id: string | null;
  organization_id: string | null;
  target_city: string | null;
  icon: string | null;
  read_at: string | null;
  created_at: string;
}

// Rafraîchissement périodique du fil (le push reste le canal temps réel principal).
const REFETCH_MS = 60_000;

/**
 * Historique de notifications de l'utilisateur connecté (Notification Tray).
 * - `notifications` : fil trié du plus récent au plus ancien.
 * - `unreadCount` : nombre de notifications non lues.
 * - `markRead(id)` / `markAllRead()`.
 */
export const useNotifications = () => {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id as string | undefined;
  const queryClient = useQueryClient();

  const queryKey = ["notifications", userId];

  const { data: notifications = [], isLoading } = useQuery({
    queryKey,
    enabled: !!userId,
    refetchInterval: isAuthenticated ? REFETCH_MS : false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, body, url, event_id, organization_id, target_city, icon, read_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
  });

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const markReadMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!userId || ids.length === 0) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .in("id", ids);
      if (error) throw error;
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<AppNotification[]>(queryKey);
      const now = new Date().toISOString();
      const idset = new Set(ids);
      queryClient.setQueryData<AppNotification[]>(
        queryKey,
        (prev ?? []).map((n) => (idset.has(n.id) && !n.read_at ? { ...n, read_at: now } : n)),
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const markRead = useCallback(
    (id: string) => markReadMutation.mutate([id]),
    [markReadMutation],
  );

  const markAllRead = useCallback(() => {
    const ids = notifications.filter((n) => !n.read_at).map((n) => n.id);
    if (ids.length > 0) markReadMutation.mutate(ids);
  }, [notifications, markReadMutation]);

  return { notifications, unreadCount, markRead, markAllRead, isAuthenticated, isLoading };
};
