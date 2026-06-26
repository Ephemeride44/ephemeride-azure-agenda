"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { AuthHero } from "@/components/account/AuthHero";
import { LogoLink } from "@/components/LogoLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ConnexionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { theme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);
    if (error) {
      toast({ title: "Échec de connexion", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Connexion réussie", description: "Bon retour !" });
    router.push("/");
  };

  const handleReset = async () => {
    if (!email) {
      toast({ title: "E-mail requis", description: "Saisissez votre adresse e-mail pour recevoir un lien.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    toast(
      error
        ? { title: "Erreur", description: error.message, variant: "destructive" }
        : { title: "E-mail envoyé", description: "Un lien de réinitialisation vous a été envoyé." },
    );
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthHero
        title="Votre agenda culturel, à votre façon."
        subtitle="Connectez-vous pour retrouver vos favoris et vos alertes, partout."
        benefits={[
          "Gardez vos événements en favoris",
          "Soyez alerté·e des changements",
          "Suivez vos organisateur·ices préférés",
        ]}
      />

      <div className="flex items-center justify-center bg-background px-6 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <LogoLink
              src={theme === "light" ? "/images/ephemeride-logo-lite.png" : "/images/ephemeride-logo-dark.png"}
              className="h-16 w-auto object-contain"
            />
          </div>

          <h1 className="text-2xl font-bold">Se connecter</h1>
          <p className="mt-1 text-sm text-muted-foreground">Heureux de vous revoir.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <button type="button" onClick={handleReset} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                  Mot de passe oublié ?
                </button>
              </div>
              <Input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Connexion…" : "Se connecter"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link href="/inscription" className="font-semibold text-foreground hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
