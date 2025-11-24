'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSession } from '@booktractor/app/lib/auth-client';
import { useTRPC } from '@booktractor/app/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AvailabilityEditor,
  availabilityJsonToFormState,
  formStateToAvailabilityInput,
  createEmptyAvailabilityState,
  type AvailabilityFormState,
} from '@/components/owner/availability-editor';
import {
  Tractor,
  ClipboardList,
  CalendarDays,
  ArrowLeft,
  Pencil,
  Archive,
  ImagePlus,
  Trash2,
} from 'lucide-react';

type PendingImage = {
  id: string;
  file: File;
  preview: string;
};

const bookingStatusMap: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'success' | 'warning' }
> = {
  pending_renter_approval: { label: 'Pending approval', variant: 'warning' },
  approved_by_renter: { label: 'Approved', variant: 'success' },
  sent_back_to_client: { label: 'Needs changes', variant: 'secondary' },
  rejected_by_renter: { label: 'Rejected', variant: 'outline' },
  canceled_by_client: { label: 'Canceled', variant: 'outline' },
};

export default function MachineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const machineId = params?.id as string;
  const trpc = useTRPC();
  const { data: session, isPending: isSessionLoading } = useSession();
  const ownerId = session?.user?.id || '';

  const ownerMachinesListPathKey = trpc.owner.machines.list.pathKey;
  const ownerMachineDetailPathKey = trpc.owner.machines.detail.pathKey;
  const clientCatalogSearchPathKey = trpc.client.machines.search.pathKey;
  const clientCatalogFeaturedPathKey = trpc.client.machines.featured.pathKey;
  const clientMachineDetailPathKey = trpc.client.machines.getDetails.pathKey;
  const clientMachineAvailabilityPathKey = trpc.client.machines.checkAvailability.pathKey;
  const ownerBookingsPathKey = trpc.owner.bookings.listAll.pathKey;
  const invalidationTargets = [
    ownerMachinesListPathKey,
    ownerMachineDetailPathKey,
    clientCatalogSearchPathKey,
    clientCatalogFeaturedPathKey,
    clientMachineDetailPathKey,
    clientMachineAvailabilityPathKey,
    ownerBookingsPathKey,
  ];

  const detailQuery = useQuery({
    ...trpc.owner.machines.detail.queryOptions({
      ownerId,
      machineId,
    }),
    enabled: !!ownerId && !!machineId,
  });

  const bookingsQuery = useQuery({
    ...trpc.owner.bookings.listByMachine.queryOptions({
      ownerId,
      machineId,
    }),
    enabled: !!ownerId && !!machineId,
  });

  const generalMutation = useMutation({
    ...trpc.owner.machines.update.mutationOptions({
      meta: { invalidateQueryKeys: invalidationTargets },
    }),
    onSuccess: () => {
      detailQuery.refetch();
    },
  });

  const availabilityMutation = useMutation({
    ...trpc.owner.machines.update.mutationOptions({
      meta: { invalidateQueryKeys: invalidationTargets },
    }),
    onSuccess: () => {
      detailQuery.refetch();
    },
  });

  const archiveMutation = useMutation({
    ...trpc.owner.machines.archive.mutationOptions({
      meta: { invalidateQueryKeys: invalidationTargets },
    }),
    onSuccess: () => {
      router.push('/owner/machines');
    },
  });

  const machine = detailQuery.data as any;
  const bookingList = (bookingsQuery.data ?? []) as Array<any>;

  const [generalForm, setGeneralForm] = useState({
    name: '',
    code: '',
    pricePerHour: '',
    category: '',
    description: '',
  });
  const [availabilityState, setAvailabilityState] =
    useState<AvailabilityFormState>(() => createEmptyAvailabilityState());
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [imagesDirty, setImagesDirty] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const hasLocalImageChanges = imagesDirty || pendingImages.length > 0;

  useEffect(() => {
    if (!machine) {
      return;
    }

    setGeneralForm({
      name: machine.name ?? '',
      code: machine.code ?? '',
      pricePerHour: machine.pricePerHour
        ? (machine.pricePerHour / 100).toFixed(2)
        : '',
      category:
        typeof machine.specs?.category === 'string'
          ? machine.specs.category
          : '',
      description: machine.description ?? '',
    });

    setAvailabilityState(
      availabilityJsonToFormState(machine.availabilityJson)
    );

    if (!hasLocalImageChanges) {
      setExistingImages(
        Array.isArray(machine.specs?.images) ? machine.specs.images : []
      );
      setPendingImages([]);
      setImagesDirty(false);
    }
  }, [machine, hasLocalImageChanges]);

  useEffect(() => {
    return () => {
      pendingImages.forEach((image) => URL.revokeObjectURL(image.preview));
    };
  }, [pendingImages]);

  const isLoading = detailQuery.isLoading || isSessionLoading;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-gray-500">
        <ArrowLeft className="mb-3 h-6 w-6 animate-pulse" />
        Loading machine details…
        </div>
    );
  }

  if (!ownerId) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2 text-center text-gray-600">
        <p className="text-lg font-semibold text-gray-900">Owner access required</p>
        <p className="text-sm text-gray-500">
          Sign in with an owner account to view machine details.
        </p>
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="max-w-3xl space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
        <p className="text-lg font-semibold">Machine not found</p>
        <Link href="/owner/machines" className="text-blue-600 hover:underline">
          Back to all machines
          </Link>
      </div>
    );
  }

  const formatCurrency = (value?: number | null) => {
    if (!value) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value / 100);
  };

  const buildSpecsPayload = (overrides?: { images?: string[] }) => {
    const baseSpecs = (machine?.specs ?? {}) as Record<string, unknown>;
    const nextSpecs: Record<string, unknown> = { ...baseSpecs };
    const categoryValue = generalForm.category?.trim();

    if (categoryValue) {
      nextSpecs.category = categoryValue;
    } else {
      delete nextSpecs.category;
    }

    if (overrides?.images !== undefined) {
      if (overrides.images.length) {
        nextSpecs.images = overrides.images;
      } else {
        delete nextSpecs.images;
      }
    } else if (existingImages.length) {
      nextSpecs.images = existingImages;
    } else {
      delete nextSpecs.images;
    }

    return Object.keys(nextSpecs).length ? nextSpecs : undefined;
  };

  const wrapPayloadWithPendingImages = (payload: Record<string, unknown>) => {
    if (!pendingImages.length) {
      return payload;
    }
    const formDataPayload = new FormData();
    formDataPayload.append('payload', JSON.stringify(payload));
    pendingImages.forEach((image, index) => {
      formDataPayload.append(
        'images',
        image.file,
        image.file.name || `machine-image-${index + 1}.jpg`
      );
    });
    return formDataPayload;
  };

  const clearPendingImages = () => {
    pendingImages.forEach((image) => URL.revokeObjectURL(image.preview));
    setPendingImages([]);
  };

  const handleGeneralSave = async () => {
    const parsedPrice = parseFloat(generalForm.pricePerHour || '0');
    const specsPayload = buildSpecsPayload({ images: existingImages });
    const submission = wrapPayloadWithPendingImages({
      id: machineId,
      ownerId,
      name: generalForm.name,
      code: generalForm.code,
      description: generalForm.description || undefined,
      pricePerHour: Number.isNaN(parsedPrice) ? 0 : Math.round(parsedPrice * 100),
      specs: specsPayload,
    });
    await generalMutation.mutateAsync(submission as any);
    clearPendingImages();
    setImagesDirty(false);
  };

  const handleAvailabilitySave = async () => {
    await availabilityMutation.mutateAsync({
      id: machineId,
      ownerId,
      availabilityJson: formStateToAvailabilityInput(availabilityState),
    });
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    const files = Array.from(event.target.files);
    event.target.value = '';

    const next = files
      .filter((file) => {
        if (!file.type.startsWith('image/')) {
          setImageError('Only image files are supported');
          return false;
        }
        return true;
      })
      .map((file) => ({
        id:
          typeof self !== 'undefined' && self.crypto?.randomUUID
            ? self.crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
      }));

    if (!next.length) return;
    setImageError(null);
    setPendingImages((prev) => [...prev, ...next]);
    setImagesDirty(true);
  };

  const handleRemoveExistingImage = (url: string) => {
    setExistingImages((prev) => prev.filter((image) => image !== url));
    setImagesDirty(true);
  };

  const handleRemovePendingImage = (id: string) => {
    setPendingImages((prev) => {
      const target = prev.find((image) => image.id === id);
      if (target) {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter((image) => image.id !== id);
    });
    setImagesDirty(true);
  };

  const handleSaveImages = async () => {
    if (!machineId) return;
    try {
      setImageError(null);
      const submission = wrapPayloadWithPendingImages({
        id: machineId,
        ownerId,
        specs: buildSpecsPayload({ images: existingImages }),
      });
      await generalMutation.mutateAsync(submission as any);
      clearPendingImages();
      setImagesDirty(false);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Failed to save gallery');
    }
  };

  const handleArchive = async () => {
    if (
      window.confirm(
        'Archive this machine? It will no longer appear in client listings.'
      )
    ) {
      await archiveMutation.mutateAsync({
        id: machineId,
        ownerId,
      });
    }
  };

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 border-b border-gray-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-gray-500">Owner Portal · Machine</p>
          <h1 className="text-3xl font-semibold text-gray-900">{machine.name}</h1>
          <p className="text-sm text-gray-500">
            {machine.code} ·{' '}
            {typeof machine.specs?.category === 'string'
              ? machine.specs.category
              : 'Uncategorized'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => router.push('/owner/machines')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to list
          </Button>
          <Button variant="outline" onClick={handleArchive} disabled={archiveMutation.isPending}>
            <Archive className="mr-2 h-4 w-4" />
            {archiveMutation.isPending ? 'Archiving…' : 'Archive'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>General information</CardTitle>
                <p className="text-sm text-gray-500">
                  Update display name, code, rate, and description.
                </p>
              </div>
              <Button
                onClick={handleGeneralSave}
                disabled={generalMutation.isPending}
              >
                {generalMutation.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input
                    value={generalForm.name}
                    onChange={(e) =>
                      setGeneralForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Code</Label>
                  <Input
                    value={generalForm.code}
                    onChange={(e) =>
                      setGeneralForm((prev) => ({ ...prev, code: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Hourly rate (USD)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={generalForm.pricePerHour}
                    onChange={(e) =>
                      setGeneralForm((prev) => ({
                        ...prev,
                        pricePerHour: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Input
                    value={generalForm.category}
                    onChange={(e) =>
                      setGeneralForm((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea
                  value={generalForm.description}
                  onChange={(e) =>
                    setGeneralForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Describe specs, maintenance notes, etc."
                />
            </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Media</CardTitle>
                <p className="text-sm text-gray-500">
                  Photos are optimized on save so you can preview first.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <ImagePlus className="mr-2 h-4 w-4" />
                  Add image
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveImages}
                  disabled={!imagesDirty || generalMutation.isPending}
                >
                  {generalMutation.isPending ? 'Saving…' : 'Save gallery'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={imageInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
              />
              {existingImages.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {existingImages.map((url) => (
                    <div
                      key={url}
                      className="group relative h-48 overflow-hidden rounded-xl border border-gray-200"
                    >
                      <Image
                        src={url}
                        alt="Machine image"
                        fill
                        sizes="(max-width: 640px) 100vw, 50vw"
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingImage(url)}
                        className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-gray-600 shadow transition hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 text-center text-gray-500">
                  <ImagePlus className="mb-2 h-6 w-6" />
                  <p className="text-sm font-medium">No media yet</p>
                  <p className="text-xs text-gray-400">
                    Add at least one photo to help owners identify equipment.
                  </p>
                </div>
              )}

              {pendingImages.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {pendingImages.map((image) => (
                    <div
                      key={image.id}
                      className="relative h-40 overflow-hidden rounded-xl border border-dashed border-emerald-300 bg-emerald-50"
                    >
                      <Image
                        src={image.preview}
                        alt="Pending upload"
                        fill
                        sizes="(max-width: 640px) 100vw, 50vw"
                        className="object-cover"
                        unoptimized
                      />
                      <span className="absolute left-3 top-3 rounded-full bg-white/80 px-2 py-1 text-xs font-semibold text-emerald-700">
                        Pending
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePendingImage(image.id)}
                        className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-gray-600 shadow transition hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {imageError && (
                <p className="text-sm text-red-600">{imageError}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Availability</CardTitle>
                <p className="text-sm text-gray-500">
                  Weekly schedule plus special date overrides.
                </p>
              </div>
              <Button
                onClick={handleAvailabilitySave}
                disabled={availabilityMutation.isPending}
              >
                {availabilityMutation.isPending ? 'Saving…' : 'Save availability'}
              </Button>
            </CardHeader>
            <CardContent>
              <AvailabilityEditor
                value={availabilityState}
                onChange={setAvailabilityState}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent bookings</CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link href={`/owner/bookings?machine=${machineId}`}>View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {bookingList.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No bookings yet for this machine.
              </p>
            ) : (
              <div className="space-y-3">
                  {bookingList.slice(0, 5).map((booking) => {
                    const status = bookingStatusMap[booking.status] ?? {
                      label: booking.status,
                      variant: 'secondary' as const,
                    };
                    return (
                  <Link
                    key={booking.id}
                    href={`/owner/bookings/${booking.id}`}
                        className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 hover:border-blue-200 hover:bg-blue-50 transition"
                  >
                      <div>
                          <p className="text-sm font-semibold text-gray-900">
                          Booking #{booking.id.slice(0, 8)}
                        </p>
                          <p className="text-xs text-gray-500">
                            {new Date(booking.startTime).toLocaleDateString()} –{' '}
                          {new Date(booking.endTime).toLocaleDateString()}
                        </p>
                      </div>
                        <Badge variant={status.variant}>{status.label}</Badge>
                  </Link>
                    );
                  })}
              </div>
            )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Utilization</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <SummaryRow
                label="Available units"
                value={`${machine.stats?.activeInstanceCount ?? 0}/${machine.stats?.instanceCount ?? 0}`}
              />
              <SummaryRow
                label="Active bookings"
                value={`${machine.stats?.activeBookingCount ?? 0}`}
              />
              <SummaryRow
                label="Lifetime bookings"
                value={`${machine.stats?.bookingCount ?? 0}`}
              />
              <SummaryRow
                label="Hourly rate"
                value={formatCurrency(machine.pricePerHour)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <QuickLink href={`/owner/calendar?machine=${machineId}`} icon={<CalendarDays className="h-4 w-4" />}>
                View calendar
              </QuickLink>
              <QuickLink href={`/owner/bookings?machine=${machineId}`} icon={<ClipboardList className="h-4 w-4" />}>
                View bookings
              </QuickLink>
              <QuickLink href={`/owner/machines/${machineId}/instances`} icon={<Tractor className="h-4 w-4" />}>
                Manage units
              </QuickLink>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-800 transition hover:border-blue-200 hover:bg-blue-50"
    >
      <span className="flex items-center gap-2">
        {icon}
        {children}
      </span>
      <Pencil className="h-4 w-4 text-gray-400" />
    </Link>
  );
}
