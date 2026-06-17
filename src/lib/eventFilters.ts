/**
 * Système de filtres générique et extensible pour la liste d'événements.
 *
 * Les filtres sont appliqués **côté serveur** (sur la requête Supabase) et leur
 * état est porté par l'**URL** (query params), afin d'être partageables et
 * compatibles avec la navigation arrière/avant.
 *
 * Pour ajouter un nouveau filtre (ville, public, prix, etc.), il suffit
 * d'ajouter une `FilterDefinition` dans `eventFilterDefinitions` : l'UI
 * (EventFilters), la lecture/écriture dans l'URL, le chargement des options et
 * l'application sur la requête s'adaptent automatiquement.
 */

/** Valeur sentinelle représentant « aucun filtre » (tout afficher). */
export const ALL_VALUE = "__all__";

/** État des filtres : une valeur sélectionnée par clé de filtre. */
export type FilterValues = Record<string, string>;

export interface FilterDefinition {
  /** Clé unique du filtre (utilisée dans l'état ET comme nom de query param). */
  key: string;
  /** Colonne de la table `events` sur laquelle filtrer / lister les options. */
  column: string;
  /** Libellé affiché au-dessus du contrôle. */
  label: string;
  /** Libellé de l'option « tout » (ex : « Tous les départements »). */
  allLabel: string;
  /** Met en forme l'affichage d'une option (par défaut : la valeur brute). */
  formatOption?: (value: string) => string;
  /** Ordonne les options (par défaut : ordre alphanumérique français). */
  compareOptions?: (a: string, b: string) => number;
}

/** Noms des départements les plus fréquents (pour un affichage plus lisible). */
const DEPARTMENT_NAMES: Record<string, string> = {
  "44": "Loire-Atlantique",
  "49": "Maine-et-Loire",
  "85": "Vendée",
  "79": "Deux-Sèvres",
  "35": "Ille-et-Vilaine",
  "56": "Morbihan",
  "53": "Mayenne",
  "72": "Sarthe",
};

/** Liste des filtres disponibles. Ajouter un filtre = ajouter une entrée ici. */
export const eventFilterDefinitions: FilterDefinition[] = [
  {
    key: "department",
    column: "location_department",
    label: "Département",
    allLabel: "Tous les départements",
    formatOption: (value) =>
      DEPARTMENT_NAMES[value] ? `${value} — ${DEPARTMENT_NAMES[value]}` : value,
    compareOptions: (a, b) => a.localeCompare(b, "fr", { numeric: true }),
  },
];

/** Tri par défaut des options d'un filtre. */
export const sortFilterOptions = (
  definition: FilterDefinition,
  options: string[],
): string[] => {
  const compare =
    definition.compareOptions ?? ((a, b) => a.localeCompare(b, "fr"));
  return [...options].sort(compare);
};

/** Lit les valeurs de filtre depuis les query params de l'URL. */
export const readFilterValues = (
  params: URLSearchParams,
  definitions: FilterDefinition[] = eventFilterDefinitions,
): FilterValues =>
  definitions.reduce<FilterValues>((acc, def) => {
    acc[def.key] = params.get(def.key) ?? ALL_VALUE;
    return acc;
  }, {});

/**
 * Reporte les valeurs de filtre dans un objet de query params.
 * Les filtres inactifs (« tout ») sont retirés de l'URL pour la garder propre.
 */
export const writeFilterParams = (
  values: FilterValues,
  definitions: FilterDefinition[] = eventFilterDefinitions,
): Record<string, string> =>
  definitions.reduce<Record<string, string>>((acc, def) => {
    const value = values[def.key];
    if (value && value !== ALL_VALUE) {
      acc[def.key] = value;
    }
    return acc;
  }, {});

/**
 * Applique les filtres actifs à une requête Supabase (PostgrestFilterBuilder).
 * Typé de façon générique pour rester agnostique du type exact de la requête.
 */
export const applyFiltersToQuery = <T extends { eq: (column: string, value: string) => T }>(
  query: T,
  values: FilterValues,
  definitions: FilterDefinition[] = eventFilterDefinitions,
): T =>
  definitions.reduce((q, def) => {
    const selected = values[def.key];
    if (selected && selected !== ALL_VALUE) {
      return q.eq(def.column, selected);
    }
    return q;
  }, query);

/** Indique si au moins un filtre est actif (différent de « tout »). */
export const hasActiveFilters = (values: FilterValues): boolean =>
  Object.values(values).some((v) => v && v !== ALL_VALUE);
