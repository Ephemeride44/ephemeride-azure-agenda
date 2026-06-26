"use client";

import { useDropzone } from "react-dropzone";
import { Camera, Loader2 } from "lucide-react";
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
}

/**
 * Avatar éditable : au survol, une pastille « appareil photo » invite à importer
 * une image (JPG/PNG, 2 Mo max). Réutilisé dans la dialog de bienvenue et la page
 * Compte. Upload immédiat via `useAvatarUpload`.
 */
export const AvatarUploader = ({ size = "h-20 w-20", textClassName = "text-xl", onChange }: AvatarUploaderProps) => {
  const { user } = useAuth();
  const { uploadFile, isUploading } = useAvatarUpload(onChange);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (files) => {
      if (files[0]) void uploadFile(files[0]);
    },
    accept: { "image/*": [] },
    multiple: false,
    disabled: isUploading,
    noKeyboard: false,
  });

  const name = getDisplayName(user);
  const src = getAvatarUrl(user);

  return (
    <div
      {...getRootProps()}
      className="group relative cursor-pointer rounded-full"
      title="Changer la photo"
    >
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
};

export default AvatarUploader;
