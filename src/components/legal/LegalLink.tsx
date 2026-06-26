"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LegalLinkProps {
  label: string;
  title: string;
  children: React.ReactNode;
}

/**
 * Lien inline (style texte) ouvrant le contenu légal dans une dialog, pour ne
 * pas quitter la page d'inscription. `stopPropagation` empêche le clic de cocher
 * la case quand le lien est imbriqué dans un `<label>`.
 */
export const LegalLink = ({ label, title, children }: LegalLinkProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="text-accent-peach hover:underline"
      >
        {label}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2">{children}</div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LegalLink;
