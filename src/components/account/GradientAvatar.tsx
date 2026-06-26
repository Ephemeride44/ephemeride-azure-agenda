"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/user";

interface GradientAvatarProps {
  name: string;
  src?: string | null;
  className?: string;
  /** Taille du texte des initiales (ex: "text-lg"). */
  textClassName?: string;
}

/**
 * Avatar avec photo si disponible, sinon initiales sur un dégradé pêche → violet
 * (identité visuelle « Constellation »). Réutilisé pour les utilisateurs et les
 * organisateurs.
 */
export const GradientAvatar = ({ name, src, className, textClassName }: GradientAvatarProps) => {
  return (
    <Avatar className={cn("h-10 w-10", className)}>
      {src ? <AvatarImage src={src} alt={name} className="object-cover" /> : null}
      <AvatarFallback
        className={cn(
          "bg-gradient-to-br from-accent-peach to-accent-violet font-semibold text-white",
          textClassName,
        )}
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
};

export default GradientAvatar;
