"use client";

import { useState } from "react";
import Link from "next/link";
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
import { useToast } from "@/hooks/use-toast";
import { usePushPrompt } from "@/components/account/PushPromptProvider";
import { supabase as baseSupabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

// Cast pour ignorer le typage strict de Supabase (aligné sur LoginForm).
const supabase = baseSupabase as unknown as SupabaseClient;

// Redirection dans le contexte courant (local / distant), comme le LoginForm.
const redirectUrl = (path: string) => `${window.location.origin}${path}`;

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modale de connexion rapide « en contexte » (clic sur un favori, un abonnement…).
 * La création de compte se fait sur la page dédiée /inscription. On ne redirige
 * pas : l'utilisateur reste sur la page publique où il se trouvait.
 */
export const AuthDialog = ({ open, onOpenChange }: AuthDialogProps) => {
  const { toast } = useToast();
  const { promptPushIfEligible } = usePushPrompt();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const reset = () => {
    setPassword("");
    setIsLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);
    if (error) {
      toast({ title: "Échec de connexion", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Connexion réussie", description: "Bon retour !" });
    reset();
    onOpenChange(false);
    // Proposer d'activer les notifications sur CE navigateur (abonnement local).
    setTimeout(() => promptPushIfEligible(), 250);
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast({ title: "Email requis", description: "Saisissez votre adresse email pour recevoir un lien.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl("/reset-password"),
    });
    toast(
      error
        ? { title: "Erreur", description: error.message, variant: "destructive" }
        : { title: "Email envoyé", description: "Un lien de réinitialisation vous a été envoyé." },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connexion</DialogTitle>
          <DialogDescription>
            Connectez-vous pour retrouver vos favoris et être prévenu de leurs changements.
          </DialogDescription>
        </DialogHeader>

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

        <p className="text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link
            href="/inscription"
            onClick={() => onOpenChange(false)}
            className="font-semibold text-foreground hover:underline"
          >
            Créer un compte
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
