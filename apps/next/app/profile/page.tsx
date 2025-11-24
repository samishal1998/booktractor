'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useSession } from '@booktractor/app/lib/auth-client';
import { useTRPC } from '@booktractor/app/lib/trpc';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Loader2 } from 'lucide-react';

type ProfileFormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
};

const emptyForm: ProfileFormState = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
};

export default function ProfilePage() {
  const trpc = useTRPC();
  const { data: session, isPending: sessionLoading } = useSession();
  const userId = session?.user?.id || '';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formState, setFormState] = useState<ProfileFormState>(emptyForm);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<{ file: File; preview: string } | null>(null);

  const profilePathKey = trpc.profile.getProfile.pathKey;

  const profileQuery = useQuery({
    ...trpc.profile.getProfile.queryOptions({ userId }),
    enabled: !!userId,
  });

  const updateProfile = useMutation({
    ...trpc.profile.updateProfile.mutationOptions({
      meta: { invalidateQueryKeys: [profilePathKey] },
    }),
    onSuccess: () => {
      profileQuery.refetch();
    },
  });

  useEffect(() => {
    if (profileQuery.data) {
      setFormState({
        name: profileQuery.data.name ?? '',
        email: profileQuery.data.email ?? '',
        phone: profileQuery.data.phone ?? '',
        address: profileQuery.data.address ?? '',
        city: profileQuery.data.city ?? '',
        state: profileQuery.data.state ?? '',
        zipCode: profileQuery.data.zipCode ?? '',
      });
      setPhotoUrl(profileQuery.data.image ?? '');
    }
  }, [profileQuery.data]);

  useEffect(() => {
    return () => {
      if (pendingPhoto) {
        URL.revokeObjectURL(pendingPhoto.preview);
      }
    };
  }, [pendingPhoto]);

  const buildSubmissionPayload = () => {
    const payload = {
      userId,
      name: formState.name,
      phone: formState.phone || undefined,
      address: formState.address || undefined,
      city: formState.city || undefined,
      state: formState.state || undefined,
      zipCode: formState.zipCode || undefined,
    };

    if (pendingPhoto?.file) {
      const formData = new FormData();
      formData.append('payload', JSON.stringify(payload));
      formData.append('image', pendingPhoto.file);
      return formData;
    }

    return payload;
  };

  const handleSave = async () => {
    if (!userId) return;
    try {
      const submission = buildSubmissionPayload();
      const result = await updateProfile.mutateAsync(submission as any);
      if (result?.image) {
        setPhotoUrl(result.image);
      }
      if (pendingPhoto) {
        URL.revokeObjectURL(pendingPhoto.preview);
        setPendingPhoto(null);
      }
      setPhotoError(null);
    } catch (error) {
      setPhotoError(
        error instanceof Error ? error.message : 'Failed to save profile changes'
      );
    }
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!userId) return;
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image file');
      return;
    }

    if (pendingPhoto) {
      URL.revokeObjectURL(pendingPhoto.preview);
    }

    setPhotoError(null);
    const preview = URL.createObjectURL(file);
    setPendingPhoto({ file, preview });
  };

  const currentPhoto = pendingPhoto?.preview || photoUrl;

  if (sessionLoading || profileQuery.isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin" />
        Loading profile…
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-2xl font-semibold text-gray-900">Sign in required</p>
        <p className="max-w-md text-sm text-gray-500">
          You need to be signed in to view and edit your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-gray-400">
            Account
          </p>
          <h1 className="text-3xl font-semibold text-gray-900">Profile</h1>
          <p className="text-sm text-gray-500">
            Keep your contact information and avatar up to date.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={updateProfile.isPending}
          className="self-start sm:self-auto"
        >
          {updateProfile.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save changes'
          )}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Profile photo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative h-48 w-48 overflow-hidden rounded-2xl border border-dashed border-gray-200 bg-gray-50">
              {currentPhoto ? (
                <Image
                  src={currentPhoto}
                  alt="Profile avatar"
                  fill
                  className="object-cover"
                  sizes="192px"
                  unoptimized={!!pendingPhoto}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-gray-400">
                  {formState.name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-gray-700 shadow"
              >
                <Camera className="h-4 w-4" />
                {pendingPhoto ? 'Selected' : 'Change'}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
            {photoError && (
              <p className="text-sm text-red-600">{photoError}</p>
            )}
            {pendingPhoto && (
              <p className="text-xs text-emerald-600">
                Photo will upload when you save changes.
              </p>
            )}
            <p className="text-xs text-gray-500">
              JPG or PNG up to 5 MB. Cropped to a square automatically.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Jane Brown"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={formState.email}
                  disabled
                  className="cursor-not-allowed bg-gray-100 text-gray-500"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formState.phone}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="+1 555 123 4567"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="address">Street address</Label>
                <Input
                  id="address"
                  value={formState.address}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      address: event.target.value,
                    }))
                  }
                  placeholder="215 Market Street"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formState.city}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      city: event.target.value,
                    }))
                  }
                  placeholder="Austin"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formState.state}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      state: event.target.value,
                    }))
                  }
                  placeholder="TX"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="zipCode">Postal code</Label>
                <Input
                  id="zipCode"
                  value={formState.zipCode}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      zipCode: event.target.value,
                    }))
                  }
                  placeholder="73301"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
