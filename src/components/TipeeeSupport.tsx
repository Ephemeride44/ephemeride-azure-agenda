import { useQuery } from "@tanstack/react-query";
import { HandHeart, X } from "lucide-react";
import { useState } from "react";
import { fetchTipeeeSettings } from "@/lib/siteSettings";
import { useTheme } from "@/components/ThemeProvider";

/**
 * Widget de soutien Tipeee affiché sur le front lorsque l'option est activée
 * dans l'administration. Deux rendus possibles selon la configuration :
 *  - "button" : bouton flottant maison qui ouvre la page Tipeee dans un onglet
 *  - "embed"  : widget embarqué dans une iframe, dépliable depuis un bouton flottant
 */
const TipeeeSupport = () => {
  const { theme } = useTheme();
  const [embedOpen, setEmbedOpen] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["site-settings", "tipeee"],
    queryFn: fetchTipeeeSettings,
    staleTime: 5 * 60 * 1000,
  });

  if (!settings?.enabled || !settings.url) return null;

  const buttonClasses =
    theme === "light"
      ? "bg-[#fff7e6] text-[#1B263B] border-[#f3e0c7] hover:bg-[#ffe2b0] shadow-md"
      : "bg-white/10 text-[#faf3ec] border-white/20 hover:bg-white/20 shadow-md";

  if (settings.mode === "embed") {
    return (
      <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start gap-2">
        {embedOpen && (
          <div className="relative w-[340px] max-w-[90vw] h-[480px] max-h-[70vh] rounded-lg overflow-hidden shadow-2xl border border-black/10 bg-white">
            <button
              type="button"
              onClick={() => setEmbedOpen(false)}
              aria-label="Fermer le soutien Tipeee"
              className="absolute top-2 right-2 z-10 rounded-full bg-black/60 text-white p-1 hover:bg-black/80"
            >
              <X size={16} />
            </button>
            <iframe
              src={settings.url}
              title="Soutenir sur Tipeee"
              className="w-full h-full border-0"
              loading="lazy"
            />
          </div>
        )}
        <button
          type="button"
          onClick={() => setEmbedOpen((v) => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border font-medium transition-colors ${buttonClasses}`}
        >
          <HandHeart size={18} className="fill-current" />
          Soutenez-nous sur Tipeee
        </button>
      </div>
    );
  }

  return (
    <a
      href={settings.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed bottom-6 left-6 z-40 flex items-center gap-2 px-4 py-2 rounded-full border font-medium transition-colors ${buttonClasses}`}
    >
      <HandHeart size={18} className="fill-current" />
      Soutenez-nous sur Tipeee
    </a>
  );
};

export default TipeeeSupport;
