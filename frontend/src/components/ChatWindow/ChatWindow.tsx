import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import MessageBubble from '../MessageBubble/MessageBubble';
import MessageInput from '../MessageInput/MessageInput';
import { XStack, YStack, Text, ScrollView, View } from 'tamagui';
import { uploadFilesChatUploadPost } from '../../api/sdk.gen';

const api = {
  getMessages: async (chatId: string) => {
    try {
      const stored = localStorage.getItem(`chat_${chatId}`);
      if (!stored) return [];

      const data = JSON.parse(stored);
      if (Array.isArray(data)) {
        return data;
      } else if (data && typeof data === 'object' && Array.isArray(data.messages)) {
        return data.messages;
      }
      return [];
    } catch (error) {
      console.error("Error parsing chat data:", error);
      return [];
    }
  },

  sendMessageStream: async ({ chatId, text, files }: { chatId: string; text: string; files?: File[] }) => {
    const simulateStream = async function* () {
      try {
        if (files && files.length > 0) {
          const formData = new FormData();
          formData.append('conversation_id', chatId);
          files.forEach(file => {
            formData.append('files', file);
          });

          await uploadFilesChatUploadPost({
            body: {
              conversation_id: chatId,
              files
            }
          });
        }

        const endpoint = files && files.length > 0
          ? 'http://localhost:8000/chat/stream-with-files'
          : 'http://localhost:8000/chat/stream';

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: chatId,
            content: text
          })
        });

        if (response.ok) {
          const reader = response.body?.getReader();
          if (!reader) throw new Error('No stream available');

          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                yield line.substring(6);
              }
            }
          }
        } else {
          yield 'Error al procesar tu mensaje.';
        }
      } catch (error) {
        console.error('Error en streaming:', error);
        yield 'Error al procesar tu mensaje.';
      }
    };

    return simulateStream();
  }
};

export default function ChatWindow() {
  const [chatId, setChatId] = useState<string>('');
  const qc = useQueryClient();
  const messagesEndRef = useRef<any>(null);

  useEffect(() => {
    try {
      const pathname = window.location.pathname;
      const match = pathname.match(/\/chat\/([^\/]+)/);
      if (match && match[1]) {
        setChatId(match[1]);
      }
    } catch (error) {
      console.error("Error obteniendo chatId:", error);
    }
  }, [window.location.pathname]);

  const { data: messagesData } = useQuery({
    queryKey: ['messages', chatId],
    queryFn: () => api.getMessages(chatId),
    enabled: !!chatId,
  });

  const messages = Array.isArray(messagesData) ? messagesData : [];

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMsg = useMutation({
    mutationFn: ({ text, files }: { text: string, files?: File[] }) => {
      if (!chatId) return Promise.resolve(null);

      const currentMessages = qc.getQueryData(['messages', chatId]) as any[] || [];
      const safeCurrentMessages = Array.isArray(currentMessages) ? currentMessages : [];

      let updatedMessages = [...safeCurrentMessages, { role: 'user', content: text }];
      if (files && files.length > 0) {
        updatedMessages.push({
          role: 'system',
          content: `Archivos adjuntos: ${files.map(f => f.name).join(', ')}`
        });
      }

      localStorage.setItem(`chat_${chatId}`, JSON.stringify(updatedMessages));

      return api.sendMessageStream({ chatId, text, files });
    },
    onMutate: async ({ text }) => {
      await qc.cancelQueries({ queryKey: ['messages', chatId] });
      qc.setQueryData(['messages', chatId], (old: any[] = []) => {
        const safeOld = Array.isArray(old) ? old : [];
        return [
          ...safeOld,
          { role: 'user', content: text },
        ];
      });
    },
    onSuccess: async (stream) => {
      if (!stream) return;

      try {
        let assistantContent = '';
        for await (const chunk of stream) {
          assistantContent += chunk;
          qc.setQueryData(['messages', chatId], (old: any[] = []) => {
            const safeOld = Array.isArray(old) ? old : [];
            const updated = [...safeOld];
            const assistantIdx = updated.findIndex((m) => m.role === 'assistant' && m.streaming);
            if (assistantIdx === -1) {
              updated.push({ role: 'assistant', content: assistantContent, streaming: true });
            } else {
              updated[assistantIdx].content = assistantContent;
            }
            return updated;
          });
        }

        qc.setQueryData(['messages', chatId], (old: any[] = []) => {
          const safeOld = Array.isArray(old) ? old : [];
          const updated = safeOld.map((m) => ({ ...m, streaming: false }));
          localStorage.setItem(`chat_${chatId}`, JSON.stringify(updated));
          return updated;
        });
      } catch (error) {
        console.error('Error procesando stream:', error);
      }
    },
  });

  if (!chatId) {
    return (
      <YStack fullscreen backgroundColor="#121212" justifyContent="center" alignItems="center" padding={20}>
        <Text color="#aaa" fontSize={18} textAlign="center">
          Selecciona un chat existente o crea uno nuevo para comenzar a conversar.
        </Text>
      </YStack>
    );
  }

  return (
    <YStack fullscreen backgroundColor="#121212">
      <YStack flex={1} paddingTop={16} paddingHorizontal={16}>
        <ScrollView flex={1} contentContainerStyle={{ flexGrow: 1 }}>
          {messages.length === 0 ? (
            <YStack flex={1} justifyContent="center" alignItems="center" gap={20}>
              <Text fontSize={24} fontWeight="bold" color="white" marginBottom={20}>
                ¿Cómo puedo ayudarte hoy?
              </Text>

              <XStack flexWrap="wrap" gap={16} justifyContent="center">
                <YStack backgroundColor="#333" paddingVertical={16} paddingHorizontal={20} borderRadius={8} width={250}>
                  <Text fontSize={18} fontWeight="bold" color="#ddd" marginBottom={8}>
                    Pregúntame sobre...
                  </Text>
                  <Text color="#aaa">
                    cualquier tema que necesites investigar
                  </Text>
                </YStack>

                <YStack backgroundColor="#333" paddingVertical={16} paddingHorizontal={20} borderRadius={8} width={250}>
                  <Text fontSize={18} fontWeight="bold" color="#ddd" marginBottom={8}>
                    Ayúdame a...
                  </Text>
                  <Text color="#aaa">
                    resolver problemas o generar ideas
                  </Text>
                </YStack>
              </XStack>
            </YStack>
          ) : (
            <YStack gap={16}>
              {messages.map((message: any, i: number) => (
                <MessageBubble
                  key={i}
                  {...message}
                  files={message.role === 'system' && message.content.startsWith('Archivos adjuntos:')
                    ? message.content.replace('Archivos adjuntos:', '').split(',').map((f: string) => f.trim())
                    : undefined}
                />
              ))}
              <View ref={messagesEndRef} />
            </YStack>
          )}
        </ScrollView>
      </YStack>

      <YStack paddingHorizontal={16} paddingBottom={16} paddingTop={8} borderTopWidth={1} borderColor="#333">
        <MessageInput
          onSend={(text, files) => sendMsg.mutate({ text, files })}
          disabled={sendMsg.isPending}
        />
      </YStack>
    </YStack>
  );
}
