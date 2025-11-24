import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Plus, Trash, Calendar, Clock } from 'lucide-react';
import type { AvailabilityJson } from '@booktractor/db/schemas';

const DAY_OPTIONS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
] as const;

export type DayKey = (typeof DAY_OPTIONS)[number]['key'];

export type DayScheduleState = Record<
  DayKey,
  {
    enabled: boolean;
    start: string;
    end: string;
  }
>;

export type OverrideEntry = {
  id: string;
  date: string;
  start: string;
  end: string;
};

export type AvailabilityFormState = {
  days: DayScheduleState;
  overrides: OverrideEntry[];
};

const defaultDayState: DayScheduleState = {
  mon: { enabled: true, start: '08:00', end: '18:00' },
  tue: { enabled: true, start: '08:00', end: '18:00' },
  wed: { enabled: true, start: '08:00', end: '18:00' },
  thu: { enabled: true, start: '08:00', end: '18:00' },
  fri: { enabled: true, start: '08:00', end: '18:00' },
  sat: { enabled: true, start: '08:00', end: '14:00' },
  sun: { enabled: false, start: '08:00', end: '12:00' },
};

export const createEmptyAvailabilityState = (): AvailabilityFormState => ({
  days: { ...defaultDayState },
  overrides: [],
});

export function availabilityJsonToFormState(
  availability?: AvailabilityJson | null
): AvailabilityFormState {
  const state = createEmptyAvailabilityState();

  if (availability?.base) {
    for (const [key, slots] of Object.entries(availability.base)) {
      const dayKey = key as DayKey;
      const slot = slots?.[0];
      if (!slot || !state.days[dayKey]) continue;

      const startDate = slot.start instanceof Date ? slot.start : new Date(slot.start);
      const endDate = slot.end instanceof Date ? slot.end : new Date(slot.end);

      state.days[dayKey] = {
        enabled: true,
        start: toTimeString(startDate),
        end: toTimeString(endDate),
      };
    }
  }

  if (availability?.overrides) {
    const entries: OverrideEntry[] = [];
    for (const [date, slots] of Object.entries(availability.overrides)) {
      const slot = slots?.[0];
      if (!slot) continue;
      const startDate = slot.start instanceof Date ? slot.start : new Date(slot.start);
      const endDate = slot.end instanceof Date ? slot.end : new Date(slot.end);
      entries.push({
        id: generateOverrideId(),
        date,
        start: toTimeString(startDate),
        end: toTimeString(endDate),
      });
    }
    state.overrides = entries;
  }

  return state;
}

export function formStateToAvailabilityInput(
  state: AvailabilityFormState
): { base?: Record<string, Array<{ start: string; end: string }>>; overrides?: Record<string, Array<{ start: string; end: string }>> } | undefined {
  const baseEntries: Record<string, Array<{ start: string; end: string }>> = {};
  DAY_OPTIONS.forEach(({ key }) => {
    const schedule = state.days[key];
    if (!schedule || !schedule.enabled) return;
    const slot = convertDailySlot(schedule.start, schedule.end);
    if (!slot) return;
    baseEntries[key] = [slot];
  });

  const overrideEntries: Record<string, Array<{ start: string; end: string }>> = {};
  state.overrides.forEach((entry) => {
    if (!entry.date) return;
    const slot = convertOverrideSlot(entry.date, entry.start, entry.end);
    if (!slot) return;
    overrideEntries[entry.date] = [slot];
  });

  if (!Object.keys(baseEntries).length && !Object.keys(overrideEntries).length) {
    return undefined;
  }

  return {
    base: Object.keys(baseEntries).length ? baseEntries : undefined,
    overrides: Object.keys(overrideEntries).length ? overrideEntries : undefined,
  };
}

export interface AvailabilityEditorProps {
  value: AvailabilityFormState;
  onChange: (value: AvailabilityFormState) => void;
  className?: string;
}

