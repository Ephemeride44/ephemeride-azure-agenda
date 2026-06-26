"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { usePushPrompt } from "@/components/account/PushPromptProvider";
import { useOnboarding } from "@/components/account/OnboardingProvider";
import { supabase as baseSupabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

// Cast pour ignorer le typage strict de Supabase (aligné sur LoginForm).
const supabase = baseSupabase as unknown as SupabaseClient;

// Inscription publique ouverte : tout visiteur peut créer un compte pour suivre
// des favoris, des communes et des organisateurs.
const SIGNUP_ENABLED = true;

// Redirection dans le contexte courant (local / distant), comme le LoginForm.
const redirectUrl = (path: string) => `${window.location.origin}${path}`;

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modale d'authentification grand public (connexion / inscription email + mot
 * de passe). Contrairement au LoginForm de l'admin, on ne redirige pas vers
 * /admin : l'utilisateur reste sur la page publique où il se trouvait.
 */
export const AuthDialog = ({ open, onOpenChange }: AuthDialogProps) => {
  const { toast } = useToast();
  const { promptPushIfEligible } = usePushPrompt();
  const { startOnboarding } = useOnboarding();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Affiché après une inscription nécessitant une confirmation par email.
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  const reset = () => {
    setPassword("");
    setIsLoading(false);
    setPendingConfirmation(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);
    if (error) {
      toast({
        title: "Échec de connexion",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Connexion réussie", description: "Bon retour !" });
    reset();
    onOpenChange(false);
    // Proposer d'activer les notifications sur CE navigateur (l'abonnement push
    // est local à chaque appareil/navigateur). Léger délai pour laisser la
    // modale d'auth se fermer avant d'ouvrir celle du push.
    setTimeout(() => promptPushIfEligible(), 250);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl("/") },
    });
    setIsLoading(false);
    if (error) {
      toast({
        title: "Échec de l'inscription",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    // Si la confirmation par email est activée, aucune session n'est créée.
    if (!data.session) {
      setPendingConfirmation(true);
      return;
    }
    toast({ title: "Compte créé", description: "Bienvenue sur Éphéméride !" });
    reset();
    onOpenChange(false);
    // Lance le parcours d'onboarding (le wizard gère lui-même la permission push).
    setTimeout(() => startOnboarding(), 250);
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast({
        title: "Email requis",
        description: "Saisissez votre adresse email pour recevoir un lien.",
        variant: "destructive",
      });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl("/reset-password"),
    });
    toast(
      error
        ? { title: "Erreur", description: error.message, variant: "destructive" }
        : {
            title: "Email envoyé",
            description: "Un lien de réinitialisation vous a été envoyé.",
          },
    );
  };

  const loginForm = (
    <form onSubmit={handleLogin} className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label htmlFor="auth-login-email">Email</Label>
        <Input
          id="auth-login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="auth-login-password">Mot de passe</Label>
          <button
            type="button"
            onClick={handleResetPassword}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Mot de passe oublié ?
          </button>
        </div>
        <Input
          id="auth-login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Connexion..." : "Se connecter"}
      </Button>
    </form>
  );

  const signupForm = (
    <form onSubmit={handleSignup} className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label htmlFor="auth-signup-email">Email</Label>
        <Input
          id="auth-signup-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="auth-signup-password">Mot de passe</Label>
        <Input
          id="auth-signup-password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">6 caractères minimum.</p>
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Création..." : "Créer mon compte"}
      </Button>
    </form>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        {pendingConfirmation ? (
          <>
            <DialogHeader>
              <DialogTitle>Confirmez votre email</DialogTitle>
              <DialogDescription>
                Un lien de confirmation a été envoyé à <strong>{email}</strong>.
                Cliquez dessus pour activer votre compte, puis connectez-vous.
              </DialogDescription>
            </DialogHeader>
            <Button
              className="w-full"
              onClick={() => {
                setPendingConfirmation(false);
                setTab("login");
              }}
            >
              J'ai confirmé, me connecter
            </Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{SIGNUP_ENABLED ? "Votre compte Éphéméride" : "Connexion"}</DialogTitle>
              <DialogDescription>
                {SIGNUP_ENABLED
                  ? "Créez un compte pour mettre des événements en favori et être prévenu de leurs changements."
                  : "Connectez-vous pour retrouver vos favoris et être prévenu de leurs changements."}
              </DialogDescription>
            </DialogHeader>

            {SIGNUP_ENABLED ? (
              <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Connexion</TabsTrigger>
                  <TabsTrigger value="signup">Inscription</TabsTrigger>
                </TabsList>
                <TabsContent value="login">{loginForm}</TabsContent>
                <TabsContent value="signup">{signupForm}</TabsContent>
              </Tabs>
            ) : (
              loginForm
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
