import {
  Outlet,
  createRootRoute,
  createRoute,
} from '@tanstack/react-router';
import ChatWindow from './ChatWindow/ChatWindow';
// Ruta raíz
export const Route = createRootRoute({
  component: RootLayout,
});

// Ruta índice
const indexRoute = createRoute({
  getParentRoute: () => Route,
  path: '/',
  component: () => <Outlet />,
});

// Ruta de chat
const chatRoute = createRoute({
  getParentRoute: () => Route,
  path: '/chat/$chatId',
  component: () => <Outlet />,
});

// Definir árbol de rutas
export const routeTree = Route.addChildren([
  indexRoute,
  chatRoute,
]);

// Componente de Layout principal
export default function RootLayout() {
  return (
    <div className="flex h-screen bg-[#343541] overflow-hidden">
      <main className="flex-1 relative overflow-hidden">
        <ChatWindow />
        <Outlet />
      </main>
    </div>
  );
}