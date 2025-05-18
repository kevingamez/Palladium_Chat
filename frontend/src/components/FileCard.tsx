import { XStack, YStack, Button, Text } from 'tamagui';
import FileIcon from './FileIcon';

interface FileCardProps {
  file: File;
  index: number;
  onRemove: (index: number) => void;
  formatFileSize: (bytes: number) => string;
}

export default function FileCard({ file, index, onRemove, formatFileSize }: FileCardProps) {
  return (
    <XStack
      alignItems="center"
      backgroundColor="white"
      borderRadius={12}
      padding={12}
      gap={12}
      borderWidth={1}
      borderColor="#e0e0e0"
    >
      <FileIcon filename={file.name} />
      <YStack flex={1}>
        <Text fontWeight="500" fontSize={18} numberOfLines={1}>
          {file.name}
        </Text>
        <Text color="#666" fontSize={14}>
          {formatFileSize(file.size)}
        </Text>
      </YStack>
      <Button size="$2" circular onPress={() => onRemove(index)} backgroundColor="transparent">
        <Text fontSize={16}>×</Text>
      </Button>
    </XStack>
  );
}
