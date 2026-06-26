import { createParser } from "nuqs";

// Mode de vue (liste / calendrier) porté par l'URL via le paramètre `?v`.
// `?v=cal` → calendrier ; absent (ou autre) → liste. Partagé entre l'agenda et
// la page organisateur pour conserver le mode sélectionné. clearOnDefault (par
// défaut dans nuqs v2) retire `?v` quand on revient à la vue liste.
export const viewParser = createParser({
  parse: (q) => (q === "cal" ? "calendar" : "list"),
  serialize: (v) => (v === "calendar" ? "cal" : "list"),
}).withDefault("list");
