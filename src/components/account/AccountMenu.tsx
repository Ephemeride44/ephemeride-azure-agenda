"use client";

import { forwardRef, useState, type ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import { Bell, Bookmark, LogOut, Megaphone, Shield, User, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { GradientAvatar } from "@/components/account/GradientAvatar";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoleContext } from "@/components/UserRoleProvider";
import { useAuthDialog } from "@/components/account/AuthDialogProvider";
import { getAvatarUrl, getDisplayName } from "@/lib/user";
import { cn } from "@/lib/utils";

// Lien « Connexion » discret (texte clair très léger, sans fond).
const loginLinkClass = "font-normal text-foreground/70 hover:bg-transparent hover:text-foreground";

type MenuLink = { href: string; label: string; icon: LucideIcon };

// Liens du menu compte, partagés entre le dropdown desktop et le panneau mobile.
const MENU_LINKS: MenuLink[] = [
  { href: "/compte/profil", label: "Mon profil", icon: User },
  { href: "/compte/favoris", label: "Mes favoris", icon: Bookmark },
  { href: "/compte/notifications", label: "Notifications", icon: Bell },
  { href: "/compte/organisateurs", label: "Organisateur·ices suivis", icon: Megaphone },
];

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

/** Bandeau de profil (avatar + nom + e-mail), partagé desktop/mobile. */
const ProfileHeader = ({ className }: { className?: string }) => {
  const { user } = useAuth();
  const email = (user?.email as string | undefined) ?? "";
  const displayName = getDisplayName(user);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <GradientAvatar name={displayName} src={getAvatarUrl(user)} className="h-11 w-11" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight">{displayName}</p>
        {email && <p className="truncate text-xs text-muted-foreground">{email}</p>}
      </div>
    </div>
  );
};

/**
 * Items du menu compte (desktop) : profil, favoris, notifications,
 * organisateur·ices suivis, accès admin (si admin), déconnexion.
 */
const AccountMenuItems = () => {
  const { isAuthenticated, signOut } = useAuth();
  const { isSuperAdmin, organizations } = useUserRoleContext();
  const isAdmin = isSuperAdmin || organizations.length > 0;

  if (!isAuthenticated) return null;

  return (
    <>
      <ProfileHeader className="px-2 py-2.5" />
      <DropdownMenuSeparator />
      {MENU_LINKS.map(({ href, label, icon: Icon }) => (
        <DropdownMenuItem key={href} asChild>
          <Link href={href} className="cursor-pointer rounded-lg py-2">
            <Icon className="mr-2 h-4 w-4" />
            {label}
          </Link>
        </DropdownMenuItem>
      ))}
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
      <Button variant="ghost" onClick={openAuthDialog} className={loginLinkClass}>
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

/** Ligne de lien tactile (plein largeur) pour le panneau mobile. */
const mobileLinkClass =
  "flex items-center gap-4 rounded-xl px-4 py-4 text-base font-medium text-foreground transition active:scale-[0.99] active:bg-muted hover:bg-muted";

/**
 * Menu utilisateur (mobile) : panneau plein écran (Sheet) avec des cibles
 * tactiles larges, pour éviter les misclics du petit dropdown. Passe au-dessus
 * de la barre fixe du bas (z-[60]) via `!z-[80]`. Visiteur non connecté →
 * bouton « Connexion ». Le choix du thème se fait dans « Mon profil ».
 */
export const MobileMenu = () => {
  const { isAuthenticated, isLoading, signOut } = useAuth();
  const { isSuperAdmin, organizations } = useUserRoleContext();
  const { openAuthDialog } = useAuthDialog();
  const [open, setOpen] = useState(false);
  const isAdmin = isSuperAdmin || organizations.length > 0;

  if (isLoading) return null;

  if (!isAuthenticated) {
    return (
      <Button variant="ghost" size="sm" onClick={openAuthDialog} className={cn("px-2", loginLinkClass)}>
        Connexion
      </Button>
    );
  }

  const links: MenuLink[] = isAdmin
    ? [...MENU_LINKS, { href: "/admin", label: "Administration", icon: Shield }]
    : MENU_LINKS;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <AvatarTrigger />
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full max-w-none flex-col gap-0 p-0 !z-[80] sm:max-w-none"
      >
        <div className="border-b px-5 pb-5 pt-6">
          <SheetTitle className="sr-only">Mon compte</SheetTitle>
          <ProfileHeader />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {links.map(({ href, label, icon: Icon }) => (
            <SheetClose asChild key={href}>
              <Link href={href} className={mobileLinkClass}>
                <Icon className="h-5 w-5 text-muted-foreground" />
                {label}
              </Link>
            </SheetClose>
          ))}
        </nav>
        <div className="border-t p-3">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className={cn(mobileLinkClass, "w-full text-left text-destructive hover:bg-destructive/10 active:bg-destructive/10")}
          >
            <LogOut className="h-5 w-5" />
            Se déconnecter
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AccountMenu;
