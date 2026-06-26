"use client";

import { useDropzone } from "react-dropzone";
import { Camera, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GradientAvatar } from "@/components/account/GradientAvatar";
import { useAvatarUpload } from "@/hooks/use-avatar-upload";
import { useAuth } from "@/hooks/use-auth";
import { getAvatarUrl, getDisplayName } from "@/lib/user";
import { cn } from "@/lib/utils";

interface AvatarUploaderProps {
  /** Taille de l'avatar (classe Tailwind), ex: "h-20 w-20". */
  size?: string;
  textClassName?: string;
  onChange?: () => void;
  /** Affiche des boutons « Importer / Retirer » (recommandé sur mobile, où le
   *  survol n'existe pas). Par défaut, seul le survol révèle l'action. */
  withActions?: boolean;
}

/**
 * Avatar éditable. Au survol, une pastille « appareil photo » invite à importer
 * une image (JPG/PNG, 2 Mo max). Avec `withActions`, des boutons explicites sont
 * ajoutés pour fonctionner au doigt. Upload immédiat via `useAvatarUpload`.
 */
export const AvatarUploader = ({
  size = "h-20 w-20",
  textClassName = "text-xl",
  onChange,
  withActions = false,
}: AvatarUploaderProps) => {
  const { user } = useAuth();
  const { uploadFile, removeAvatar, isUploading } = useAvatarUpload(onChange);

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop: (files) => {
      if (files[0]) void uploadFile(files[0]);
    },
    accept: { "image/*": [] },
    multiple: false,
    disabled: isUploading,
  });

  const name = getDisplayName(user);
  const src = getAvatarUrl(user);

  const avatar = (
    <div {...getRootProps()} className="group relative shrink-0 cursor-pointer rounded-full" title="Changer la photo">
      <input {...getInputProps()} aria-label="Importer une photo de profil" />
      <GradientAvatar name={name} src={src} className={size} textClassName={textClassName} />
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition-opacity",
          "group-hover:opacity-100 group-focus-within:opacity-100",
          isUploading && "opacity-100",
        )}
      >
        {isUploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        ) : (
          <Camera className="h-5 w-5 text-white" />
        )}
      </div>
    </div>
  );

  if (!withActions) return avatar;

  return (
    <div className="flex items-center gap-4">
      {avatar}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={open} disabled={isUploading}>
          <Upload className="mr-1.5 h-4 w-4" />
          {isUploading ? "Envoi…" : "Importer"}
        </Button>
        {src && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void removeAvatar()}
            disabled={isUploading}
            className="text-destructive hover:text-destructive"
          >
            <X className="mr-1.5 h-4 w-4" />
            Retirer
          </Button>
        )}
      </div>
    </div>
  );
};

export default AvatarUploader;
