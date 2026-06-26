"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Bookmark, MapPin, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  type AppNotification,
  type NotificationType,
} from "@/hooks/use-notifications";

type Filter = "all" | NotificationType;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tout" },
  { key: "bookmark", label: "Favoris" },
  { key: "city", label: "Villes" },
  { key: "organization", label: "Organisateur·ices" },
];

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
  bookmark: <Bookmark className="h-4 w-4 text-accent-peach" />,
  city: <MapPin className="h-4 w-4 text-accent-violet" />,
  organization: <Megaphone className="h-4 w-4 text-emerald-500" />,
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Regroupe les notifications par tranche temporelle relative.
function groupKey(createdAt: string): "today" | "week" | "older" {
  const now = new Date();
  const today = startOfDay(now);
  const ts = new Date(createdAt).getTime();
  if (ts >= today) return "today";
  if (ts >= today - 6 * 24 * 60 * 60 * 1000) return "week";
  return "older";
}

const GROUP_LABEL: Record<"today" | "week" | "older", string> = {
  today: "Aujourd'hui",
  week: "Cette semaine",
  older: "Plus ancien",
};

function relativeTime(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.round(h / 24);
  return `il y a ${j} j`;
}

interface NotificationTrayContentProps {
  onNavigate?: () => void;
}

/**
 * Contenu du centre de notifications : filtres par canal, regroupement temporel,
 * marquage comme lu. Lit l'historique persistant via `useNotifications`.
 */
export const NotificationTrayContent = ({ onNavigate }: NotificationTrayContentProps) => {
  const { notifications, unreadCount, markRead, markAllRead, isLoading } = useNotifications();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(
    () => (filter === "all" ? notifications : notifications.filter((n) => n.type === filter)),
    [notifications, filter],
  );

  const groups = useMemo(() => {
    const map: Record<"today" | "week" | "older", AppNotification[]> = { today: [], week: [], older: [] };
    for (const n of filtered) map[groupKey(n.created_at)].push(n);
    return map;
  }, [filtered]);

  return (
    <div className="flex max-h-[70vh] flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Bell className="h-4 w-4" />
          Notifications
          {unreadCount > 0 && (
            <span className="rounded-full bg-accent-peach px-2 py-0.5 text-xs font-semibold text-accent-peach-foreground">
              {unreadCount}
            </span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto border-b border-border px-4 py-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === f.key
                ? "bg-accent-peach text-accent-peach-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Aucune notification pour le moment.
          </p>
        ) : (
          (["today", "week", "older"] as const).map((key) =>
            groups[key].length === 0 ? null : (
              <div key={key}>
                <p className="bg-muted/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {GROUP_LABEL[key]}
                </p>
                {groups[key].map((n) => (
                  <NotificationItem key={n.id} notification={n} onMarkRead={markRead} onNavigate={onNavigate} />
                ))}
              </div>
            ),
          )
        )}
      </div>
    </div>
  );
};

// Navigation selon le type de notification :
// - favori : scroll fluide jusqu'à l'événement sur l'agenda ;
// - ville : applique le filtre commune puis scroll jusqu'à l'événement ;
// - organisateur·ice : ouvre la page de l'organisateur·ice.
function navigateToNotification(router: ReturnType<typeof useRouter>, n: AppNotification) {
  if (n.type === "organization" && n.organization_id) {
    router.push(`/organisateur·ice/${n.organization_id}`);
    return;
  }
  if ((n.type === "bookmark" || n.type === "city") && n.event_id) {
    // Favori comme ville : on scrolle simplement jusqu'à l'événement sur
    // l'agenda (le filtre par commune est désactivé pour l'instant).
    const href = `/?focus=${n.event_id}`;
    // Déjà sur l'agenda : on met à jour l'URL et on signale sans remonter la page.
    if (typeof window !== "undefined" && window.location.pathname === "/") {
      window.history.replaceState(null, "", href);
      window.dispatchEvent(new CustomEvent("ephemeride:navigate-focus"));
    } else {
      router.push(href);
    }
    return;
  }
  if (n.url) router.push(n.url);
}

const NotificationItem = ({
  notification: n,
  onMarkRead,
  onNavigate,
}: {
  notification: AppNotification;
  onMarkRead: (id: string) => void;
  onNavigate?: () => void;
}) => {
  const router = useRouter();
  const unread = !n.read_at;

  const handleClick = () => {
    if (unread) onMarkRead(n.id);
    onNavigate?.();
    navigateToNotification(router, n);
  };

  return (
    <button type="button" onClick={handleClick} className="block w-full text-left">
      <div className={cn("flex gap-3 px-4 py-3 transition-colors hover:bg-muted/40", unread && "bg-accent-peach/5")}>
        <span className="mt-0.5 shrink-0">{TYPE_ICON[n.type]}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="font-semibold">{n.title}</span>
            {n.body ? <span className="text-muted-foreground"> — {n.body}</span> : null}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{relativeTime(n.created_at)}</p>
        </div>
        {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-peach" />}
      </div>
    </button>
  );
};

export default NotificationTrayContent;
