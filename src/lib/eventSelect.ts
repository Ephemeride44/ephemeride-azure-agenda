// SELECT partagé pour charger un événement avec ses relations d'affichage
// (thème, récurrence, organisation). Centralisé pour que la mention de
// l'organisateur soit disponible partout où une EventCard est rendue.
// Typé `string` (et non littéral) volontairement : la jointure organisation
// référence des colonnes pas encore présentes dans types.ts tant que les types
// Supabase ne sont pas régénérés. Un type littéral ferait échouer le parsing
// typé de `.select()`. Les résultats sont de toute façon castés à l'usage.
export const EVENT_SELECT: string =
  "*, theme:theme_id(*), recurrence:recurrence_id(*), organization:organization_id(id, name, location_city, location_department, logo_url)";

export interface EventOrganization {
  id: string;
  name: string;
  location_city: string | null;
  location_department: string | null;
  logo_url: string | null;
}
