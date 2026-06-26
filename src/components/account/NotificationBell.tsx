"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { NotificationTrayContent } from "@/components/account/NotificationTray";
import { useNotifications } from "@/hooks/use-notifications";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * Cloche de notifications avec badge non-lues. Ouvre le centre de notifications
 * en Popover (desktop) ou Drawer (mobile). Masquée pour les visiteurs non
 * connectés.
 */
export const NotificationBell = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { unreadCount } = useNotifications();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (isLoading || !isAuthenticated) return null;

  const hasUnread = unreadCount > 0;
  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      aria-label={hasUnread ? `Notifications (${unreadCount} non lues)` : "Notifications"}
      className={cn(
        "relative rounded-full transition-colors",
        hasUnread
          ? "text-rose-400 hover:bg-rose-400/10 hover:text-rose-500"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Bell size={20} />
      {hasUnread && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-400 px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        {/* Marge basse pour que le contenu dégage le menu fixe mobile (z-[60]). */}
        <DrawerContent className="pb-[calc(var(--mobile-menu-h,56px)+0.5rem)]">
          <NotificationTrayContent onNavigate={() => setOpen(false)} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <NotificationTrayContent onNavigate={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
