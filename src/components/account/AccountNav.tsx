"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Bookmark, Megaphone, User } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/compte/profil", label: "Mon profil", icon: User },
  { href: "/compte/favoris", label: "Mes favoris", icon: Bookmark },
  { href: "/compte/notifications", label: "Notifications", icon: Bell },
  { href: "/compte/organisateurs", label: "Organisateur·ices suivis", icon: Megaphone },
];

/**
 * Navigation de la section Compte :
 * - mobile : un sélecteur compact (menu déroulant) pour changer de section ;
 * - desktop : une colonne latérale verticale.
 */
export const AccountNav = () => {
  const pathname = usePathname();
  const router = useRouter();
  const activeHref =
    ITEMS.find((i) => pathname === i.href || pathname?.startsWith(i.href + "/"))?.href ?? ITEMS[0].href;

  return (
    <>
      {/* Mobile : sélecteur de section */}
      <div className="md:hidden">
        <Select value={activeHref} onValueChange={(v) => router.push(v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ITEMS.map(({ href, label, icon: Icon }) => (
              <SelectItem key={href} value={href}>
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop : colonne latérale */}
      <nav className="hidden md:flex md:flex-col md:gap-1">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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
    </>
  );
};

export default AccountNav;
