'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import type { AvailabilityJson } from '@booktractor/db/schemas';
import { useSession } from '@booktractor/app/lib/auth-client';
import { useTRPC } from '@booktractor/app/lib/trpc';

const DAY_OPTIONS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
] as const;

type DayKey = typeof DAY_OPTIONS[number]['key'];

type DayScheduleState = Record<
  DayKey,
  {
    enabled: boolean;
    start: string;
    end: string;
  }
>;

type OverrideEntry = {
  id: string;
  date: string;
  start: string;
  end: string;
};

type AvailabilityInputPayload = {
  base?: Record<string, Array<{ start: string; end: string }>>;
  overrides?: Record<string, Array<{ start: string; end: string }>>;
};

const buildDefaultDaySchedule = (): DayScheduleState => ({
  mon: { enabled: true, start: '08:00', end: '18:00' },
  tue: { enabled: true, start: '08:00', end: '18:00' },
  wed: { enabled: true, start: '08:00', end: '18:00' },
  thu: { enabled: true, start: '08:00', end: '18:00' },
  fri: { enabled: true, start: '08:00', end: '18:00' },
  sat: { enabled: true, start: '08:00', end: '14:00' },
  sun: { enabled: false, start: '08:00', end: '12:00' },
});

const generateOverrideId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `override-${Math.random().toString(36).slice(2)}`;

