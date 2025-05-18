import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Stack, XStack, YStack, Text } from 'tamagui';
import { useState, useEffect } from 'react';

type MessageBubbleProps = {
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
  readonly streaming?: boolean;
  readonly files?: string[];
  readonly maxWidth?: string;
};

function BlinkingCursor() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible((v) => !v);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return <Text opacity={visible ? 1 : 0}>▋</Text>;
}

export default function MessageBubble({
  role,
  content,
  streaming,
  files,
  maxWidth,
}: MessageBubbleProps) {
  if (files?.length) {
    return (
      <YStack width="100%" marginVertical={2} alignItems="center">
        <YStack backgroundColor="rgba(0, 0, 0, 0.1)" borderRadius={8} padding={2} maxWidth="80%">
          <YStack gap={6}>
            {files.map((name, i) => (
              <XStack
                key={i}
                alignItems="center"
                backgroundColor="rgba(0, 0, 0, 0.05)"
                padding={6}
                paddingHorizontal={10}
                borderRadius={4}
              >
                <Text marginRight={8}>📄</Text>
                <Text fontWeight="500" fontSize={14}>
                  {name}
                </Text>
              </XStack>
            ))}
          </YStack>
        </YStack>
      </YStack>
    );
  }

  const isFileUploadMessage =
    content.includes('User uploaded files:') || content.includes('Attached files:');

  if (isFileUploadMessage) {
    const fileNames = content
      .replace(/User uploaded files:|Attached files:/g, '')
      .split(',')
      .map((name) => name.trim());

    return (
      <YStack width="100%" marginVertical={10} alignItems="center">
        <YStack backgroundColor="rgba(0, 0, 0, 0.1)" borderRadius={8} padding={10} maxWidth="80%">
          <YStack gap={6}>
            {fileNames.map((name, i) => (
              <XStack
                key={i + 1}
                alignItems="center"
                backgroundColor="rgba(0, 0, 0, 0.05)"
                padding={6}
                paddingHorizontal={10}
                borderRadius={4}
              >
                <Text marginRight={8}>📄</Text>
                <Text fontWeight="500" fontSize={14}>
                  {name}
                </Text>
              </XStack>
            ))}
          </YStack>
        </YStack>
      </YStack>
    );
  }
  return (
    <YStack
      alignItems={role === 'user' ? 'flex-end' : 'flex-start'}
      backgroundColor={role === 'user' ? '#000000' : 'transparent'}
      borderRadius={12}
      maxWidth={maxWidth}
    >
      <Stack maxWidth={role === 'assistant' ? '70%' : '100%'}>
        <YStack width="100%">
          <Stack
            backgroundColor={role === 'user' ? '#000000' : 'transparent'}
            paddingHorizontal={role === 'user' ? 16 : 0}
            borderRadius={role === 'user' ? 12 : 0}
            paddingVertical={role === 'user' ? 8 : 0}
          >
            <Text
              color={role === 'user' ? 'white' : 'black'}
              fontFamily="$body"
              lineHeight={20}
              fontSize={14}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              {streaming && <BlinkingCursor />}
            </Text>
          </Stack>
        </YStack>
      </Stack>
    </YStack>
  );
}