export function AvailabilityEditor({
  value,
  onChange,
  className,
}: AvailabilityEditorProps) {
  const updateDay = (key: DayKey, partial: Partial<{ enabled: boolean; start: string; end: string }>) => {
    onChange({
      ...value,
      days: {
        ...value.days,
        [key]: {
          ...value.days[key],
          ...partial,
        },
      },
    });
  };

  const addOverride = () => {
    onChange({
      ...value,
      overrides: [
        ...value.overrides,
        {
          id: generateOverrideId(),
          date: '',
          start: '08:00',
          end: '18:00',
        },
      ],
    });
  };

  const updateOverride = (
    id: string,
    partial: Partial<Omit<OverrideEntry, 'id'>>
  ) => {
    onChange({
      ...value,
      overrides: value.overrides.map((entry) =>
        entry.id === id ? { ...entry, ...partial } : entry
      ),
    });
  };

  const removeOverride = (id: string) => {
    onChange({
      ...value,
      overrides: value.overrides.filter((entry) => entry.id !== id),
    });
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Clock className="h-4 w-4 text-blue-500" />
          Weekly schedule
        </div>
        <div className="grid gap-3">
          {DAY_OPTIONS.map(({ key, label }) => {
            const schedule = value.days[key];
            return (
              <div
                key={key}
                className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-4"
              >
                <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                  <input
                    type="checkbox"
                    checked={schedule.enabled}
                    onChange={(event) =>
                      updateDay(key, { enabled: event.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {label}
                </label>
                <div className="flex items-center gap-2 md:col-span-3">
                  <Input
                    type="time"
                    value={schedule.start}
                    disabled={!schedule.enabled}
                    onChange={(event) => updateDay(key, { start: event.target.value })}
                    className="w-full md:w-40"
                  />
                  <span className="text-sm text-gray-500">to</span>
                  <Input
                    type="time"
                    value={schedule.end}
                    disabled={!schedule.enabled}
                    onChange={(event) => updateDay(key, { end: event.target.value })}
                    className="w-full md:w-40"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Calendar className="h-4 w-4 text-blue-500" />
            Date overrides
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addOverride}
            className="text-blue-600 hover:text-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add override
          </Button>
        </div>

        {value.overrides.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
            No overrides. Machines follow the weekly schedule.
          </p>
        ) : (
          <div className="space-y-3">
            {value.overrides.map((entry) => (
              <div
                key={entry.id}
                className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-5"
              >
                <Input
                  type="date"
                  value={entry.date}
                  onChange={(event) =>
                    updateOverride(entry.id, { date: event.target.value })
                  }
                />
                <Input
                  type="time"
                  value={entry.start}
                  onChange={(event) =>
                    updateOverride(entry.id, { start: event.target.value })
                  }
                />
                <span className="hidden text-center text-sm text-gray-500 md:block">
                  to
                </span>
                <Input
                  type="time"
                  value={entry.end}
                  onChange={(event) =>
                    updateOverride(entry.id, { end: event.target.value })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOverride(entry.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function toTimeString(date: Date) {
  return date.toISOString().substring(11, 16);
}

function convertDailySlot(start: string, end: string) {
  if (!start || !end) return null;
  const slotStart = new Date(`1970-01-01T${start}:00.000Z`);
  const slotEnd = new Date(`1970-01-01T${end}:00.000Z`);
  if (
    Number.isNaN(slotStart.getTime()) ||
    Number.isNaN(slotEnd.getTime()) ||
    slotStart >= slotEnd
  ) {
    return null;
  }
  return { start: slotStart.toISOString(), end: slotEnd.toISOString() };
}

function convertOverrideSlot(date: string, start: string, end: string) {
  if (!date || !start || !end) return null;
  const slotStart = new Date(`${date}T${start}:00.000Z`);
  const slotEnd = new Date(`${date}T${end}:00.000Z`);
  if (
    Number.isNaN(slotStart.getTime()) ||
    Number.isNaN(slotEnd.getTime()) ||
    slotStart >= slotEnd
  ) {
    return null;
  }
  return { start: slotStart.toISOString(), end: slotEnd.toISOString() };
}

function generateOverrideId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `override-${Math.random().toString(36).slice(2)}`;
}


