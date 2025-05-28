import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase as baseSupabase } from "@/integrations/supabase/client";

// HACK : cast temporaire pour ignorer le typage strict de Supabase
const supabase: any = baseSupabase;

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<'classic' | 'magic'>('classic');
  const [isLoading, setIsLoading] = useState(false);
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

  return (
    <Card className="w-full max-w-md bg-ephemeride-light border-none text-ephemeride-foreground shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Administration</CardTitle>
        <CardDescription className="text-white/70">
          Connectez-vous pour gérer les événements
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            <Label htmlFor="password">Mot de passe</Label>
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
      </CardContent>
    </Card>
  );
};

export default LoginForm;
