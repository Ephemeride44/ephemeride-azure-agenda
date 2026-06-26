"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as baseSupabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const supabase = baseSupabase as unknown as SupabaseClient;

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// Convertit la clé VAPID (base64url) en Uint8Array attendu par pushManager.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

interface PushState {
  /** Le navigateur supporte les service workers + Push API + Notification. */
  isSupported: boolean;
  /** iOS/iPadOS (Safari) : le push n'y fonctionne qu'en PWA installée. */
  isIos: boolean;
  /** L'app tourne en mode autonome (PWA installée / écran d'accueil). */
  isStandalone: boolean;
  permission: NotificationPermission | "unsupported";
  isSubscribed: boolean;
  isLoading: boolean;
}

const detectIos = () =>
  typeof navigator !== "undefined" &&
  /ipad|iphone|ipod/i.test(navigator.userAgent) &&
  !(/(crios|fxios)/i.test(navigator.userAgent)); // Chrome/Firefox iOS = WebKit aussi

const detectStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)")?.matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true);

/**
 * Gère l'abonnement Web Push de l'utilisateur connecté : permission navigateur,
 * souscription pushManager et enregistrement dans `push_subscriptions`.
 */
export const usePushSubscription = () => {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id as string | undefined;

  const [state, setState] = useState<PushState>({
    isSupported: false,
    isIos: false,
    isStandalone: false,
    permission: "unsupported",
    isSubscribed: false,
    isLoading: true,
  });

  // État initial : support, permission, abonnement existant.
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const isSupported =
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      if (!isSupported) {
        if (!cancelled)
          setState((s) => ({
            ...s,
            isSupported: false,
            isIos: detectIos(),
            isStandalone: detectStandalone(),
            permission: "unsupported",
            isLoading: false,
          }));
        return;
      }

      let isSubscribed = false;
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        isSubscribed = !!sub;
      } catch {
        /* ignore */
      }

      if (!cancelled)
        setState({
          isSupported: true,
          isIos: detectIos(),
          isStandalone: detectStandalone(),
          permission: Notification.permission,
          isSubscribed,
          isLoading: false,
        });
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || !userId) return false;
    if (!VAPID_PUBLIC_KEY) {
      console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY manquante.");
      return false;
    }
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState((s) => ({ ...s, permission, isLoading: false }));
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        });
      }

      const json = sub.toJSON();
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
          user_agent: navigator.userAgent,
        },
        { onConflict: "endpoint" },
      );
      if (error) throw error;

      setState((s) => ({ ...s, permission: "granted", isSubscribed: true, isLoading: false }));
      return true;
    } catch (err) {
      console.error("Échec de l'abonnement push :", err);
      setState((s) => ({ ...s, isLoading: false }));
      return false;
    }
  }, [isAuthenticated, userId]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setState((s) => ({ ...s, isSubscribed: false, isLoading: false }));
    } catch (err) {
      console.error("Échec du désabonnement push :", err);
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  return { ...state, subscribe, unsubscribe };
};
