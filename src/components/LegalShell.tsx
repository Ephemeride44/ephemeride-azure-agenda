import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Mise en page commune des pages légales (conditions, confidentialité). */
export function LegalShell({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen dark:bg-ephemeride light:bg-[#faf3ec]">
      <header className="px-4 py-4 md:px-8">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100">
            <ArrowLeft className="h-4 w-4" />
            Retour à l'agenda
          </Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 md:px-8 md:py-10">
        <article className="mx-auto max-w-3xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            {lastUpdated && (
              <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : {lastUpdated}</p>
            )}
          </div>
          {children}
        </article>
      </main>
    </div>
  );
}

/** Section titrée d'une page légale. */
export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default LegalShell;
