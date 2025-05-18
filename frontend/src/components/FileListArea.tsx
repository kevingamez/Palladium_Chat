import { YStack } from 'tamagui';
import FileCard from './FileCard';

interface FileListAreaProps {
  files: File[];
  onRemoveFile: (index: number) => void;
  formatFileSize: (bytes: number) => string;
}

export default function FileListArea({ files, onRemoveFile, formatFileSize }: FileListAreaProps) {
  if (files.length === 0) return null;

  return (
    <YStack padding={8} gap={10} backgroundColor="#f5f5f5" borderRadius={6} marginBottom={8}>
      {files.map((file, index) => (
        <FileCard
          key={index}
          file={file}
          index={index}
          onRemove={onRemoveFile}
          formatFileSize={formatFileSize}
        />
      ))}
    </YStack>
  );
}
