"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAuthDialog } from "@/components/account/AuthDialogProvider";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { LogoLink } from "@/components/LogoLink";
import { AccountNav } from "@/components/account/AccountNav";

/**
 * Layout de la section Compte : garde d'authentification, en-tête « Retour à
 * l'agenda » et navigation latérale partagée par toutes les sous-pages.
 */
export default function CompteLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { openAuthDialog } = useAuthDialog();
  const { theme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col dark:bg-ephemeride light:bg-[#faf3ec]">
      <header className="py-4 px-4 md:px-8">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Retour à l'agenda
            </Link>
          </Button>
          {/* Petit logo pour égayer l'en-tête. */}
          <LogoLink
            src={theme === "light" ? "/images/ephemeride-logo-lite.png" : "/images/ephemeride-logo-dark.png"}
            className="h-8 w-auto object-contain"
          />
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 md:px-8 py-6 md:py-10">
        <div className="max-w-5xl mx-auto">
          {isLoading ? (
            <p className="opacity-70">Chargement…</p>
          ) : !isAuthenticated ? (
            <div className="rounded-xl border border-white/10 p-8 text-center space-y-4">
              <p className="opacity-80">Connectez-vous pour accéder à votre compte.</p>
              <Button onClick={openAuthDialog}>Se connecter</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
              <aside className="min-w-0 md:sticky md:top-6 md:self-start">
                <AccountNav />
              </aside>
              <div className="min-w-0">{children}</div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
