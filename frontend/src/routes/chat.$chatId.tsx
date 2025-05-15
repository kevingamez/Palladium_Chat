import { createFileRoute } from '@tanstack/react-router'
import ChatWindow from '../components/ChatWindow/ChatWindow'

export const Route = createFileRoute('/chat/$chatId')({
  component: ChatWindow,
})