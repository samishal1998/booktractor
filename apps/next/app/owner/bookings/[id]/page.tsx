'use client';

import { useTRPC, useTRPCClient } from '@booktractor/app/lib/trpc';
import { useSession } from '@booktractor/app/lib/auth-client';
import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { putFileToSignedUrl } from '@/lib/upload';
import { Loader2, Paperclip, X } from 'lucide-react';

type UploadedAttachment = {
  url: string;
  name: string;
  contentType: string;
  size: number;
};

const paymentStatusMap = {
  pending: {
    label: 'Awaiting payment',
    badge: 'bg-yellow-100 text-yellow-800',
    helper: 'Client must submit payment before dispatch.',
  },
  completed: {
    label: 'Paid',
    badge: 'bg-green-100 text-green-800',
    helper: 'Funds captured. You can begin preparing the hand-off.',
  },
  failed: {
    label: 'Payment failed',
    badge: 'bg-red-100 text-red-700',
    helper: 'Client should retry or provide another payment method.',
  },
  refunded: {
    label: 'Refunded',
    badge: 'bg-gray-100 text-gray-700',
    helper: 'Payment was refunded to the client.',
  },
};
type OwnerPaymentStatus = keyof typeof paymentStatusMap;

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();
  const ownerId = session?.user?.id || '';
  const bookingId = params?.id as string;
  const trpc = useTRPC();
  const client = useTRPCClient();
  const [message, setMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<UploadedAttachment[]>([]);
  const [attachmentsUploading, setAttachmentsUploading] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const { data: bookings, refetch, isLoading } = useQuery({
    ...trpc.owner.bookings.listAll.queryOptions({
      ownerId,
    }),
    enabled: !!ownerId,
  });

  const bookingList = (bookings ?? []) as Array<any>;
  const booking = bookingList.find((b: any) => b.id === bookingId);

  const ownerBookingsPathKey = trpc.owner.bookings.listAll.pathKey;
  const ownerMachineBookingsPathKey = trpc.owner.bookings.listByMachine.pathKey;
  const clientBookingsDetailPathKey = trpc.client.bookings.getById.pathKey;
  const clientBookingsPathKey = trpc.client.bookings.myBookings.pathKey;
  const sharedBookingInvalidations = [
    ownerBookingsPathKey,
    ownerMachineBookingsPathKey,
    clientBookingsDetailPathKey,
    clientBookingsPathKey,
  ];

  const approveMutation = useMutation({
    ...trpc.owner.bookings.approve.mutationOptions({
      meta: { invalidateQueryKeys: sharedBookingInvalidations },
    }),
    onSuccess: () => {
      refetch();
    },
  });

  const rejectMutation = useMutation({
    ...trpc.owner.bookings.reject.mutationOptions({
      meta: { invalidateQueryKeys: sharedBookingInvalidations },
    }),
    onSuccess: () => {
      refetch();
    },
  });

  const sendBackMutation = useMutation({
    ...trpc.owner.bookings.sendBack.mutationOptions({
      meta: { invalidateQueryKeys: sharedBookingInvalidations },
    }),
    onSuccess: () => {
      refetch();
    },
  });

  const messageMutation = useMutation({
    ...trpc.owner.bookings.sendMessage.mutationOptions({
      meta: { invalidateQueryKeys: sharedBookingInvalidations },
    }),
    onSuccess: () => {
      setMessage('');
      refetch();
    },
  });

  if (isSessionPending) {
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
            Sign in with an owner account to view booking details.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading booking...</p>
        </div>
      </div>
    );
  }

  if (!bookings) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">Booking not found</p>
          <Link
            href="/owner/bookings"
            className="text-blue-600 hover:underline mt-2 inline-block"
          >
            Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  const handleApprove = async () => {
    if (confirm('Are you sure you want to approve this booking?')) {
      await approveMutation.mutateAsync({
        ownerId,
        bookingId,
        newStatus: 'approved_by_renter',
      });
    }
  };

  const handleReject = async () => {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      await rejectMutation.mutateAsync({
        ownerId,
        bookingId,
        newStatus: 'rejected_by_renter',
        message: reason,
      });
    }
  };

  const handleSendBack = async () => {
    const reason = prompt('Please explain what needs to be changed:');
    if (reason) {
      await sendBackMutation.mutateAsync({
        ownerId,
        bookingId,
        newStatus: 'sent_back_to_client',
        message: reason,
      });
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSendingMessage(true);
    try {
      await messageMutation.mutateAsync({
        ownerId,
        bookingId,
        content: message.trim(),
        attachments: pendingAttachments.length ? pendingAttachments : undefined,
      });
      setPendingAttachments([]);
      setAttachmentError(null);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_renter_approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved_by_renter':
        return 'bg-green-100 text-green-800';
      case 'sent_back_to_client':
        return 'bg-blue-100 text-blue-800';
      case 'rejected_by_renter':
        return 'bg-red-100 text-red-800';
      case 'canceled_by_client':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (size?: number) => {
    if (!size) return '';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAttachmentSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
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
        const { uploadUrl, publicUrl } = await client.storage.getUploadUrl.mutate({
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
        error instanceof Error ? error.message : 'Failed to upload attachments'
      );
    } finally {
      setAttachmentsUploading(false);
    }
  };

  const handleRemoveAttachment = (url: string) => {
    setPendingAttachments((prev) => prev.filter((file) => file.url !== url));
  };

  const canApprove = booking.status === 'pending_renter_approval';
  const canReject = booking.status === 'pending_renter_approval';
  const canSendBack = booking.status === 'pending_renter_approval';
  const bookingPaymentStatus = resolvePaymentStatus(booking.paymentStatus);
  const totalEstimateCents = calculateEstimateCents(
    booking.startTime,
    booking.endTime,
    booking.pricePerHour
  );
  const paymentAmountCents = booking.paymentAmountCents ?? totalEstimateCents;
  const paymentCurrency = booking.paymentCurrency ?? 'USD';
  const paymentMeta = paymentStatusMap[bookingPaymentStatus];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Link href="/owner/bookings" className="hover:text-blue-600">
            Bookings
          </Link>
          <span>/</span>
          <span className="text-gray-900">#{bookingId.slice(0, 8)}</span>
        </div>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Booking #{bookingId.slice(0, 8)}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  booking.status
                )}`}
              >
                {booking.status}
              </span>
              <span className="text-gray-600">
                Created {new Date(booking.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            {canApprove && (
              <button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {approveMutation.isPending ? 'Approving...' : 'Approve'}
              </button>
            )}

            {canSendBack && (
              <button
                onClick={handleSendBack}
                disabled={sendBackMutation.isPending}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition disabled:opacity-50"
              >
                {sendBackMutation.isPending ? 'Sending...' : 'Send Back'}
              </button>
            )}

            {canReject && (
              <button
                onClick={handleReject}
                disabled={rejectMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Booking Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Booking Details
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Start Date
                  </label>
                  <p className="text-gray-900 mt-1">
                    {new Date(booking.startTime).toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    End Date
                  </label>
                  <p className="text-gray-900 mt-1">
                    {new Date(booking.endTime).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
              <label className="text-sm font-medium text-gray-500">
                Equipment
              </label>
              <Link
                href={`/owner/machines/${booking.templateId}`}
                className="text-blue-600 hover:text-blue-800 mt-1 block"
              >
                View Equipment Details
              </Link>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                Assigned Unit
              </label>
              <p className="text-gray-900 mt-1">
                {booking.instanceCode
                  ? `Instance ${booking.instanceCode}`
                  : booking.machineInstanceId
                    ? `Instance ${booking.machineInstanceId.slice(0, 8)}`
                    : 'Not assigned'}
              </p>
            </div>
            </div>
          </div>

          {/* Messages/Communication */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Communication
            </h2>

            {booking.messages && booking.messages.length > 0 ? (
              <div className="space-y-4 mb-6">
                {booking.messages.map((msg: any, idx: number) => {
                  const isOwnerMessage = msg.sender_id === ownerId;
                  return (
                    <div
                      key={`${msg.sender_id}-${idx}`}
                      className={`p-4 rounded-lg ${
                        isOwnerMessage ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-900">
                          {isOwnerMessage ? 'You' : booking.clientName ?? 'Client'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.ts).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700">{msg.content}</p>
                      {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {msg.attachments.map((file: any) => (
                            <a
                              key={file.url}
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 transition hover:border-blue-300 hover:text-blue-600"
                            >
                              <Paperclip className="h-3 w-3" />
                              <span className="font-medium">{file.name}</span>
                              <span className="text-gray-400">
                                {formatFileSize(file.size)}
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4 mb-6">
                No messages yet
              </p>
            )}

            {/* Send Message Form */}
            <form onSubmit={handleSendMessage} className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Send a message to the client
              </label>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => attachmentInputRef.current?.click()}
                  disabled={attachmentsUploading}
                >
                  {attachmentsUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <Paperclip className="mr-2 h-4 w-4" />
                      Attach files
                    </>
                  )}
                </Button>
                <input
                  ref={attachmentInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  multiple
                  className="hidden"
                  onChange={handleAttachmentSelect}
                />
                <span className="text-xs text-gray-500">
                  Up to 5 attachments per message.
                </span>
              </div>
              {pendingAttachments.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {pendingAttachments.map((file) => (
                    <span
                      key={file.url}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700"
                    >
                      <Paperclip className="h-3 w-3" />
                      <span>{file.name}</span>
                      <span className="text-gray-400">
                        {formatFileSize(file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(file.url)}
                        className="text-gray-400 transition hover:text-red-500"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {attachmentError && (
                <p className="mb-3 text-sm text-red-600">{attachmentError}</p>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Button
                  type="submit"
                  disabled={!message.trim() || isSendingMessage || attachmentsUploading}
                >
                  {isSendingMessage ? 'Sending…' : 'Send'}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Payment</h3>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentMeta.badge}`}>
                {paymentMeta.label}
              </span>
            </div>

            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Amount</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(paymentAmountCents, paymentCurrency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Hourly rate</span>
                <span className="text-gray-900">
                  {booking.pricePerHour ? formatCurrency(booking.pricePerHour, paymentCurrency, true) : 'Not set'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Estimate (hrs)</span>
                <span className="text-gray-900">
                  {booking.pricePerHour ? formatCurrency(totalEstimateCents, paymentCurrency) : 'N/A'}
                </span>
              </div>
              <p className="text-xs text-gray-500">{paymentMeta.helper}</p>
              {booking.paymentExternalId && (
                <p className="text-xs text-gray-500">
                  Stripe intent:{' '}
                  <code className="rounded bg-gray-100 px-1 py-0.5 text-gray-700">
                    {booking.paymentExternalId}
                  </code>
                </p>
              )}
              {booking.paymentCreatedAt && (
                <p className="text-xs text-gray-400">
                  Updated {new Date(booking.paymentCreatedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Client Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Client Information</h3>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Client ID
                </label>
                <p className="text-gray-900 mt-1">
                  {booking.clientAccountId.slice(0, 16)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  Contact
                </label>
                <p className="text-gray-900 mt-1">
                  {booking.clientEmail || 'No email provided'}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Timeline</h3>

            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-xs text-gray-500">
                    {new Date(booking.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {booking.updatedAt && (
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-gray-400"></div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      Last Updated
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(booking.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function resolvePaymentStatus(status?: string): OwnerPaymentStatus {
  if (!status) return 'pending';
  return status in paymentStatusMap ? (status as OwnerPaymentStatus) : 'pending';
}

function calculateEstimateCents(
  start: string | Date,
  end: string | Date,
  pricePerHour?: number | null
) {
  if (!pricePerHour) return 0;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime <= startTime) {
    return pricePerHour;
  }
  const hours = Math.max(1, (endTime - startTime) / (1000 * 60 * 60));
  return Math.ceil(hours * pricePerHour);
}

function formatCurrency(value?: number | null, currency = 'USD', perHour = false) {
  if (value === null || value === undefined) return '—';
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });
  const formatted = formatter.format(value / 100);
  return perHour ? `${formatted}/hr` : formatted;
}
