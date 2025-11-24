'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useSession } from '@booktractor/app/lib/auth-client';
import { useTRPC } from '@booktractor/app/lib/trpc';
import {
  AvailabilityEditor,
  createEmptyAvailabilityState,
  formStateToAvailabilityInput,
  type AvailabilityFormState,
} from '@/components/owner/availability-editor';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ImagePlus, Trash2 } from 'lucide-react';

export default function CreateMachinePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const trpc = useTRPC();
  const { data: session, isPending: isSessionLoading } = useSession();
  const ownerId = session?.user?.id || '';

  const ownerMachinesListPathKey = trpc.owner.machines.list.pathKey;
  const ownerMachineDetailPathKey = trpc.owner.machines.detail.pathKey;
  const clientCatalogSearchPathKey = trpc.client.machines.search.pathKey;
  const clientCatalogFeaturedPathKey = trpc.client.machines.featured.pathKey;
  const clientMachineDetailPathKey = trpc.client.machines.getDetails.pathKey;
  const clientMachineAvailabilityPathKey = trpc.client.machines.checkAvailability.pathKey;
  const machineInvalidations = [
    ownerMachinesListPathKey,
    ownerMachineDetailPathKey,
    clientCatalogSearchPathKey,
    clientCatalogFeaturedPathKey,
    clientMachineDetailPathKey,
    clientMachineAvailabilityPathKey,
  ];

    const createMutation = useMutation({
    ...trpc.owner.machines.create.mutationOptions({
      meta: { invalidateQueryKeys: machineInvalidations },
    }),
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

  const [availabilityState, setAvailabilityState] = useState<AvailabilityFormState>(
    () => createEmptyAvailabilityState()
  );
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [pendingImages, setPendingImages] = useState<Array<{ id: string; file: File; preview: string }>>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      pendingImages.forEach((image) => URL.revokeObjectURL(image.preview));
    };
  }, [pendingImages]);

  const specsPayload = (overrides?: { images?: string[] }) => {
    const specs: Record<string, unknown> = {};
    if (formData.category.trim()) {
      specs.category = formData.category.trim();
    }
    const images = overrides?.images ?? (existingImages.length ? existingImages : undefined);
    if (images?.length) {
      specs.images = images;
    }
    return Object.keys(specs).length ? specs : undefined;
  };

  const buildSubmissionPayload = () => {
    const availabilityPayload = formStateToAvailabilityInput(availabilityState);
    const parsedPrice = parseInt(formData.pricePerHour || '0', 10);
    const basePayload = {
      ownerId,
      name: formData.name,
      code: formData.code,
      description: formData.description || undefined,
      pricePerHour: Number.isNaN(parsedPrice) ? 0 : parsedPrice * 100,
      totalCount: parseInt(formData.totalCount),
      availabilityJson: availabilityPayload,
      specs: specsPayload({ images: existingImages }),
    };

    if (!pendingImages.length) {
      return basePayload;
    }

    const payload = new FormData();
    payload.append('payload', JSON.stringify(basePayload));
    pendingImages.forEach((image, index) => {
      payload.append(
        'images',
        image.file,
        image.file.name || `machine-image-${index + 1}.jpg`
      );
    });
    return payload;
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
  };

  const handleRemoveExistingImage = (url: string) => {
    setExistingImages((prev) => prev.filter((image) => image !== url));
  };

  const handleRemovePendingImage = (id: string) => {
    setPendingImages((prev) => {
      const target = prev.find((image) => image.id === id);
      if (target) {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter((image) => image.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!ownerId) {
      return;
    }

    try {
      const submission = buildSubmissionPayload();
      await createMutation.mutateAsync(submission as any);
      pendingImages.forEach((image) => URL.revokeObjectURL(image.preview));
      setPendingImages([]);
    } catch (error) {
      console.error('Failed to create machine:', error);
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
  };

  const renderExistingImages = () => {
    if (!existingImages.length) {
      return (
        <p className="text-sm text-gray-500">
          No photos yet. Upload at least one to help clients recognize this machine.
        </p>
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {existingImages.map((image) => (
          <div
            key={image}
            className="relative h-40 overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
          >
            <Image
              src={image}
              alt="Machine photo"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
            <button
              type="button"
              className="absolute right-2 top-2 inline-flex items-center rounded-full bg-white/90 p-1 text-gray-700 shadow"
              onClick={() => handleRemoveExistingImage(image)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    );
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
              <Label className="mb-1 block">Equipment Name *</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., John Deere 6120M Tractor"
              />
            </div>

            <div>
              <Label className="mb-1 block">Equipment Code *</Label>
              <Input
                required
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                placeholder="e.g., JD6120M"
              />
              <p className="text-sm text-gray-500 mt-1">
                Unique identifier for this equipment type
              </p>
            </div>

            <div>
              <Label className="mb-1 block">Category</Label>
              <Input
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                placeholder="e.g., Tractor, Excavator, Bulldozer"
              />
            </div>

            <div>
              <Label className="mb-1 block">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
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
              <Label className="mb-1 block">Price per Hour ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.pricePerHour}
                onChange={(e) =>
                  setFormData({ ...formData, pricePerHour: e.target.value })
                }
                placeholder="0.00"
              />
            </div>

            <div>
              <Label className="mb-1 block">Total Units *</Label>
              <Input
                type="number"
                min="1"
                required
                value={formData.totalCount}
                onChange={(e) =>
                  setFormData({ ...formData, totalCount: e.target.value })
                }
                placeholder="1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Number of physical units you own
              </p>
            </div>
          </div>
        </div>

        {/* Availability */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-gray-900">Availability</h2>
            <p className="text-sm text-gray-600">
              Configure the weekly schedule and override specific dates.
            </p>
          </div>
          <div className="mt-6">
            <AvailabilityEditor
              value={availabilityState}
              onChange={setAvailabilityState}
            />
          </div>
                </div>

        {/* Media Uploads */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-gray-900">Media</h2>
            <p className="text-sm text-gray-600">
              Photos are optimized and uploaded when you save this machine.
            </p>
          </div>
          {renderExistingImages()}
          {pendingImages.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pendingImages.map((image) => (
                <div
                  key={image.id}
                  className="relative h-40 overflow-hidden rounded-lg border border-dashed border-emerald-300 bg-emerald-50"
                >
                  <Image
                    src={image.preview}
                    alt="Pending upload"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                    unoptimized
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-white/80 px-2 py-1 text-xs font-semibold text-emerald-700">
                    Pending upload
                  </span>
                  <button
                    type="button"
                    className="absolute right-2 top-2 inline-flex items-center rounded-full bg-white/90 p-1 text-gray-700 shadow"
                    onClick={() => handleRemovePendingImage(image.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                              </div>
                            ))}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <ImagePlus className="h-4 w-4" />
              Add photo
            </Button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
            {imageError && <p className="text-sm text-red-600">{imageError}</p>}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create Machine'}
          </Button>
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
