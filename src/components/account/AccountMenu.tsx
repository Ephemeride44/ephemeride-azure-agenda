"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import { Bell, Bookmark, LogIn, LogOut, Megaphone, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GradientAvatar } from "@/components/account/GradientAvatar";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoleContext } from "@/components/UserRoleProvider";
import { useAuthDialog } from "@/components/account/AuthDialogProvider";
import { getAvatarUrl, getDisplayName } from "@/lib/user";
import { cn } from "@/lib/utils";

const loginButtonClass =
  "bg-accent-peach text-accent-peach-foreground border-transparent hover:bg-accent-peach-hover hover:text-accent-peach-foreground shadow-sm";

/**
 * Déclencheur du menu : avatar circulaire (photo ou initiales sur dégradé pêche
 * → violet), entouré d'un anneau qui s'anime au survol/focus.
 */
const AvatarTrigger = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<"button">>(
  ({ className, ...props }, ref) => {
    const { user } = useAuth();
    const displayName = getDisplayName(user);

    return (
      <button
        ref={ref}
        type="button"
        aria-label="Mon compte"
        className={cn(
          "rounded-full outline-none ring-2 ring-accent-peach/40 ring-offset-2 ring-offset-background transition hover:ring-accent-violet/70 focus-visible:ring-accent-violet active:scale-95",
          className,
        )}
        {...props}
      >
        <GradientAvatar name={displayName} src={getAvatarUrl(user)} className="h-10 w-10" />
      </button>
    );
  },
);
AvatarTrigger.displayName = "AvatarTrigger";

/**
 * Items du menu utilisateur, partagés entre le menu compte (desktop) et le
 * hamburger (mobile) : compte, favoris, notifications, organisateurs suivis,
 * accès admin (si admin), déconnexion.
 */
const AccountMenuItems = () => {
  const { user, isAuthenticated, signOut } = useAuth();
  const { isSuperAdmin, organizations } = useUserRoleContext();
  const isAdmin = isSuperAdmin || organizations.length > 0;

  if (!isAuthenticated) return null;

  const email = (user?.email as string | undefined) ?? "";
  const displayName = getDisplayName(user);

  return (
    <>
      <div className="flex items-center gap-3 px-2 py-2.5">
        <GradientAvatar name={displayName} src={getAvatarUrl(user)} className="h-11 w-11" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">{displayName}</p>
          {email && <p className="truncate text-xs text-muted-foreground">{email}</p>}
        </div>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href="/compte/profil" className="cursor-pointer rounded-lg py-2">
          <User className="mr-2 h-4 w-4" />
          Mon profil
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/compte/favoris" className="cursor-pointer rounded-lg py-2">
          <Bookmark className="mr-2 h-4 w-4" />
          Mes favoris
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/compte/notifications" className="cursor-pointer rounded-lg py-2">
          <Bell className="mr-2 h-4 w-4" />
          Notifications
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/compte/organisateurs" className="cursor-pointer rounded-lg py-2">
          <Megaphone className="mr-2 h-4 w-4" />
          Organisateurs suivis
        </Link>
      </DropdownMenuItem>
      {isAdmin && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/admin" className="cursor-pointer rounded-lg py-2">
              <Shield className="mr-2 h-4 w-4" />
              Administration
            </Link>
          </DropdownMenuItem>
        </>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer rounded-lg py-2">
        <LogOut className="mr-2 h-4 w-4" />
        Se déconnecter
      </DropdownMenuItem>
    </>
  );
};

/**
 * Menu compte de l'en-tête desktop. Visiteur non connecté → bouton « Connexion »
 * qui ouvre la modale d'authentification.
 */
export const AccountMenu = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { openAuthDialog } = useAuthDialog();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return (
      <Button className={loginButtonClass} onClick={openAuthDialog}>
        <LogIn className="mr-2 h-4 w-4" />
        Connexion
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AvatarTrigger />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
        <AccountMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * Menu utilisateur (mobile) : même avatar et mêmes items que le desktop.
 * Visiteur non connecté → bouton « Connexion ». Le choix du thème se fait dans
 * « Mon profil ».
 */
export const MobileMenu = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { openAuthDialog } = useAuthDialog();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return (
      <Button variant="outline" size="icon" aria-label="Connexion" className={loginButtonClass} onClick={openAuthDialog}>
        <LogIn size={20} />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AvatarTrigger />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
        <AccountMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AccountMenu;
