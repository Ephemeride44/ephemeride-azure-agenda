import { redirect } from "next/navigation";

// La page « Mes favoris » est désormais intégrée à la section Compte.
export default function MesFavorisPage() {
  redirect("/compte/favoris");
}
