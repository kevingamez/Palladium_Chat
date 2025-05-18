import { Outlet, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { XStack, YStack } from 'tamagui';
import SlideBar from './SlideBar';

export default function Layout() {
  const navigate = useNavigate();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  useEffect(() => {
    const pathMatch = window.location.pathname.match(/\/chat\/(.+)/);
    if (pathMatch && pathMatch[1]) {
      setActiveChatId(pathMatch[1]);
    }
  }, []);

  function selectChat(chatId: string) {
    setActiveChatId(chatId);
    navigate({ to: '/chat/$chatId', params: { chatId } });
  }

  return (
    <XStack style={{ flex: 1, height: '100vh' }}>
      <SlideBar activeChatId={activeChatId} onChatSelect={selectChat} />
      <YStack style={{ flex: 1 }}>
        <Outlet />
      </YStack>
    </XStack>
  );
}
