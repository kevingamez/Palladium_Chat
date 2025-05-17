import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState, useCallback } from 'react';
import { YStack, Button, Text, ScrollView } from 'tamagui';

interface SlideBarProps {
  activeChatId: string | null;
  onChatSelect: (chatId: string) => void;
}

export default function SlideBar({ activeChatId, onChatSelect }: SlideBarProps) {
  const navigate = useNavigate();
  const [chats, setChats] = useState<{id: string, name: string}[]>([]);

  // Función para cargar chats que podemos reutilizar
  const loadChats = useCallback(() => {
    const chatKeys = Object.keys(localStorage)
      .filter(key => key.startsWith('chat_'))
      .map(key => {
        const id = key.replace('chat_', '');
        const chatData = JSON.parse(localStorage.getItem(key) || '{}');
        const name = chatData.name || new Date(parseInt(id)).toLocaleString();
        return { id, name };
      })
      // Ordenar chats por fecha (más reciente primero)
      .sort((a, b) => parseInt(b.id) - parseInt(a.id));

    setChats(chatKeys);
  }, []);

  // Cargar chats al montar el componente
  useEffect(() => {
    loadChats();

    // Agregar un event listener para detectar cambios en localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('chat_')) {
        loadChats();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadChats]);

  function createNewChat() {
    const newId = Date.now().toString();
    const newChat = {
      messages: [],
      name: `Chat ${new Date().toLocaleString()}`
    };

    // Guardar el nuevo chat vacío
    localStorage.setItem(`chat_${newId}`, JSON.stringify(newChat));

    // Recargar la lista de chats
    loadChats();

    // Navegar al nuevo chat
    navigate({ to: '/chat/$chatId', params: { chatId: newId } });
  }

  return (
    <YStack
      style={{
        width: 250,
        backgroundColor: '#1f1f1f',
        borderRightWidth: 1,
        borderColor: '#333',
        paddingTop: 16,
        paddingRight: 16,
        paddingBottom: 16,
        paddingLeft: 16,
        height: '100%'
      }}
    >
      <YStack style={{ marginBottom: 16 }}>
        <Button
          style={{
            backgroundColor: '#3b82f6',
            paddingTop: 12,
            paddingRight: 12,
            paddingBottom: 12,
            paddingLeft: 12,
            borderTopLeftRadius: 6,
            borderTopRightRadius: 6,
            borderBottomLeftRadius: 6,
            borderBottomRightRadius: 6
          }}
          onPress={createNewChat}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>
            Nuevo Chat
          </Text>
        </Button>
      </YStack>

      <ScrollView>
        <Text style={{ color: '#aaa', marginBottom: 8 }}>
          Tus chats
        </Text>

        {chats.map(chat => (
          <Button
            key={chat.id}
            style={{
              backgroundColor: activeChatId === chat.id ? '#333' : 'transparent',
              paddingTop: 12,
              paddingRight: 12,
              paddingBottom: 12,
              paddingLeft: 12,
              borderTopLeftRadius: 6,
              borderTopRightRadius: 6,
              borderBottomLeftRadius: 6,
              borderBottomRightRadius: 6,
              justifyContent: 'flex-start'
            }}
            onPress={() => onChatSelect(chat.id)}
          >
            <Text style={{ color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {chat.name}
            </Text>
          </Button>
        ))}

        {chats.length === 0 && (
          <Text style={{ color: '#aaa', textAlign: 'center', paddingTop: 16, paddingRight: 16, paddingBottom: 16, paddingLeft: 16 }}>
            No hay chats disponibles
          </Text>
        )}
      </ScrollView>
    </YStack>
  );
}