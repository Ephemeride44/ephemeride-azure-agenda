"use client";

import Link from "next/link";
import { Bookmark, LogOut, Menu, Moon, Shield, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoleContext } from "@/components/UserRoleProvider";
import { useTheme } from "@/components/ThemeProvider";

const triggerClass =
  "bg-accent-peach text-accent-peach-foreground border-transparent hover:bg-accent-peach-hover hover:text-accent-peach-foreground shadow-sm";

/**
 * Items du menu utilisateur, partagés entre le menu compte (desktop) et le
 * hamburger (mobile) : favoris, accès admin (si admin), déconnexion.
 * La connexion publique est volontairement absente pour l'instant — la
 * fonctionnalité est réservée aux utilisateurs existants (ils se connectent
 * via /admin).
 */
const AccountMenuItems = () => {
  const { user, isAuthenticated, signOut } = useAuth();
  const { isSuperAdmin, organizations } = useUserRoleContext();
  const isAdmin = isSuperAdmin || organizations.length > 0;

  if (!isAuthenticated) return null;

  const email = (user?.email as string | undefined) ?? "";
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    email.split("@")[0] ||
    "Mon compte";

  return (
    <>
      <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href="/mes-favoris" className="cursor-pointer">
          <Bookmark className="mr-2 h-4 w-4" />
          Mes favoris
        </Link>
      </DropdownMenuItem>
      {isAdmin && (
        <DropdownMenuItem asChild>
          <Link href="/admin" className="cursor-pointer">
            <Shield className="mr-2 h-4 w-4" />
            Administration
          </Link>
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
        <LogOut className="mr-2 h-4 w-4" />
        Se déconnecter
      </DropdownMenuItem>
    </>
  );
};

/**
 * Menu compte de l'en-tête desktop (icône utilisateur). Masqué tant que
 * l'utilisateur n'est pas connecté (pas de bouton de connexion public).
 */
export const AccountMenu = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Mon compte" className={triggerClass}>
          <User size={22} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <AccountMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * Menu hamburger (mobile) : thème clair/sombre + menu utilisateur. Masqué pour
 * les visiteurs non connectés (le thème reste accessible via la barre du bas).
 */
export const MobileMenu = () => {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Menu" className={triggerClass}>
          <Menu size={22} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            toggleTheme();
          }}
          className="cursor-pointer"
        >
          {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
          {theme === "dark" ? "Mode clair" : "Mode sombre"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <AccountMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AccountMenu;
