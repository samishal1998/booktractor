'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from '@booktractor/app/lib/auth-client';
import { useTRPC } from '@booktractor/app/lib/trpc';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  MapPin,
  ShieldCheck,
  Star,
  ImageOff,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function ClientMachineDetailPage() {
  const params = useParams();
  const machineId = params?.id as string | undefined;
  const trpc = useTRPC();
  const { data: session } = useSession();

  const detailQuery = useQuery({
    ...trpc.client.machines.getDetails.queryOptions({
      id: machineId ?? '',
      identifier: machineId ?? '',
    }),
    enabled: !!machineId,
  });

  const machine = detailQuery.data;

  const gallery = useMemo(() => {
    if (!machine?.specs) return [];
    if (Array.isArray(machine.specs.images)) {
      return (machine.specs.images as unknown[]).filter(
        (img): img is string => typeof img === 'string' && img.length > 0
      );
    }
    if (Array.isArray(machine.specs.gallery)) {
      return (machine.specs.gallery as unknown[]).filter(
        (img): img is string => typeof img === 'string' && img.length > 0
      );
    }
    return [];
  }, [machine]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const highlights = useMemo(() => {
    if (!machine?.specs) return [];
    if (Array.isArray(machine.specs.highlights)) {
      return machine.specs.highlights as string[];
    }
    return Object.entries(machine.specs)
      .filter(([_, value]) => typeof value === 'string')
      .slice(0, 6)
      .map(([key, value]) => `${key}: ${value}`);
  }, [machine]);

  const locationLabel =
    typeof machine?.specs?.location === 'string' && machine.specs.location.length
      ? (machine.specs.location as string)
      : machine?.owner.name;

  if (detailQuery.isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-gray-500">
        <Loader2 className="mb-3 h-6 w-6 animate-spin" />
        Loading machine details…
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-gray-500">
        <p className="text-sm">Machine not found.</p>
        <Button asChild className="mt-4">
          <Link href="/client/machines">Back to catalog</Link>
        </Button>
      </div>
    );
  }

  const renderGallery = () => {
    if (gallery.length === 0) {
      return (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400 min-h-[40vh]">
          <ImageOff className="h-8 w-8" />
          <p className="text-sm text-slate-500">Owner hasn&apos;t uploaded photos yet.</p>
        </div>
      );
    }

    if (gallery.length === 1) {
      return (
        <button
          type="button"
          onClick={() => {
            setCarouselIndex(0);
            setIsGalleryOpen(true);
          }}
          className="relative block h-72 w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[40vh]"
        >
          <Image
            src={gallery[0]}
            alt={`${machine.name} photo`}
            fill
            sizes="(min-width: 768px) 60vw, 90vw"
            className="object-cover"
            priority
          />
        </button>
      );
    }

    return (
      <div className="grid grid-cols-4 grid-rows-2 gap-0 overflow-hidden rounded-2xl border border-slate-100 min-h-[40vh]">
        <button
          type="button"
          onClick={() => {
            setCarouselIndex(0);
            setIsGalleryOpen(true);
          }}
          className="relative col-span-3 row-span-2 h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <Image
            src={gallery[0]}
            alt={`${machine.name} primary photo`}
            fill
            sizes="(min-width: 768px) 70vw, 100vw"
            className="object-cover"
            priority
          />
        </button>
        <button
          type="button"
          onClick={() => {
            setCarouselIndex(1);
            setIsGalleryOpen(true);
          }}
          className="relative col-span-1 row-span-1 h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <Image
            src={gallery[1]}
            alt={`${machine.name} secondary photo`}
            fill
            sizes="(min-width: 768px) 20vw, 45vw"
            className="object-cover"
          />
        </button>
        <button
          type="button"
          onClick={() => {
            setCarouselIndex(0);
            setIsGalleryOpen(true);
          }}
          className="col-span-1 row-span-1 flex h-full flex-col items-center justify-center bg-slate-900 text-white transition hover:bg-slate-800"
        >
          <p className="text-sm font-semibold">Show all photos</p>
          <p className="text-xs text-white/80">{gallery.length} total</p>
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-600">Machine detail</p>
          <h1 className="text-3xl font-semibold text-slate-900">{machine.name}</h1>
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" />
            {locationLabel}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link href="/client/machines">Back to catalog</Link>
          </Button>
          <Button asChild>
            <Link href={`/client/machines/${machine.id}/book`}>Book this machine</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">{renderGallery()}</div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              {machine.description ?? 'No description provided.'}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Owner</p>
                <p className="text-sm font-semibold text-slate-900">
                  {machine.owner.name}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Active units</p>
                <p className="text-sm font-semibold text-slate-900">
                  {machine.availability.active}/{machine.availability.total}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Highlights</p>
              <div className="flex flex-wrap gap-2">
                {highlights.length === 0 && (
                  <Badge variant="outline">Specs coming soon</Badge>
                )}
                {highlights.map((highlight) => (
                  <Badge key={highlight} variant="secondary">
                    {highlight}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-lg font-semibold text-slate-900">4.5</p>
                <p className="text-xs text-slate-500">Average rating</p>
              </div>
            </div>
            {machine.reviews?.map((review) => (
              <div key={review.author} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-900">{review.author}</p>
                <p className="text-xs text-slate-500">{'★'.repeat(review.rating)}</p>
                <p className="text-sm text-slate-600">{review.comment}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Availability & compliance</CardTitle>
          <Badge variant="outline" className="text-xs">
            Owner updates nightly
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Calendar</p>
            <p className="text-sm text-slate-600">
              {machine.availability.active > 0
                ? 'At least one unit available—check desired dates in booking flow.'
                : 'Currently fully booked. Request to waitlist.'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Insurance ready</p>
              <p className="text-xs text-slate-500">
                Owner provides COI on demand for approved bookings.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Documents</p>
            <p className="text-sm text-slate-600">
              {machine.specs?.documents
                ? 'Technical manuals attached'
                : 'Request manuals after booking'}
            </p>
          </div>
        </CardContent>
      </Card>
      {isGalleryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4 py-6">
          <button
            type="button"
            className="absolute right-6 top-6 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            onClick={() => setIsGalleryOpen(false)}
            aria-label="Close gallery"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white transition hover:bg-white/40"
            onClick={() =>
              setCarouselIndex((prev) => (prev - 1 + gallery.length) % gallery.length)
            }
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="relative h-[70vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-black">
            <Image
              src={gallery[carouselIndex]}
              alt={`${machine.name} photo ${carouselIndex + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white transition hover:bg-white/40"
            onClick={() => setCarouselIndex((prev) => (prev + 1) % gallery.length)}
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className="absolute bottom-6 text-sm font-medium text-white">
            {carouselIndex + 1} / {gallery.length}
          </div>
        </div>
      )}
    </div>
  );
}


