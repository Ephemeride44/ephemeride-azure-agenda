"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { useOnboarding } from "@/components/account/OnboardingProvider";
import { AuthHero } from "@/components/account/AuthHero";
import { LogoLink } from "@/components/LogoLink";
import { LegalLink } from "@/components/legal/LegalLink";
import { ConditionsContent, ConfidentialiteContent } from "@/components/legal/legal-content";
import { PasswordStrength, passwordScore } from "@/components/account/PasswordStrength";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function InscriptionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { theme } = useTheme();
  const { startOnboarding } = useOnboarding();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Mot de passe trop court", description: "6 caractères minimum.", variant: "destructive" });
      return;
    }
    if (!acceptTerms) {
      toast({ title: "Conditions requises", description: "Veuillez accepter les conditions d'utilisation.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName.trim(), last_name: lastName.trim(), full_name: fullName },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    setIsLoading(false);

    if (error) {
      toast({ title: "Échec de l'inscription", description: error.message, variant: "destructive" });
      return;
    }
    // Confirmation par e-mail activée → pas de session immédiate.
    if (!data.session) {
      setPendingConfirmation(true);
      return;
    }
    toast({ title: "Compte créé", description: "Bienvenue sur Éphéméride !" });
    router.push("/");
    setTimeout(() => startOnboarding(), 300);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthHero
        title="Rejoignez la communauté !"
        subtitle="Suivez les plus beaux événements du vignoble nantais, tout simplement."
        benefits={[
          "Marquez vos favoris et retrouvez les facilement",
          "Soyez alerté sur ce qui vous intéresse",
          "Proposez des événements à la communauté"
        ]}
      />

      <div className="flex items-center justify-center bg-background px-6 py-10">
        <div className="w-full max-w-md">
          {/* Logo (mobile uniquement) */}
          <div className="mb-8 flex justify-center lg:hidden">
            <LogoLink
              src={theme === "light" ? "/images/ephemeride-logo-lite.png" : "/images/ephemeride-logo-dark.png"}
              className="h-16 w-auto object-contain"
            />
          </div>

          {pendingConfirmation ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                <MailCheck className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold">Confirmez votre e-mail</h1>
              <p className="text-sm text-muted-foreground">
                Un lien de confirmation a été envoyé à <strong>{email}</strong>. Cliquez dessus pour activer
                votre compte, puis connectez-vous.
              </p>
              <Button asChild className="w-full">
                <Link href="/connexion">Aller à la connexion</Link>
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold">Créer un compte</h1>
              <p className="mt-1 text-sm text-muted-foreground">C'est rapide et gratuit.</p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="first-name">Prénom</Label>
                    <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="last-name">Nom</Label>
                    <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Adresse e-mail</Label>
                  <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input id="password" type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <PasswordStrength password={password} />
                </div>

                <label className="flex items-start gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-accent-peach"
                  />
                  <span>
                    J'accepte les{" "}
                    <LegalLink label="conditions d'utilisation" title="Conditions d'utilisation">
                      <ConditionsContent />
                    </LegalLink>{" "}
                    et la{" "}
                    <LegalLink label="politique de confidentialité" title="Politique de confidentialité">
                      <ConfidentialiteContent />
                    </LegalLink>
                    .
                  </span>
                </label>

                <Button type="submit" className="w-full" disabled={isLoading || passwordScore(password) === 0 || !acceptTerms}>
                  {isLoading ? "Création…" : "Créer mon compte"}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Déjà un compte ?{" "}
                <Link href="/connexion" className="font-semibold text-foreground hover:underline">
                  Se connecter
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
