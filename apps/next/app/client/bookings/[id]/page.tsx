'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from '@booktractor/app/lib/auth-client';
import { useTRPC, useTRPCClient } from '@booktractor/app/lib/trpc';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Calendar, CreditCard, MapPin, Paperclip, X } from 'lucide-react';
import { stripePromise } from '@/lib/stripe';
import { putFileToSignedUrl } from '@/lib/upload';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value / 100);

export default function ClientBookingDetailPage() {
  const params = useParams();
  const bookingId = params?.id as string | undefined;
  const { data: session } = useSession();
  const clientId = session?.user?.id || '';
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const [message, setMessage] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [paymentInitError, setPaymentInitError] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<UploadedAttachment[]>([]);
  const [attachmentsUploading, setAttachmentsUploading] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const clientBookingDetailPathKey = trpc.client.bookings.getById.pathKey;
  const clientBookingsPathKey = trpc.client.bookings.myBookings.pathKey;
  const ownerBookingsPathKey = trpc.owner.bookings.listAll.pathKey;
  const ownerMachineBookingsPathKey = trpc.owner.bookings.listByMachine.pathKey;
  const sharedClientBookingInvalidations = [
    clientBookingDetailPathKey,
    clientBookingsPathKey,
    ownerBookingsPathKey,
    ownerMachineBookingsPathKey,
  ];

  const detailQuery = useQuery({
    ...trpc.client.bookings.getById.queryOptions({
      id: bookingId ?? '',
      clientId,
    }),
    enabled: !!bookingId && !!clientId,
    refetchInterval: 3000,
    refetchOnReconnect: true,
  });

  const booking = detailQuery.data;

  const sendMessageMutation = useMutation({
    ...trpc.client.bookings.sendMessage.mutationOptions({
      meta: { invalidateQueryKeys: sharedClientBookingInvalidations },
    }),
    onSuccess: () => {
      setMessage('');
      detailQuery.refetch();
    },
  });

  const cancelMutation = useMutation({
    ...trpc.client.bookings.cancel.mutationOptions({
      meta: { invalidateQueryKeys: sharedClientBookingInvalidations },
    }),
    onSuccess: () => {
      setCancelReason('');
      detailQuery.refetch();
    },
  });

  const createIntentMutation = useMutation({
    ...trpc.client.payments.createIntent.mutationOptions({
      meta: { invalidateQueryKeys: [clientBookingDetailPathKey] },
    }),
  });

  const confirmPaymentMutation = useMutation({
    ...trpc.client.payments.confirmPayment.mutationOptions({
      meta: { invalidateQueryKeys: sharedClientBookingInvalidations },
    }),
    onSuccess: () => {
      detailQuery.refetch();
      setPaymentClientSecret(null);
    },
  });

  const initializePaymentIntent = useCallback(async () => {
    if (!bookingId || !clientId) {
      return;
    }

    try {
      setPaymentInitError(null);
      const intent = await createIntentMutation.mutateAsync({
        bookingId,
        clientId,
      });

      if (intent?.clientSecret) {
        setPaymentClientSecret(intent.clientSecret);
      } else {
        setPaymentInitError('Stripe client secret was not returned.');
      }
    } catch (error) {
      setPaymentInitError(
        error instanceof Error ? error.message : 'Failed to initialize payment'
      );
    }
  }, [bookingId, clientId, createIntentMutation]);

  const handleAttachmentSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length || !bookingId) return;
    const files = Array.from(event.target.files);
    event.target.value = '';
    const remainingSlots = Math.max(0, 5 - pendingAttachments.length);
    if (!remainingSlots) {
      setAttachmentError('You can attach up to 5 files per message.');
      return;
    }
    try {
      setAttachmentError(null);
      setAttachmentsUploading(true);
      const uploads: UploadedAttachment[] = [];
      for (const file of files.slice(0, remainingSlots)) {
        const contentType = file.type || 'application/octet-stream';
        const { uploadUrl, publicUrl } = await trpcClient.storage.getUploadUrl.mutate({
          entity: 'message',
          entityId: bookingId,
          contentType,
        });
        await putFileToSignedUrl({ uploadUrl, file, contentType });
        uploads.push({
          url: publicUrl,
          name: file.name,
          contentType,
          size: file.size,
        });
      }
      setPendingAttachments((prev) => [...prev, ...uploads]);
    } catch (error) {
      setAttachmentError(
        error instanceof Error ? error.message : 'Failed to upload attachments. Please retry.'
      );
    } finally {
      setAttachmentsUploading(false);
    }
  };

  const handleRemoveAttachment = (url: string) => {
    setPendingAttachments((prev) => prev.filter((file) => file.url !== url));
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if ((!message.trim() && pendingAttachments.length === 0) || !bookingId) return;
    await sendMessageMutation.mutateAsync({
      bookingId,
      content: message.trim(),
      clientId,
      attachments: pendingAttachments.length ? pendingAttachments : undefined,
    });
  };

  const handleCancel = async () => {
    if (!bookingId) return;
    await cancelMutation.mutateAsync({
      bookingId,
      clientId,
      reason: cancelReason || undefined,
    });
  };

  const canPay =
    booking &&
    booking.status === 'approved_by_renter' &&
    booking.paymentStatus !== 'completed';

  useEffect(() => {
    if (
      !canPay ||
      paymentClientSecret ||
      !bookingId ||
      !clientId ||
      paymentInitError ||
      createIntentMutation.isPending
    ) {
      return;
    }

    void initializePaymentIntent();
  }, [
    canPay,
    paymentClientSecret,
    bookingId,
    clientId,
    paymentInitError,
    createIntentMutation.isPending,
    initializePaymentIntent,
  ]);

  const statusBadge = useMemo(() => {
    if (!booking) return { label: 'Loading', variant: 'outline' as const };
    switch (booking.status) {
      case 'pending_renter_approval':
        return { label: 'Pending approval', variant: 'warning' as const };
      case 'approved_by_renter':
        return { label: 'Approved', variant: 'success' as const };
      case 'sent_back_to_client':
        return { label: 'Needs updates', variant: 'secondary' as const };
      case 'rejected_by_renter':
        return { label: 'Rejected', variant: 'outline' as const };
      case 'canceled_by_client':
      default:
        return { label: booking.status.replace(/_/g, ' '), variant: 'outline' as const };
    }
  }, [booking]);

  const paymentStatusMeta = {
    pending: {
      label: 'Awaiting payment',
      variant: 'warning' as const,
      helper: 'Balance is due before the booking can be dispatched.',
    },
    completed: {
      label: 'Paid',
      variant: 'success' as const,
      helper: 'Payment received. We will email a receipt shortly.',
    },
    failed: {
      label: 'Payment failed',
      variant: 'warning' as const,
      helper: 'Please retry or contact support to confirm payment.',
    },
    refunded: {
      label: 'Refunded',
      variant: 'secondary' as const,
      helper: 'The payment was refunded to your original method.',
    },
  };
  const paymentStatusKeys = ['pending', 'completed', 'failed', 'refunded'] as const;
  type PaymentStatusKey = (typeof paymentStatusKeys)[number];
  const resolvePaymentStatus = (status?: string): PaymentStatusKey =>
    status && paymentStatusKeys.includes(status as PaymentStatusKey)
      ? (status as PaymentStatusKey)
      : 'pending';

  if (detailQuery.isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-gray-500">
        <Loader2 className="mb-3 h-6 w-6 animate-spin" />
        Loading booking…
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-gray-500">
        <p className="text-sm">Booking not found.</p>
      </div>
    );
  }

  const bookingPaymentStatus = resolvePaymentStatus(booking.paymentStatus);

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-emerald-600">Booking detail</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold text-slate-900">
            {booking.machine.name}
          </h1>
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        </div>
        <p className="text-sm text-slate-500">
          Instance {booking.instanceCode} — Owner {booking.owner.name}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Schedule & billing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Calendar className="h-5 w-5 text-slate-400" />
              {new Date(booking.startTime).toLocaleString()} —{' '}
              {new Date(booking.endTime).toLocaleString()}
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <MapPin className="h-5 w-5 text-slate-400" />
              {booking.machine?.name} | Template {booking.machine.code}
            </div>
            <div className="rounded-lg border border-slate-200 p-3 flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Hourly rate</span>
                <span>{formatCurrency(booking.machine.pricePerHour ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                <span>Total estimate</span>
                <span>{formatCurrency(booking.totalPrice)}</span>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Booking ID</p>
                <p className="font-mono text-sm text-slate-600">{booking.id.slice(0, 10)}…</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Payment status</p>
                <Badge variant={paymentStatusMeta[bookingPaymentStatus]?.variant}>
                  {paymentStatusMeta[bookingPaymentStatus]?.label}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Payment</CardTitle>
              <Badge variant={paymentStatusMeta[bookingPaymentStatus]?.variant}>
                {paymentStatusMeta[bookingPaymentStatus]?.label}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <CreditCard className="h-4 w-4" />
                  Amount due
                </div>
                <span className="text-base font-semibold text-slate-900">
                  {formatCurrency(booking.totalPrice)}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {paymentStatusMeta[bookingPaymentStatus]?.helper}
              </p>
              {canPay && (
                <div className="space-y-3">
                  {paymentInitError && (
                    <p className="text-xs text-red-500">{paymentInitError}</p>
                  )}
                  {!stripePromise ? (
                    handleMissingStripeConfig()
                  ) : paymentClientSecret ? (
                    <Elements
                      stripe={stripePromise}
                      options={{
                        clientSecret: paymentClientSecret,
                        appearance: {
                          theme: 'stripe',
                        },
                      }}
                      key={paymentClientSecret}
                    >
                      <StripePaymentForm
                        onPaymentConfirmed={async (intentId) => {
                          const result = await confirmPaymentMutation.mutateAsync({
                            paymentIntentId: intentId,
                            clientId,
                          });
                          if (result.success) {
                            detailQuery.refetch();
                            setPaymentClientSecret(null);
                          }
                        }}
                        confirmLoading={confirmPaymentMutation.isPending}
                      />
                    </Elements>
                  ) : (
                    <div className="rounded-md border border-dashed border-slate-200 p-3 text-xs text-slate-500">
                      {createIntentMutation.isPending ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Initializing payment details…
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p>Payment fields failed to load. Please retry.</p>
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => {
                              setPaymentClientSecret(null);
                              setPaymentInitError(null);
                              void initializePaymentIntent();
                            }}
                          >
                            Try again
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Reason for cancellation (optional)"
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
              />
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? 'Cancelling…' : 'Cancel booking'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {(booking.messages ?? []).map((msg) => (
              <div
                key={`${msg.sender_id}-${msg.ts}`}
                className={`rounded-lg border p-3 ${
                  msg.sender_id === clientId ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200'
                }`}
              >
                <div className="text-xs text-slate-500 flex items-center justify-between">
                  <span>{msg.sender_id === clientId ? 'You' : booking.owner.name}</span>
                  <span>{new Date(msg.ts).toLocaleString()}</span>
                </div>
                {msg.content && <p className="text-sm text-slate-700">{msg.content}</p>}
                {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {msg.attachments.map((file: UploadedAttachment) => (
                      <a
                        key={file.url}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 transition hover:border-emerald-300 hover:text-emerald-600"
                      >
                        <Paperclip className="h-3 w-3" />
                        <span className="truncate max-w-[160px]">{file.name ?? 'Attachment'}</span>
                        {file.size ? (
                          <span className="text-slate-400">{formatFileSize(file.size)}</span>
                        ) : null}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {(booking.messages ?? []).length === 0 && (
              <p className="text-sm text-slate-500">No messages yet.</p>
            )}
          </div>
          <form onSubmit={handleSendMessage} className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => attachmentInputRef.current?.click()}
                disabled={attachmentsUploading || pendingAttachments.length >= 5}
                className="flex items-center gap-2"
              >
                <Paperclip className="h-4 w-4" />
                {attachmentsUploading ? 'Uploading…' : 'Add attachment'}
              </Button>
              <input
                ref={attachmentInputRef}
                type="file"
                multiple
                onChange={handleAttachmentSelect}
                className="hidden"
              />
              {attachmentError && <p className="text-xs text-red-500">{attachmentError}</p>}
              {pendingAttachments.length > 0 && (
                <p className="text-xs text-slate-500">
                  {pendingAttachments.length}/5 file{pendingAttachments.length === 1 ? '' : 's'} ready to send
                </p>
              )}
            </div>
            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 rounded-md border border-slate-200 p-2 text-xs text-slate-600">
                {pendingAttachments.map((file) => (
                  <div
                    key={file.url}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1"
                  >
                    <span className="max-w-[140px] truncate">{file.name}</span>
                    <span className="text-slate-400">{formatFileSize(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(file.url)}
                      className="text-slate-500 hover:text-slate-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Send a message to the owner"
              rows={3}
            />
            <Button
              type="submit"
              disabled={
                sendMessageMutation.isPending ||
                attachmentsUploading ||
                (!message.trim() && pendingAttachments.length === 0)
              }
            >
              {sendMessageMutation.isPending ? 'Sending…' : 'Send message'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

type UploadedAttachment = {
  url: string;
  name: string;
  contentType: string;
  size?: number;
};

function StripePaymentForm({
  onPaymentConfirmed,
  confirmLoading,
}: {
  onPaymentConfirmed: (paymentIntentId: string) => Promise<void>;
  confirmLoading: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elementReady, setElementReady] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required',
    });

    if (result.error) {
      setErrorMessage(result.error.message ?? 'Payment failed. Please try again.');
      setSubmitting(false);
      return;
    }

    const intent = result.paymentIntent;

    if (!intent) {
      setErrorMessage('Payment intent missing from Stripe response.');
      setSubmitting(false);
      return;
    }

    await onPaymentConfirmed(intent.id);
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement onReady={() => setElementReady(true)} />
      {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || !elements || submitting || confirmLoading || !elementReady}
      >
        {submitting || confirmLoading ? 'Processing…' : 'Pay with card'}
      </Button>
    </form>
  );
}

function formatFileSize(size?: number) {
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function handleMissingStripeConfig() {
  return (
    <div className="rounded-md border border-dashed border-red-200 p-3 text-xs text-red-600">
      Stripe publishable key is not configured. Set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to enable
      card payments.
    </div>
  );
}


