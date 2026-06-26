"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AuthDialog } from "./AuthDialog";

interface AuthDialogContextValue {
  open: boolean;
  openAuthDialog: () => void;
  closeAuthDialog: () => void;
}

const AuthDialogContext = createContext<AuthDialogContextValue | undefined>(undefined);

/**
 * Rend la modale d'authentification disponible globalement : n'importe quel
 * composant (ex: le bouton favori d'une carte) peut l'ouvrir via
 * useAuthDialog() quand l'utilisateur n'est pas connecté.
 */
export const AuthDialogProvider = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const openAuthDialog = useCallback(() => setOpen(true), []);
  const closeAuthDialog = useCallback(() => setOpen(false), []);

  return (
    <AuthDialogContext.Provider value={{ open, openAuthDialog, closeAuthDialog }}>
      {children}
      <AuthDialog open={open} onOpenChange={setOpen} />
    </AuthDialogContext.Provider>
  );
};

export const useAuthDialog = (): AuthDialogContextValue => {
  const ctx = useContext(AuthDialogContext);
  // Fallback sans-op si le provider n'est pas monté (sécurité, ne casse rien).
  if (!ctx) {
    return { open: false, openAuthDialog: () => {}, closeAuthDialog: () => {} };
  }
  return ctx;
};
