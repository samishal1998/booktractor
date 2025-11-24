import { View, Text, Image, Pressable } from 'react-native';
import { useRouter } from 'solito/navigation';

interface MachineCardProps {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  pricePerHour?: number | null;
  availableCount?: number;
  imageUrl?: string;
  onPress?: () => void;
}

export function MachineCard({
  id,
  name,
  code,
  description,
  pricePerHour,
  availableCount = 0,
  imageUrl,
  onPress,
}: MachineCardProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/machines/${id}`);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-4"
    >
      {/* Machine Image */}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          className="w-full h-48 bg-gray-200"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-48 bg-gray-200 items-center justify-center">
          <Text className="text-gray-400 text-lg">📷</Text>
          <Text className="text-gray-400 text-sm mt-2">No Image</Text>
        </View>
      )}

      {/* Machine Info */}
      <View className="p-4">
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>
              {name}
            </Text>
            <Text className="text-sm text-gray-500 mt-1">{code}</Text>
          </View>

          {pricePerHour !== null && pricePerHour !== undefined && (
            <View className="bg-blue-50 px-3 py-1 rounded-full">
              <Text className="text-blue-700 font-semibold">
                ${(pricePerHour / 100).toFixed(2)}/hr
              </Text>
            </View>
          )}
        </View>

        {description && (
          <Text className="text-gray-600 text-sm mb-3" numberOfLines={2}>
            {description}
          </Text>
        )}

        {/* Availability Badge */}
        <View className="flex-row items-center">
          <View
            className={`w-2 h-2 rounded-full mr-2 ${
              availableCount > 0 ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <Text className={`text-sm font-medium ${
            availableCount > 0 ? 'text-green-700' : 'text-red-700'
          }`}>
            {availableCount > 0
              ? `${availableCount} unit${availableCount > 1 ? 's' : ''} available`
              : 'Not available'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
