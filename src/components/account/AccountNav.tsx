"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Bookmark, Megaphone, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/compte/profil", label: "Mon profil", icon: User },
  { href: "/compte/favoris", label: "Mes favoris", icon: Bookmark },
  { href: "/compte/notifications", label: "Notifications", icon: Bell },
  { href: "/compte/organisateurs", label: "Organisateurs suivis", icon: Megaphone },
];

/**
 * Navigation de la section Compte : colonne latérale (desktop) / onglets
 * scrollables (mobile).
 */
export const AccountNav = () => {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname?.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent-peach/15 text-accent-peach"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
};

export default AccountNav;
