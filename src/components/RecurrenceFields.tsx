import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { RecurrenceRule } from "@/lib/recurrence";

// Jours dans l'ordre français (lundi → dimanche), mappés sur les valeurs JS getDay().
const WEEKDAYS: { label: string; value: number }[] = [
  { label: "L", value: 1 },
  { label: "M", value: 2 },
  { label: "M", value: 3 },
  { label: "J", value: 4 },
  { label: "V", value: 5 },
  { label: "S", value: 6 },
  { label: "D", value: 0 },
];

interface RecurrenceFieldsProps {
  value: RecurrenceRule;
  onChange: (value: RecurrenceRule) => void;
  theme?: "light" | "dark";
  errors?: { [key: string]: string };
}

const RecurrenceFields = ({
  value,
  onChange,
  theme = "dark",
  errors = {},
}: RecurrenceFieldsProps) => {
  const inputClass =
    theme === "light"
      ? "border-[#f3e0c7] bg-white text-[#1B263B]"
      : "border-white/20 bg-white/10 text-white";

  const update = (patch: Partial<RecurrenceRule>) => {
    onChange({ ...value, ...patch });
  };

  // Radix ToggleGroup (type="multiple") travaille avec des strings.
  const selectedStrings = value.weekdays.map(String);
  const handleWeekdaysChange = (next: string[]) => {
    update({ weekdays: next.map((s) => parseInt(s, 10)) });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="recurrence_start">Date de début *</Label>
          <Input
            id="recurrence_start"
            type="date"
            value={value.startDate || ""}
            onChange={(e) => update({ startDate: e.target.value })}
            className={`${inputClass} ${errors.startDate ? "border-red-500 focus:border-red-500" : ""}`}
          />
          {errors.startDate && <p className="text-red-500 text-sm">{errors.startDate}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="recurrence_end">Date de fin *</Label>
          <Input
            id="recurrence_end"
            type="date"
            value={value.endDate || ""}
            onChange={(e) => update({ endDate: e.target.value })}
            className={`${inputClass} ${errors.endDate ? "border-red-500 focus:border-red-500" : ""}`}
          />
          {errors.endDate && <p className="text-red-500 text-sm">{errors.endDate}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="recurrence_start_time">Heure de début *</Label>
          <Input
            id="recurrence_start_time"
            type="time"
            value={value.startTime || ""}
            onChange={(e) => update({ startTime: e.target.value })}
            className={`${inputClass} ${errors.startTime ? "border-red-500 focus:border-red-500" : ""}`}
          />
          {errors.startTime && <p className="text-red-500 text-sm">{errors.startTime}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="recurrence_end_time">Heure de fin (optionnel)</Label>
          <Input
            id="recurrence_end_time"
            type="time"
            value={value.endTime || ""}
            onChange={(e) => update({ endTime: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="recurrence_interval">Rythme *</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">Toutes les</span>
            <Input
              id="recurrence_interval"
              type="number"
              min={1}
              value={value.interval || 1}
              onChange={(e) => update({ interval: Math.max(1, parseInt(e.target.value, 10) || 1) })}
              className={`${inputClass} w-16`}
            />
            <span className="text-sm whitespace-nowrap">semaine(s)</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Jours de récurrence *</Label>
        <ToggleGroup
          type="multiple"
          value={selectedStrings}
          onValueChange={handleWeekdaysChange}
          className="justify-start flex-wrap"
        >
          {WEEKDAYS.map((day, index) => (
            <ToggleGroupItem
              key={`${day.value}-${index}`}
              value={String(day.value)}
              aria-label={`Jour ${day.label}`}
              className={
                theme === "light"
                  ? "h-10 w-10 border border-[#f3e0c7] data-[state=on]:bg-[#1B263B] data-[state=on]:text-white"
                  : "h-10 w-10 border border-white/20 text-white data-[state=on]:bg-white data-[state=on]:text-ephemeride"
              }
            >
              {day.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {errors.weekdays && <p className="text-red-500 text-sm">{errors.weekdays}</p>}
      </div>
    </div>
  );
};

export default RecurrenceFields;
