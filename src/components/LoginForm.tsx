import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase as baseSupabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from '@supabase/supabase-js';

// HACK : cast temporaire pour ignorer le typage strict de Supabase
const supabase: SupabaseClient = baseSupabase;

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<'classic' | 'magic'>('classic');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (mode === 'classic') {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!error) {
      toast({
        title: "Connexion réussie",
        description: "Bienvenue dans l'interface d'administration",
      });
      navigate("/admin/dashboard");
    } else {
      toast({
        title: "Échec de connexion",
          description: error.message,
        variant: "destructive",
      });
    }
    } else if (mode === 'magic') {
      const { error } = await supabase.auth.signInWithOtp({
        email,
      });
      if (!error) {
        toast({
          title: "Lien envoyé",
          description: "Vérifiez votre boîte mail pour vous connecter.",
        });
      } else {
        toast({
          title: "Erreur lors de l'envoi du lien",
          description: error.message,
          variant: "destructive",
        });
      }
    }
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir votre adresse email",
        variant: "destructive",
      });
      return;
    }

    setIsResettingPassword(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Email envoyé",
        description: "Un lien de réinitialisation a été envoyé à votre adresse email. Vérifiez votre boîte de réception.",
      });
      
      setShowResetPassword(false);
      setEmail('');
    } catch (error: any) {
      console.error('Erreur lors de la réinitialisation:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer l'email de réinitialisation",
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <Card className="w-full max-w-md bg-ephemeride-light border-none text-ephemeride-foreground shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Administration</CardTitle>
        <CardDescription className="text-white/70">
          Connectez-vous pour gérer les événements
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!showResetPassword ? (
          <>
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant={mode === 'classic' ? 'default' : 'outline'}
                className={mode === 'classic' ? 'bg-white text-ephemeride' : ''}
                onClick={() => setMode('classic')}
              >
                Email + mot de passe
              </Button>
              <Button
                type="button"
                variant={mode === 'magic' ? 'default' : 'outline'}
                className={mode === 'magic' ? 'bg-white text-ephemeride' : ''}
                onClick={() => setMode('magic')}
              >
                Magic link
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-white/20 bg-white/10 text-white"
                />
              </div>
              {mode === 'classic' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Mot de passe</Label>
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(true)}
                      className="text-xs text-white/70 hover:text-white underline"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border-white/20 bg-white/10 text-white"
                  />
                </div>
              )}
              <Button 
                className="w-full bg-white text-ephemeride hover:bg-white/80 mt-4"
                type="submit"
                disabled={isLoading}
              >
                {isLoading
                  ? (mode === 'classic' ? 'Connexion...' : 'Envoi du lien...')
                  : (mode === 'classic' ? 'Se connecter' : 'Recevoir un magic link')}
              </Button>
            </form>
          </>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Entrez votre adresse email"
                required
                className="border-white/20 bg-white/10 text-white"
              />
              <p className="text-xs text-white/70">
                Nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-white/20 bg-white/10 text-white hover:bg-white/20"
                onClick={() => {
                  setShowResetPassword(false);
                  setEmail('');
                }}
                disabled={isResettingPassword}
              >
                Annuler
              </Button>
              <Button 
                type="submit"
                className="flex-1 bg-white text-ephemeride hover:bg-white/80"
                disabled={isResettingPassword}
              >
                {isResettingPassword ? 'Envoi...' : 'Envoyer le lien'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default LoginForm;
