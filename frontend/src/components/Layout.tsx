import { Outlet, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { XStack, YStack, Button } from 'tamagui';
import SlideBar from './SlideBar';

export default function Layout() {
  const navigate = useNavigate();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);

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

  function toggleSidebar() {
    setSidebarVisible(!sidebarVisible);
  }

  return (
    <XStack style={{ flex: 1, height: '100vh' }}>
      <XStack
        width={sidebarVisible ? 250 : 0}
        overflow="hidden"
        opacity={sidebarVisible ? 1 : 0}
        style={{
          transition: 'width 250ms, opacity 250ms',
        }}
      >
        <SlideBar activeChatId={activeChatId} onChatSelect={selectChat} />
      </XStack>

      <YStack style={{ flex: 1 }}>
        <Button
          position="absolute"
          top={10}
          left={10}
          zIndex={100}
          size="$2"
          circular
          backgroundColor="#333"
          color="#fff"
          onPress={toggleSidebar}
        >
          {sidebarVisible ? '◀' : '▶'}
        </Button>

        <Outlet />
      </YStack>
    </XStack>
  );
}
