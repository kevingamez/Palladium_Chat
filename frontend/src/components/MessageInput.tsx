import { useState } from 'react';
import { YStack, XStack, TextArea } from 'tamagui';
import FileListArea from './FileListArea';
import FileUploadButton from './FileUploadButton';
import SendButton from './SendButton';

export default function MessageInput({
  onSend,
  disabled,
}: {
  onSend: (text: string, files: File[]) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSend(text, files);
      setText('');
      setFiles([]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      <YStack backgroundColor="#f0f0f0" borderRadius={8} width="100%">
        <FileListArea files={files} onRemoveFile={removeFile} formatFileSize={formatFileSize} />
        <YStack position="relative">
          <TextArea
            value={text}
            onChangeText={setText}
            rows={1}
            placeholder="Message Palladium..."
            multiline
            maxHeight={200}
            minHeight={56}
            padding={12}
            borderRadius={8}
            backgroundColor="white"
            onKeyPress={(e: any) => {
              if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />

          <XStack position="absolute" bottom={8} right={8} alignItems="center" gap={8}>
            <FileUploadButton onFilesSelected={(selectedFiles) => setFiles(selectedFiles)} />
            <SendButton disabled={disabled} hasText={text.trim().length > 0} />
          </XStack>
        </YStack>
      </YStack>
    </form>
  );
}
