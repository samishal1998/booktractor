import { Text, View } from 'react-native';

interface PriceDisplayProps {
  priceInCents: number;
  period?: 'hour' | 'day' | 'total';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function PriceDisplay({
  priceInCents,
  period = 'hour',
  size = 'md',
  showLabel = true
}: PriceDisplayProps) {
  const dollars = (priceInCents / 100).toFixed(2);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  const periodLabels = {
    hour: '/hr',
    day: '/day',
    total: 'total',
  };

  return (
    <View className="flex-row items-baseline">
      <Text className={`font-bold text-gray-900 ${sizeClasses[size]}`}>
        ${dollars}
      </Text>
      {showLabel && (
        <Text className={`text-gray-600 ml-1 ${
          size === 'lg' ? 'text-base' : size === 'md' ? 'text-sm' : 'text-xs'
        }`}>
          {periodLabels[period]}
        </Text>
      )}
    </View>
  );
}
