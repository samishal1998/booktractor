import { View, Text, ActivityIndicator } from 'react-native';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  size = 'large',
  message = 'Loading...',
  fullScreen = false
}: LoadingSpinnerProps) {
  const content = (
    <View className="items-center justify-center p-8">
      <ActivityIndicator size={size} color="#3B82F6" />
      {message && (
        <Text className="text-gray-600 mt-4 text-center">{message}</Text>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        {content}
      </View>
    );
  }

  return content;
}
