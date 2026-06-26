"use client";

import { Bookmark, MapPin, Megaphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AvatarUploader } from "@/components/account/AvatarUploader";
import { useAuth } from "@/hooks/use-auth";
import { getFirstName } from "@/lib/user";

interface WelcomeDialogProps {
  open: boolean;
  onConfigure: () => void;
  onSkip: () => void;
}

/**
 * Dialog de bienvenue affichée juste après la création du compte. Propose de
 * configurer les alertes (→ wizard) ou de reporter. L'avatar est éditable au
 * survol.
 */
export const WelcomeDialog = ({ open, onConfigure, onSkip }: WelcomeDialogProps) => {
  const { user } = useAuth();
  const firstName = getFirstName(user);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onSkip()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mb-2 flex justify-center">
            <AvatarUploader size="h-20 w-20" textClassName="text-2xl" />
          </div>
          <DialogTitle className="text-2xl">
            Bienvenue{firstName ? `, ${firstName}` : ""} !
          </DialogTitle>
          <DialogDescription>
            Votre compte est créé. Configurez vos alertes en 3 étapes rapides — vous pourrez tout
            changer plus tard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Feature icon={<Bookmark className="h-5 w-5 text-accent-peach" />} label="Alertes sur vos favoris" />
          <Feature icon={<MapPin className="h-5 w-5 text-accent-violet" />} label="Flux des événements près de chez vous" />
          <Feature icon={<Megaphone className="h-5 w-5 text-emerald-500" />} label="Annonces de vos organisateurs" />
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={onConfigure}>Configurer mes alertes</Button>
          <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
            Plus tard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Feature = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="flex items-center gap-3 rounded-xl border border-border bg-card/50 p-3">
    <span className="shrink-0">{icon}</span>
    <span className="text-sm font-medium">{label}</span>
  </div>
);

export default WelcomeDialog;
