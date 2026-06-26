/**
 * WeekPicker — compact ISO-week selector for discipleship report backfill.
 *
 * - Lists recent ISO weeks (default: last 8 completed weeks).
 * - Blocks future weeks.
 * - Shows an amber warning when a week is already reported.
 * - Default value = justEndedWeek(now).
 * - All dates are Monday-anchored (ISO-8601, weekStartsOn: 1).
 */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { addDays, format, startOfISOWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';
import { getIsoWeek, type IsoWeekBounds } from '@/lib/iso-week';

interface WeekPickerProps {
  value: IsoWeekBounds;
  onChange: (week: IsoWeekBounds) => void;
  /** ISO week labels (e.g. "2026-W01") that already have a submitted report. */
  existingWeeks?: string[];
  /** How many past weeks to show in the list (default: 8). */
  weeksToShow?: number;
}

function buildWeekList(weeksToShow: number): IsoWeekBounds[] {
  // Start from the current ISO Monday and go back weeksToShow weeks.
  const today = new Date();
  const currentMonday = startOfISOWeek(today);
  const weeks: IsoWeekBounds[] = [];

  for (let i = 0; i < weeksToShow; i++) {
    const monday = addDays(currentMonday, -7 * i);
    const saturday = addDays(monday, 5);
    // Block future weeks: if monday > today's ISO monday we skip (shouldn't
    // happen with i >= 0, but defensive).
    if (monday > currentMonday) continue;
    weeks.push({ monday, saturday, isoWeek: getIsoWeek(monday) });
  }

  return weeks;
}

function weekLabel(bounds: IsoWeekBounds): string {
  return `Semana del ${format(bounds.monday, 'dd MMM', { locale: es })} al ${format(bounds.saturday, 'dd MMM', { locale: es })}`;
}

export function WeekPicker({
  value,
  onChange,
  existingWeeks = [],
  weeksToShow = 8,
}: WeekPickerProps) {
  const weeks = useMemo(() => buildWeekList(weeksToShow), [weeksToShow]);

  const isAlreadyReported = existingWeeks.includes(value.isoWeek);

  const handleChange = (isoWeek: string) => {
    const found = weeks.find(w => w.isoWeek === isoWeek);
    if (found) onChange(found);
  };

  return (
    <div className="space-y-1.5">
      <Select value={value.isoWeek} onValueChange={handleChange}>
        <SelectTrigger className="w-full sm:w-auto min-w-[220px]">
          <SelectValue placeholder="Seleccionar semana" />
        </SelectTrigger>
        <SelectContent>
          {weeks.map(week => (
            <SelectItem key={week.isoWeek} value={week.isoWeek}>
              <span>{weekLabel(week)}</span>
              {existingWeeks.includes(week.isoWeek) && (
                <span className="ml-2 text-xs text-amber-600 font-medium">(ya reportado)</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isAlreadyReported && (
        <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Ya existe un reporte para esta semana</span>
        </div>
      )}
    </div>
  );
}
