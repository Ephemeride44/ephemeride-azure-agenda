import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";
import { ConditionsContent } from "@/components/legal/legal-content";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: "Conditions d'utilisation et mentions légales d'Éphéméride.",
  alternates: { canonical: "/conditions" },
};

export default function ConditionsPage() {
  return (
    <LegalShell title="Conditions d'utilisation" lastUpdated="juin 2026">
      <ConditionsContent />
    </LegalShell>
  );
}
