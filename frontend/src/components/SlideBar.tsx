import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState, useCallback } from 'react';
import { YStack, Button, Text, ScrollView } from 'tamagui';
import { Menu } from '@tamagui/lucide-icons';

interface SlideBarProps {
  readonly activeChatId: string | null;
  readonly onChatSelect: (chatId: string) => void;
}

export default function SlideBar({ activeChatId, onChatSelect }: SlideBarProps) {
  const navigate = useNavigate();
  const [chats, setChats] = useState<{ id: string; name: string }[]>([]);

  const loadChats = useCallback(() => {
    const chatKeys = Object.keys(localStorage)
      .filter((key) => key.startsWith('chat_'))
      .map((key) => {
        const id = key.replace('chat_', '');
        const chatData = JSON.parse(localStorage.getItem(key) || '{}');
        const name = chatData.name || new Date(parseInt(id)).toLocaleString();
        return { id, name };
      })
      .sort((a, b) => parseInt(b.id) - parseInt(a.id));

    setChats(chatKeys);
  }, []);

  useEffect(() => {
    loadChats();

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
      name: `Chat ${new Date().toLocaleString()}`,
    };

    localStorage.setItem(`chat_${newId}`, JSON.stringify(newChat));
    loadChats();
    navigate({ to: '/chat/$chatId', params: { chatId: newId } });
  }

  return (
    <YStack
      width="100%"
      backgroundColor="#f9f9f9"
      borderRightWidth={0}
      paddingTop={16}
      paddingRight={16}
      paddingBottom={16}
      paddingLeft={16}
      height="100%"
    >
      <YStack marginBottom={16}>
        <Button
          backgroundColor="#000"
          paddingTop={12}
          paddingRight={12}
          paddingBottom={12}
          paddingLeft={12}
          borderTopLeftRadius={6}
          borderTopRightRadius={6}
          borderBottomLeftRadius={6}
          borderBottomRightRadius={6}
          onPress={createNewChat}
        >
          <Text color="white" fontWeight="bold">
            New Chat
          </Text>
        </Button>
      </YStack>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text color="#aaa" marginBottom={8}>
          Your chats
        </Text>

        {chats.map((chat) => (
          <Button
            key={chat.id}
            backgroundColor={activeChatId === chat.id ? '#e3e3e3' : 'transparent'}
            paddingTop={12}
            paddingRight={12}
            paddingBottom={12}
            paddingLeft={12}
            borderTopLeftRadius={6}
            borderTopRightRadius={6}
            borderBottomLeftRadius={6}
            borderBottomRightRadius={6}
            justifyContent="flex-start"
            onPress={() => onChatSelect(chat.id)}
          >
            <Text color="#494949" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
              {chat.name}
            </Text>
          </Button>
        ))}

        {chats.length === 0 && (
          <Text
            color="#494949"
            textAlign="center"
            paddingTop={16}
            paddingRight={16}
            paddingBottom={16}
            paddingLeft={16}
          >
            No chats available
          </Text>
        )}
      </ScrollView>
    </YStack>
  );
}