export default function CreateMachinePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const trpc = useTRPC();
  const { data: session, isLoading: isSessionLoading } = useSession();
  const ownerId = session?.user?.id || '';

  const createMutation = useMutation({
    ...trpc.owner.machines.create.mutationOptions(),
    onSuccess: () => {
      router.push('/owner/machines');
    },
  });

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    category: '',
    pricePerHour: '',
    totalCount: '1',
  });

  const [daySchedule, setDaySchedule] = useState<DayScheduleState>(
    buildDefaultDaySchedule()
  );
  const [overrides, setOverrides] = useState<OverrideEntry[]>([]);

  const toggleDay = (key: DayKey) => {
    setDaySchedule((prev) => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled },
    }));
  };

  const updateDayTime = (key: DayKey, field: 'start' | 'end', value: string) => {
    setDaySchedule((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const addOverrideEntry = () => {
    setOverrides((prev) => [
      ...prev,
      {
        id: generateOverrideId(),
        date: '',
        start: '08:00',
        end: '18:00',
      },
    ]);
  };

  const updateOverrideEntry = (
    id: string,
    field: Exclude<keyof OverrideEntry, 'id'>,
    value: string
  ) => {
    setOverrides((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
  };

  const removeOverrideEntry = (id: string) => {
    setOverrides((prev) => prev.filter((entry) => entry.id !== id));
  };

  const convertDailySlot = (start: string, end: string) => {
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
    return { start: slotStart, end: slotEnd };
  };

  const convertOverrideSlot = (date: string, start: string, end: string) => {
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
    return { start: slotStart, end: slotEnd };
  };

  const buildAvailabilityPayload = (): AvailabilityInputPayload | undefined => {
    const baseEntries: NonNullable<AvailabilityInputPayload['base']> = {};
    DAY_OPTIONS.forEach(({ key }) => {
      const schedule = daySchedule[key];
      if (!schedule || !schedule.enabled) return;
      const slot = convertDailySlot(schedule.start, schedule.end);
      if (!slot) return;
      baseEntries[key] = [
        {
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
        },
      ];
    });

    const overrideEntries: NonNullable<AvailabilityInputPayload['overrides']> = {};
    overrides.forEach((entry) => {
      if (!entry.date) return;
      const slot = convertOverrideSlot(entry.date, entry.start, entry.end);
      if (!slot) return;
      overrideEntries[entry.date] = [
        {
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
        },
      ];
    });

    if (!Object.keys(baseEntries).length && !Object.keys(overrideEntries).length) {
      return undefined;
    }

    return {
      base: Object.keys(baseEntries).length ? baseEntries : undefined,
      overrides: Object.keys(overrideEntries).length ? overrideEntries : undefined,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!ownerId) {
      return;
    }

    try {
      const availabilityPayload = buildAvailabilityPayload();
      const parsedPrice = parseInt(formData.pricePerHour || '0', 10);

      await createMutation.mutateAsync({
        ownerId,
        name: formData.name,
        code: formData.code,
        description: formData.description || undefined,
        pricePerHour: Number.isNaN(parsedPrice) ? 0 : parsedPrice * 100,
        totalCount: parseInt(formData.totalCount),
        availabilityJson: availabilityPayload,
      });
    } catch (error) {
      console.error('Failed to create machine:', error);
      setIsSubmitting(false);
    }
  };

  if (isSessionLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your owner session...</p>
        </div>
      </div>
    );
  }

  if (!ownerId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold text-gray-900">
            Owner access required
          </p>
          <p className="text-gray-600">
            Sign in with an owner account to add equipment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Add New Equipment</h1>
        <p className="text-gray-600 mt-1">
          Create a new equipment template to add to your inventory
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Basic Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Equipment Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., John Deere 6120M Tractor"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Equipment Code *
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., JD6120M"
              />
              <p className="text-sm text-gray-500 mt-1">
                Unique identifier for this equipment type
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Tractor, Excavator, Bulldozer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe the equipment, specifications, and any special features..."
              />
            </div>
          </div>
        </div>

        {/* Pricing & Inventory */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Pricing & Inventory
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price per Hour ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.pricePerHour}
                onChange={(e) =>
                  setFormData({ ...formData, pricePerHour: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Units *
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.totalCount}
                onChange={(e) =>
                  setFormData({ ...formData, totalCount: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Number of physical units you own
              </p>
            </div>
          </div>
        </div>

        {/* Weekly Availability */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Weekly Availability</h2>
            <p className="text-sm text-gray-600">
              Define the default hours this machine can be booked on each weekday.
            </p>
          </div>
          <div className="space-y-3">
            {DAY_OPTIONS.map(({ key, label }) => {
              const schedule = daySchedule[key];
              return (
                <div
                  key={key}
                  className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center"
                >
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                    <input
                      type="checkbox"
                      checked={schedule.enabled}
                      onChange={() => toggleDay(key)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {label}
                  </label>
                  <div className="flex items-center gap-2 md:col-span-3">
                    <input
                      type="time"
                      value={schedule.start}
                      disabled={!schedule.enabled}
                      onChange={(e) => updateDayTime(key, 'start', e.target.value)}
                      className="w-full md:w-40 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    />
                    <span className="text-sm text-gray-500">to</span>
                    <input
                      type="time"
                      value={schedule.end}
                      disabled={!schedule.enabled}
                      onChange={(e) => updateDayTime(key, 'end', e.target.value)}
                      className="w-full md:w-40 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Specific Overrides */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Specific Date Overrides
              </h2>
              <p className="text-sm text-gray-600">
                Use overrides when availability differs on a particular date (holiday,
                maintenance window, etc.).
              </p>
            </div>
            <button
              type="button"
              onClick={addOverrideEntry}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              + Add Override
            </button>
          </div>

          {overrides.length === 0 ? (
            <p className="text-sm text-gray-500">
              No overrides added. Machines will use the weekly schedule above.
            </p>
          ) : (
            <div className="space-y-3">
              {overrides.map((entry) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center"
                >
                  <input
                    type="date"
                    value={entry.date}
                    onChange={(e) =>
                      updateOverrideEntry(entry.id, 'date', e.target.value)
                    }
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="time"
                    value={entry.start}
                    onChange={(e) =>
                      updateOverrideEntry(entry.id, 'start', e.target.value)
                    }
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="hidden md:flex justify-center text-sm text-gray-500">
                    to
                  </span>
                  <input
                    type="time"
                    value={entry.end}
                    onChange={(e) =>
                      updateOverrideEntry(entry.id, 'end', e.target.value)
                    }
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => removeOverrideEntry(entry.id)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || createMutation.isPending}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting || createMutation.isPending
              ? 'Creating...'
              : 'Create Equipment'}
          </button>
        </div>

        {createMutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">
              Failed to create equipment. Please try again.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
