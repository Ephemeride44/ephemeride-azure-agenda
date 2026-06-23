import { useQuery } from "@tanstack/react-query";
import { Heart, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { fetchTipeeeSettings, type TipeeeSettings } from "@/lib/siteSettings";
import { useTheme } from "@/components/ThemeProvider";
import tipeeeLogo from "@/components/ui/Tipeee_logo.svg";

/** Clé localStorage mémorisant que le visiteur a masqué le bandeau. */
const DISMISS_KEY = "tipeee-banner-dismissed";

/** Couleur de marque Tipeee (reprise du logo). */
const TIPEEE_RED = "#d8485a";

/** Pastille rouge de marque, partagée par le CTA, le bouton header et le clone animé. */
const PILL_CLASSES =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-[#d8485a] px-4 py-1.5 text-sm font-semibold text-white shadow-sm whitespace-nowrap transition-colors hover:bg-[#c23d4e] focus:outline-none focus:ring-2 focus:ring-[#d8485a]/60";

const PILL_CONTENT = (
  <>
    {/* Logo Tipeee en blanc (brightness-0 + invert) pour ressortir sur la pastille rouge.
        Dimensions explicites (ratio 888×335 ≈ 2,65) : la pastille a une taille déterministe
        dès le rendu, sans dépendre du chargement de l'image — l'animation FLIP mesure juste. */}
    <img src={tipeeeLogo} alt="" aria-hidden width={42} height={16} className="brightness-0 invert" />
    Soutenez-nous
  </>
);

/**
 * Cycle de vie de l'affichage Tipeee :
 *  - "banner"  : bandeau pleine largeur en haut de page
 *  - "flying"  : transition (clone animé du bandeau vers le bouton du header)
 *  - "button"  : bouton compact dans le header
 */
type Phase = "banner" | "flying" | "button";

interface TipeeeContextValue {
  settings: TipeeeSettings | undefined;
  phase: Phase;
  /** Ouvre le widget Tipeee en modale (mode "embed"). */
  openEmbed: () => void;
  /** Replie le bandeau vers le header ; `rect` = position de départ du CTA. */
  requestClose: (rect: DOMRect) => void;
  /** Enregistre l'élément du bouton header pour calculer la cible de l'animation. */
  registerButton: (el: HTMLElement | null) => void;
}

const TipeeeContext = createContext<TipeeeContextValue | null>(null);

const useTipeee = () => {
  const ctx = useContext(TipeeeContext);
  if (!ctx) throw new Error("Les composants Tipeee doivent être utilisés dans <TipeeeProvider>");
  return ctx;
};

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Fournit l'état de soutien Tipeee à la bannière et au bouton du header, et
 * orchestre l'animation FLIP qui donne l'illusion que la bannière se replie
 * dans le bouton compact du header une fois fermée.
 */
export const TipeeeProvider = ({ children }: { children: ReactNode }) => {
  const { data: settings } = useQuery({
    queryKey: ["site-settings", "tipeee"],
    queryFn: fetchTipeeeSettings,
    staleTime: 5 * 60 * 1000,
  });

  const [phase, setPhase] = useState<Phase>(() => (readDismissed() ? "button" : "banner"));
  const [embedOpen, setEmbedOpen] = useState(false);

  const startRectRef = useRef<DOMRect | null>(null);
  const buttonRef = useRef<HTMLElement | null>(null);
  const cloneRef = useRef<HTMLDivElement | null>(null);
  const finishedRef = useRef(false);

  const registerButton = useCallback((el: HTMLElement | null) => {
    buttonRef.current = el;
  }, []);

  const openEmbed = useCallback(() => setEmbedOpen(true), []);

  const requestClose = useCallback((rect: DOMRect) => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* stockage indisponible : on masque pour la session uniquement */
    }
    // Si aucun bouton header n'est monté (animation désactivée côté page), on
    // masque simplement le bandeau, sans jouer l'animation ni afficher la pastille.
    if (!buttonRef.current) {
      finishedRef.current = true;
      setPhase("button");
      return;
    }
    startRectRef.current = rect;
    finishedRef.current = false;
    setPhase("flying");
  }, []);

  const finishFlight = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    startRectRef.current = null;
    setPhase("button");
  }, []);

  // Animation FLIP : le clone part de la position du CTA de la bannière et
  // glisse/se réduit jusqu'à la position finale du bouton du header.
  useLayoutEffect(() => {
    if (phase !== "flying") return;
    const start = startRectRef.current;
    const target = buttonRef.current;
    const clone = cloneRef.current;
    if (!start || !target || !clone) {
      finishFlight();
      return;
    }

    clone.style.left = `${start.left}px`;
    clone.style.top = `${start.top}px`;
    clone.style.transition = "none";
    clone.style.transform = "translate(0px, 0px) scale(1, 1)";

    const from = clone.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const dx = to.left - from.left;
    const dy = to.top - from.top;
    const sx = to.width / from.width;
    const sy = to.height / from.height;

    const raf = requestAnimationFrame(() => {
      clone.style.transition = "transform 500ms cubic-bezier(0.22, 1, 0.36, 1)";
      clone.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    });
    // Filet de sécurité si transitionend ne se déclenche pas.
    const fallback = window.setTimeout(finishFlight, 650);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(fallback);
    };
  }, [phase, finishFlight]);

  const value: TipeeeContextValue = { settings, phase, openEmbed, requestClose, registerButton };
  const enabled = Boolean(settings?.enabled && settings.url);

  return (
    <TipeeeContext.Provider value={value}>
      {children}

      {phase === "flying" && (
        <div
          ref={cloneRef}
          onTransitionEnd={(e) => {
            if (e.propertyName === "transform") finishFlight();
          }}
          className="fixed z-[60] inline-flex items-center justify-center gap-1.5 rounded-full bg-[#d8485a] px-4 py-1.5 text-sm font-semibold text-white shadow-md whitespace-nowrap pointer-events-none"
          style={{ left: 0, top: 0, transformOrigin: "top left", willChange: "transform" }}
        >
          {PILL_CONTENT}
        </div>
      )}

      {enabled && embedOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setEmbedOpen(false)}
        >
          <div
            className="relative w-[380px] max-w-[95vw] h-[520px] max-h-[80vh] overflow-hidden rounded-lg border border-black/10 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setEmbedOpen(false)}
              aria-label="Fermer le soutien Tipeee"
              className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
            >
              <X size={16} />
            </button>
            <iframe
              src={settings!.url}
              title="Soutenir sur Tipeee"
              className="h-full w-full border-0"
              loading="lazy"
            />
          </div>
        </div>
      )}
    </TipeeeContext.Provider>
  );
};

