"use client";

import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";
import { useEffect, useState } from "react";

type Theme = "dark" | "light";

/**
 * Wrapper autour de next-themes pour gérer le thème côté SSR sans flash
 * (la classe `light`/`dark` est posée sur <html> avant le paint).
 * On conserve volontairement l'API historique { theme, toggleTheme } afin de
 * ne rien changer chez les consommateurs.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="theme"
    >
      {children}
    </NextThemesProvider>
  );
}

export const useTheme = (): { theme: Theme; toggleTheme: () => void } => {
  const { resolvedTheme, setTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avant le montage, on renvoie le thème par défaut de l'app ("light") pour
  // que le rendu serveur et le premier rendu client concordent (pas de mismatch).
  const theme: Theme = mounted && resolvedTheme === "dark" ? "dark" : "light";

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return { theme, toggleTheme };
};
