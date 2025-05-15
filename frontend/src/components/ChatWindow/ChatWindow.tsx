import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import MessageBubble from '../MessageBubble/MessageBubble';
import MessageInput from '../MessageInput/MessageInput';
import './ChatWindow.css';

const api = {
  getMessages: async (chatId: string) => {
    const stored = localStorage.getItem(`chat_${chatId}`);
    return stored ? JSON.parse(stored) : [];
  },

  sendMessageStream: async ({ chatId, text }: { chatId: string; text: string }) => {
    const simulateStream = async function* () {
      try {
        const response = await fetch('http://localhost:8000/chat/stream', {
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
          // Respuesta fallback para desarrollo
          const words = "Esta es una respuesta simulada para el clon de ChatGPT. En producción, conectaría con tu backend real para obtener respuestas generadas por IA.".split(' ');
          for (const word of words) {
            yield word + ' ';
            await new Promise(r => setTimeout(r, 100));
          }
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Obtener chatId de manera segura
  useEffect(() => {
    try {
      // Intentar obtener de la URL
      const pathname = window.location.pathname;
      const match = pathname.match(/\/chat\/([^\/]+)/);
      if (match && match[1]) {
        setChatId(match[1]);
      }
    } catch (error) {
      console.error("Error obteniendo chatId:", error);
    }
  }, [window.location.pathname]);

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', chatId],
    queryFn: () => api.getMessages(chatId),
    enabled: !!chatId,
  });

  // Auto-scroll cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Enviar mensaje (y recibir respuesta en streaming)
  const sendMsg = useMutation({
    mutationFn: ({ text }: { text: string }) => {
      // Solo proceder si hay un chatId válido
      if (!chatId) return Promise.resolve(null);

      const currentMessages = qc.getQueryData(['messages', chatId]) as any[] || [];
      const updatedMessages = [...currentMessages, { role: 'user', content: text }];
      localStorage.setItem(`chat_${chatId}`, JSON.stringify(updatedMessages));

      return api.sendMessageStream({ chatId, text });
    },
    onMutate: async ({ text }) => {
      await qc.cancelQueries({ queryKey: ['messages', chatId] });
      qc.setQueryData(['messages', chatId], (old: any[] = []) => [
        ...old,
        { role: 'user', content: text },
      ]);
    },
    onSuccess: async (stream) => {
      if (!stream) return;

      // Leer stream y actualizar mensajes
      try {
        let assistantContent = '';
        for await (const chunk of stream) {
          assistantContent += chunk;
          qc.setQueryData(['messages', chatId], (old: any[] = []) => {
            const updated = [...old];
            const assistantIdx = updated.findIndex((m) => m.role === 'assistant' && m.streaming);
            if (assistantIdx === -1) {
              updated.push({ role: 'assistant', content: assistantContent, streaming: true });
            } else {
              updated[assistantIdx].content = assistantContent;
            }
            return updated;
          });
        }

        // Finalizar streaming y guardar
        qc.setQueryData(['messages', chatId], (old: any[] = []) => {
          const updated = old.map((m) => ({ ...m, streaming: false }));
          localStorage.setItem(`chat_${chatId}`, JSON.stringify(updated));
          return updated;
        });
      } catch (error) {
        console.error('Error procesando stream:', error);
      }
    },
  });

  // Si no hay chatId, mostrar mensaje de bienvenida
  if (!chatId) {
    return (
      <div className="welcome-container">
        {/* <h1 className="welcome-title">ChatGPT Clone</h1> */}
        <p className="welcome-text">
          Selecciona un chat existente o crea uno nuevo para comenzar a conversar.
        </p>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-content">
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-empty-state">
              <h2 className="chat-empty-title">¿Cómo puedo ayudarte hoy?</h2>
              <div className="chat-suggestions">
                <div className="suggestion-card">
                  <h3 className="suggestion-title">Pregúntame sobre...</h3>
                  <p className="suggestion-text">cualquier tema que necesites investigar</p>
                </div>
                <div className="suggestion-card">
                  <h3 className="suggestion-title">Ayúdame a...</h3>
                  <p className="suggestion-text">resolver problemas o generar ideas</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="message-container">
              {messages.map((message: any, i: number) => (
                <MessageBubble key={i} {...message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      <div className="input-container">
        <div className="input-wrapper">
          <MessageInput
            onSend={(text) => sendMsg.mutate({ text })}
            disabled={sendMsg.isPending}
          />
        </div>
      </div>
    </div>
  );
}
