import { createFileRoute } from '@tanstack/react-router';
import ChatWindow from '../components/ChatWindow.tsx';

export const Route = createFileRoute('/chat/$chatId')({
  component: ChatPage,
});

function ChatPage() {
  return <ChatWindow />;
}
