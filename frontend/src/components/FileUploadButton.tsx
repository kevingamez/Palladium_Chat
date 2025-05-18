import { Button, View } from 'tamagui';
import { Upload } from '@tamagui/lucide-icons';

interface FileUploadButtonProps {
  onFilesSelected: (files: File[]) => void;
}

export default function FileUploadButton({ onFilesSelected }: FileUploadButtonProps) {
  return (
    <>
      <View opacity={0} width={0} height={0} position="absolute">
        <input
          type="file"
          multiple
          id="file-upload"
          style={{
            position: 'absolute',
            opacity: 0,
            width: '100%',
            height: '100%',
            cursor: 'pointer',
          }}
          onChange={(e) => onFilesSelected(Array.from(e.target.files || []))}
        />
      </View>

      <Button
        size="$3"
        backgroundColor="transparent"
        borderRadius={6}
        padding={8}
        htmlFor="file-upload"
        onPress={() => {
          document.getElementById('file-upload')?.click();
        }}
        cursor="pointer"
      >
        <Upload size={16} color="currentColor" />
      </Button>
    </>
  );
}
