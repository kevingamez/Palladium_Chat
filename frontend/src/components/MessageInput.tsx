import { useState } from 'react';
import { YStack, XStack, TextArea, Button, Text, View } from 'tamagui';

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

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      <YStack backgroundColor="#f0f0f0" borderRadius={8} width="100%">
        {files.length > 0 && (
          <YStack padding={8} gap={4} backgroundColor="#e0e0e0" borderRadius={6} marginBottom={8}>
            {files.map((file, index) => (
              <XStack
                key={index}
                justifyContent="space-between"
                alignItems="center"
                backgroundColor="#d0d0d0"
                borderRadius={4}
                padding={6}
              >
                <Text numberOfLines={1} flex={1}>
                  {file.name}
                </Text>
                <Button
                  size="$2"
                  circular
                  onPress={() => removeFile(index)}
                  backgroundColor="transparent"
                >
                  <Text fontSize={16}>×</Text>
                </Button>
              </XStack>
            ))}
          </YStack>
        )}

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
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
            </View>

            <Button
              size="$3"
              backgroundColor="transparent"
              borderRadius={6}
              padding={8}
              // as="label"
              htmlFor="file-upload"
              cursor="pointer"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </Button>

            <Button
              // type="submit"
              disabled={disabled || !text.trim()}
              backgroundColor={disabled || !text.trim() ? '#ccc' : '#3b82f6'}
              color="white"
              size="$3"
              borderRadius={6}
              padding={8}
            >
              <svg
                stroke="currentColor"
                fill="none"
                strokeWidth="2"
                viewBox="0 0 24 24"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="16"
                height="16"
                xmlns="http://www.w3.org/2000/svg"
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </Button>
          </XStack>
        </YStack>
      </YStack>
    </form>
  );
}
