import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";
import { ConfidentialiteContent } from "@/components/legal/legal-content";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Quelles données Éphéméride collecte, pourquoi, et vos droits.",
  alternates: { canonical: "/confidentialite" },
};

export default function ConfidentialitePage() {
  return (
    <LegalShell title="Politique de confidentialité" lastUpdated="juin 2026">
      <ConfidentialiteContent />
    </LegalShell>
  );
}
