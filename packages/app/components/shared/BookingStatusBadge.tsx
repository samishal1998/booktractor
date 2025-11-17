import { View, Text } from 'react-native';

type BookingStatus =
  | 'pending_renter_approval'
  | 'approved_by_renter'
  | 'rejected_by_renter'
  | 'sent_back_to_client'
  | 'canceled_by_client';

interface BookingStatusBadgeProps {
  status: BookingStatus;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  pending_renter_approval: {
    label: 'Pending Approval',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-200',
  },
  approved_by_renter: {
    label: 'Approved',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-200',
  },
  rejected_by_renter: {
    label: 'Rejected',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-200',
  },
  sent_back_to_client: {
    label: 'Changes Requested',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-200',
  },
  canceled_by_client: {
    label: 'Cancelled',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-200',
  },
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-2 text-base',
};

export function BookingStatusBadge({ status, size = 'md' }: BookingStatusBadgeProps) {
  const config = statusConfig[status];
  const sizeClass = sizeClasses[size];

  return (
    <View
      className={`rounded-full border ${config.bgColor} ${config.borderColor} ${sizeClass}`}
    >
      <Text className={`font-semibold ${config.textColor}`}>
        {config.label}
      </Text>
    </View>
  );
}
