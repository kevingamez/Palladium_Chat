import { createFileRoute } from '@tanstack/react-router';
import ChatWindow from '../components/ChatWindow/ChatWindow';

export const Route = createFileRoute('/chat/$chatId')({
  component: ChatPage,
});

function ChatPage() {
  // Obtener el chatId de los parámetros
  const { chatId } = Route.useParams();

  return (
    <ChatWindow  />
  );
}