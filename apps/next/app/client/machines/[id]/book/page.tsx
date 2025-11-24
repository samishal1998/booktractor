'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from '@booktractor/app/lib/auth-client';
import { useTRPC, useTRPCClient } from '@booktractor/app/lib/trpc';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Line } from 'react-chartjs-2';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { addDays, differenceInCalendarDays, endOfDay, format, max, startOfDay, subDays } from 'date-fns';
import '@/lib/chart';

const toInputValue = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

export default function ClientBookingWizardPage() {
  const { data: session } = useSession();
  const clientId = session?.user?.id || '';
  const params = useParams();
  const machineId = params?.id as string | undefined;
  const router = useRouter();
  const trpc = useTRPC();

  const [form, setForm] = useState(() => {
    const start = new Date();
    const end = new Date(Date.now() + 1000 * 60 * 60 * 24);
    return {
      start: toInputValue(start),
      end: toInputValue(end),
      quantity: 1,
      notes: '',
    };
  });

  const availabilityQuery = useQuery({
    ...trpc.client.machines.checkAvailability.queryOptions({
      templateId: machineId ?? '',
      startTime: new Date(form.start).toISOString(),
      endTime: new Date(form.end).toISOString(),
      requestedCount: form.quantity,
    }),
    enabled: !!machineId,
  });

  const clientBookingsPathKey = trpc.client.bookings.myBookings.pathKey;
  const ownerBookingsPathKey = trpc.owner.bookings.listAll.pathKey;
  const ownerMachineBookingsPathKey = trpc.owner.bookings.listByMachine.pathKey;

  const bookingMutation = useMutation({
    ...trpc.client.bookings.create.mutationOptions({
      meta: {
        invalidateQueryKeys: [
          clientBookingsPathKey,
          ownerBookingsPathKey,
          ownerMachineBookingsPathKey,
        ],
      },
    }),
    onSuccess: (result) => {
      const booking = result.bookings?.[0];
      if (booking) {
        router.push(`/client/bookings/${booking.id}`);
      }
    },
  });

  const availability = availabilityQuery.data;

  const trpcRawClient = useTRPCClient();
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [availabilityTimeline, setAvailabilityTimeline] = useState<
    Array<{ date: Date; available: number }>
  >([]);
  const today = useMemo(() => startOfDay(new Date()), []);
  const initialEnd = useMemo(() => addDays(today, 30), [today]);
  const initialStart = useMemo(() => subDays(today, 14), [today]);
  const [graphRange, setGraphRange] = useState(() => ({
    start: initialStart,
    end: initialEnd,
  }));
  const [userRange, setUserRange] = useState<{
    start?: string;
    end?: string;
  }>({});

  useEffect(() => {
    if (!machineId) return;
    let active = true;
    const loadTimeline = async (rangeOverride?: { start: Date; end: Date }) => {
      setTimelineLoading(true);
      try {
        const tentativeBookingEnd = form.end ? new Date(form.end) : addDays(today, 7);
        const normalizedBookingEnd = Number.isNaN(tentativeBookingEnd.getTime())
          ? addDays(today, 7)
          : tentativeBookingEnd;
        const suggestedEnd = max([
          graphRange.end,
          addDays(startOfDay(normalizedBookingEnd), 14),
        ]);
        if (suggestedEnd.getTime() !== graphRange.end.getTime() && !rangeOverride) {
          setGraphRange((prev) => ({ ...prev, end: suggestedEnd }));
        }
        const rangeStart = rangeOverride?.start ?? graphRange.start;
        const rangeEnd = rangeOverride?.end ?? max([graphRange.end, suggestedEnd]);
        const totalDays = Math.max(1, differenceInCalendarDays(rangeEnd, rangeStart) + 1);
        const days = Array.from({ length: totalDays }, (_, index) => addDays(rangeStart, index));
        const snapshots = await Promise.all(
          days.map(async (day) => {
            const rangeStart = startOfDay(day);
            const rangeEnd = endOfDay(day);
            const result = await trpcRawClient.client.machines.checkAvailability.query({
              templateId: machineId,
              startTime: rangeStart.toISOString(),
              endTime: rangeEnd.toISOString(),
              requestedCount: Math.max(1, form.quantity),
            });
            return { date: rangeStart, available: result.availableCount ?? 0 };
          })
        );
        if (!active) return;
        setAvailabilityTimeline(snapshots);
        setTimelineError(null);
      } catch (error) {
        if (!active) return;
        setAvailabilityTimeline([]);
        setTimelineError(
          error instanceof Error ? error.message : 'Failed to load availability timeline'
        );
      } finally {
        if (active) {
          setTimelineLoading(false);
        }
      }
    };
    void loadTimeline();
    return () => {
      active = false;
    };
  }, [machineId, form.end, form.quantity, trpcRawClient, graphRange.end, graphRange.start, today]);

  const timelineData = useMemo(() => {
    if (!availabilityTimeline.length) return null;
    return {
      labels: availabilityTimeline.map((point) => format(point.date, 'MMM d')),
      datasets: [
        {
          label: 'Units available',
          data: availabilityTimeline.map((point) => point.available),
          stepped: 'before' as const,
          borderColor: '#0f766e',
          backgroundColor: 'rgba(15, 118, 110, 0.25)',
          borderWidth: 2,
          fill: true,
          pointRadius: 0,
          tension: 0,
        },
      ],
    };
  }, [availabilityTimeline]);

  const timelineOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
        },
      },
      interaction: {
        intersect: false,
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8,
          },
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
          },
        },
      },
    }),
    []
  );

  const canSubmit =
    form.start < form.end &&
    form.quantity > 0 &&
    !!machineId &&
    !!clientId &&
    !bookingMutation.isPending;

  const totalEstimate = useMemo(() => {
    if (!availability?.pricePerHour) return null;
    const start = new Date(form.start);
    const end = new Date(form.end);
    const hours = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60))
    );
    return (hours * availability.pricePerHour * form.quantity) / 100;
  }, [availability?.pricePerHour, form.start, form.end, form.quantity]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    await bookingMutation.mutateAsync({
      templateId: machineId!,
      requestedCount: form.quantity,
      startTime: new Date(form.start).toISOString(),
      endTime: new Date(form.end).toISOString(),
      clientId,
      label: form.notes || undefined,
    });
  };

  if (!clientId) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-gray-500">
        <p className="text-sm">Sign in with a client account to request bookings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-emerald-600">Booking wizard</p>
        <h1 className="text-3xl font-semibold text-slate-900">Request this machine</h1>
        <p className="text-sm text-slate-500">
          Choose your window and we’ll reserve the next available unit. Owner confirmation is required before payment.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="start">Start date</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  value={form.start}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, start: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end">End date</Label>
                <Input
                  id="end"
                  type="datetime-local"
                  value={form.end}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, end: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={form.quantity}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    quantity: Math.max(1, Number(event.target.value)),
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (delivery, site contact, etc.)</Label>
              <Textarea
                id="notes"
                rows={4}
                value={form.notes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="Optional details for the owner"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Availability & estimate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {availabilityQuery.isLoading && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking availability…
              </div>
            )}
            {availability && (
              <div className="space-y-2 text-sm text-slate-600">
                <p>
                  {availability.availableCount} unit(s) available. Requested count:{' '}
                  {availability.requestedCount}.
                </p>
                <p>
                  Estimated total:{' '}
                  {totalEstimate !== null
                    ? new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(totalEstimate)
                    : 'Contact owner'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-3">
            <div>
              <CardTitle>Availability outlook</CardTitle>
              <p className="text-sm text-slate-500">
                Daily units available (past 2 weeks through upcoming window).
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Label htmlFor="range-start">Range start</Label>
                <Input
                  id="range-start"
                  type="date"
                  value={userRange.start ?? format(graphRange.start, 'yyyy-MM-dd')}
                  onChange={(event) =>
                    setUserRange((prev) => ({ ...prev, start: event.target.value }))
                  }
                  className="h-8 w-36"
                  max={userRange.end ?? format(graphRange.end, 'yyyy-MM-dd')}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="range-end">Range end</Label>
                <Input
                  id="range-end"
                  type="date"
                  value={userRange.end ?? format(graphRange.end, 'yyyy-MM-dd')}
                  onChange={(event) =>
                    setUserRange((prev) => ({ ...prev, end: event.target.value }))
                  }
                  className="h-8 w-36"
                  min={userRange.start ?? format(graphRange.start, 'yyyy-MM-dd')}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const startOverride = userRange.start ? startOfDay(new Date(userRange.start)) : graphRange.start;
                  const endOverride = userRange.end ? endOfDay(new Date(userRange.end)) : graphRange.end;
                  setGraphRange({
                    start: startOverride,
                    end: endOverride,
                  });
                  setTimelineError(null);
                }}
              >
                Apply
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setGraphRange({
                    start: subDays(today, 14),
                    end: addDays(today, 30),
                  });
                  setUserRange({});
                }}
              >
                Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {timelineError && (
              <p className="mb-2 text-xs text-red-500">{timelineError}</p>
            )}
            {timelineLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading availability timeline…
              </div>
            ) : !timelineData ? (
              <p className="text-sm text-slate-500">
                Timeline data will appear once availability loads.
              </p>
            ) : (
              <div className="h-64">
                <Line data={timelineData} options={timelineOptions} />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={!canSubmit}
            className="flex-1"
          >
            {bookingMutation.isPending ? 'Submitting…' : 'Submit booking request'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}


