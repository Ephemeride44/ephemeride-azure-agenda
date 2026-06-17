import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/components/ThemeProvider";
import {
  ALL_VALUE,
  eventFilterDefinitions,
  hasActiveFilters,
  type FilterDefinition,
  type FilterValues,
} from "@/lib/eventFilters";
import { X } from "lucide-react";

interface EventFiltersProps {
  /** Options disponibles par filtre (clé de filtre → valeurs), chargées en amont. */
  options: Record<string, string[]>;
  /** Valeurs de filtre courantes. */
  values: FilterValues;
  /** Appelé à chaque modification d'un filtre. */
  onChange: (values: FilterValues) => void;
  /** Réinitialise tous les filtres. */
  onReset: () => void;
  /** Liste des filtres à afficher (par défaut : tous les filtres connus). */
  definitions?: FilterDefinition[];
}

const EventFilters = ({
  options,
  values,
  onChange,
  onReset,
  definitions = eventFilterDefinitions,
}: EventFiltersProps) => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  // On ne propose un filtre que s'il existe au moins deux valeurs distinctes :
  // filtrer sur une unique valeur n'aurait aucun intérêt.
  const filters = definitions
    .map((definition) => ({
      definition,
      values: options[definition.key] ?? [],
    }))
    .filter(({ values: opts }) => opts.length >= 2);

  if (filters.length === 0) return null;

  const triggerClass = isLight
    ? "border-[#f3e0c7] bg-white text-[#1B263B]"
    : "border-white/20 bg-white/10 text-[#faf3ec]";
  const labelClass = isLight ? "text-[#1B263B]" : "text-[#faf3ec]";

  return (
    <div className="mb-10 flex flex-wrap items-end gap-4">
      {filters.map(({ definition, values: opts }) => (
        <div key={definition.key} className="flex flex-col gap-1">
          <span className={`text-sm font-medium ${labelClass}`}>
            {definition.label}
          </span>
          <Select
            value={values[definition.key] ?? ALL_VALUE}
            onValueChange={(value) =>
              onChange({ ...values, [definition.key]: value })
            }
          >
            <SelectTrigger className={`w-[240px] ${triggerClass}`}>
              <SelectValue placeholder={definition.allLabel} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>{definition.allLabel}</SelectItem>
              {opts.map((option) => (
                <SelectItem key={option} value={option}>
                  {definition.formatOption
                    ? definition.formatOption(option)
                    : option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}

      {hasActiveFilters(values) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className={`gap-1 ${labelClass}`}
        >
          <X className="h-4 w-4" />
          Réinitialiser
        </Button>
      )}
    </div>
  );
};

export default EventFilters;