/** Bandeau de soutien pleine largeur, affiché tout en haut tant qu'il n'est pas masqué. */
export const TipeeeBanner = () => {
  const { theme } = useTheme();
  const { settings, phase, openEmbed, requestClose } = useTipeee();
  const ctaRef = useRef<HTMLElement | null>(null);

  if (!settings?.enabled || !settings.url) return null;
  if (phase !== "banner") return null;

  const bannerClasses =
    theme === "light"
      ? "bg-[#fff1f2] border-[#f5c9ce] text-[#1B263B]"
      : "bg-[#d8485a]/10 border-[#d8485a]/30 text-[#faf3ec]";

  const handleClose = () => {
    const rect = ctaRef.current?.getBoundingClientRect();
    if (rect) requestClose(rect);
  };

  const cta =
    settings.mode === "embed" ? (
      <button
        ref={(el) => (ctaRef.current = el)}
        type="button"
        onClick={openEmbed}
        className={`shrink-0 ${PILL_CLASSES}`}
      >
        {PILL_CONTENT}
      </button>
    ) : (
      <a
        ref={(el) => (ctaRef.current = el)}
        href={settings.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`shrink-0 ${PILL_CLASSES}`}
      >
        {PILL_CONTENT}
      </a>
    );

  return (
    <div
      className={`relative w-full border-b ${bannerClasses} animate-in fade-in slide-in-from-top-2 duration-300`}
    >
      <div className="max-w-4xl mx-auto px-4 md:px-12 py-2.5 flex flex-col sm:flex-row items-center justify-center gap-x-4 gap-y-2">
        <div className="flex items-center flex-wrap justify-center gap-x-2 gap-y-1 text-center sm:text-left">
          <Heart size={18} style={{ color: TIPEEE_RED }} className="fill-current shrink-0" />
          <span className="text-sm font-medium">
            Soutenez Éphéméride, l'agenda culturel et citoyen du Vignoble nantais, sur
          </span>
          <img src={tipeeeLogo} alt="Tipeee" className="h-5 w-auto" />
        </div>
        {cta}
      </div>
      <button
        type="button"
        onClick={handleClose}
        aria-label="Masquer le bandeau de soutien"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 opacity-60 transition-opacity hover:opacity-100"
      >
        <X size={16} />
      </button>
    </div>
  );
};

/**
 * Bouton compact de soutien affiché dans le header (au-dessus de « Proposer un
 * événement ») une fois le bandeau replié. Invisible pendant l'animation : c'est
 * le clone qui occupe l'écran jusqu'à atterrir précisément à sa place.
 */
export const TipeeeHeaderButton = () => {
  const { settings, phase, openEmbed, registerButton } = useTipeee();

  if (!settings?.enabled || !settings.url) return null;
  if (phase === "banner") return null;

  // Invisible pendant le vol (le clone occupe l'écran), opaque instantanément à
  // l'atterrissage : pas de fondu, donc pas de clignotement à la fin de l'animation.
  const style = { opacity: phase === "flying" ? 0 : 1 } as const;

  if (settings.mode === "embed") {
    return (
      <button
        ref={registerButton}
        type="button"
        onClick={openEmbed}
        aria-label="Soutenez-nous sur Tipeee"
        className={PILL_CLASSES}
        style={style}
      >
        {PILL_CONTENT}
      </button>
    );
  }

  return (
    <a
      ref={registerButton}
      href={settings.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Soutenez-nous sur Tipeee"
      className={PILL_CLASSES}
      style={style}
    >
      {PILL_CONTENT}
    </a>
  );
};

/**
 * Logo Tipeee brut affiché dans le footer, uniquement si une URL est configurée.
 * Lien vers la page Tipeee dans un nouvel onglet. Rouge tel quel en mode clair,
 * passé en blanc (brightness-0 + invert) en mode sombre.
 */
export const TipeeeFooterLogo = () => {
  const { theme } = useTheme();
  const { settings } = useTipeee();

  if (!settings?.url) return null;

  return (
    <a
      href={settings.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Soutenez-nous sur Tipeee"
      className="mt-4 inline-block"
    >
      <img
        src={tipeeeLogo}
        alt="Tipeee"
        width={96}
        height={36}
        className={`mx-auto opacity-80 transition-opacity hover:opacity-100 ${theme === "light" ? "" : "brightness-0 invert"}`}
      />
    </a>
  );
};
