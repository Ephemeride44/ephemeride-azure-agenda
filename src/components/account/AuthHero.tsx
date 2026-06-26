import { Check } from "lucide-react";
import { LogoLink } from "@/components/LogoLink";

interface AuthHeroProps {
  title: string;
  subtitle: string;
  benefits: string[];
}

/**
 * Panneau de marque (colonne gauche) des pages d'authentification pleines
 * (/inscription, /connexion). Fond sombre, logo, accroche et bénéfices.
 * Masqué sous le breakpoint lg (sur mobile, seul le formulaire est affiché).
 */
export const AuthHero = ({ title, subtitle, benefits }: AuthHeroProps) => (
  <div className="relative hidden flex-col justify-between overflow-hidden bg-ephemeride p-10 text-ephemeride-foreground lg:flex">
    {/* Dégradé d'ambiance */}
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-violet/20 via-transparent to-accent-peach/20" />

    <div className="relative">
      <LogoLink src="/images/ephemeride-logo-dark.png" className="h-20 w-auto object-contain" />
    </div>

    <div className="relative space-y-6">
      <h2 className="font-display text-4xl font-extrabold leading-tight">{title}</h2>
      <p className="max-w-sm text-sm text-ephemeride-foreground/70">{subtitle}</p>
      <ul className="space-y-3">
        {benefits.map((b) => (
          <li key={b} className="flex items-center gap-3 text-sm">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <Check className="h-3 w-3" />
            </span>
            {b}
          </li>
        ))}
      </ul>
    </div>

    <div className="relative" />
  </div>
);

export default AuthHero;
