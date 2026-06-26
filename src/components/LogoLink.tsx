"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface LogoLinkProps {
  src: string;
  alt?: string;
  className?: string;
}

/**
 * Logo cliquable : ramène à l'accueil, ou remonte en haut de page (scroll
 * fluide) si l'on est déjà sur l'accueil.
 */
export const LogoLink = ({ src, alt = "Éphéméride", className }: LogoLinkProps) => {
  const pathname = usePathname();

  const handleClick = (e: React.MouseEvent) => {
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <Link href="/" onClick={handleClick} aria-label="Retour à l'accueil" className="inline-flex">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className={className} />
    </Link>
  );
};

export default LogoLink;
