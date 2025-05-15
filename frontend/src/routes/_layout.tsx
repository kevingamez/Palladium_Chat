import {
    Link,
    createRouter,
    createRootRoute,
    createRoute, useNavigate, Outlet
  } from '@tanstack/react-router';
  import { useEffect } from 'react';
  import ChatWindow from '../components/ChatWindow/ChatWindow';
  import NewChatButton from '../components/NewChatButton/NewChatButton';
  const NavigateToDefaultChat = () => {
    const navigate = useNavigate();

    useEffect(() => {
      // Buscar chats existentes en localStorage
      const chatKeys = Object.keys(localStorage)
        .filter(key => key.startsWith('chat_'))
        .map(key => key.replace('chat_', ''));

      if (chatKeys.length > 0) {
        // Redirigir al primer chat existente
        navigate({ to: '/chat/$chatId', params: { chatId: chatKeys[0] } });
      } else {
        // Crear un nuevo chat y redirigir
        const newId = Date.now().toString();
        navigate({ to: '/chat/$chatId', params: { chatId: newId } });
      }
    }, [navigate]);

    return <div className="flex items-center justify-center h-full">Cargando...</div>;
  };

  // Exportar la ruta raíz para que routeTree.gen.ts pueda importarla
  export const Route = createRootRoute({
    component: RootLayout,
  });

  // Crear rutas hijas usando createRoute
  const indexRoute = createRoute({
    getParentRoute: () => Route,
    path: '/',
    component: () => <div className="flex items-center justify-center h-full">Selecciona o crea un chat</div>,
  });

  const chatRoute = createRoute({
    getParentRoute: () => Route,
    path: '/chat/$chatId',
    component: () => <Outlet />, // Solo usa Outlet, el componente real se carga en chat.$chatId.tsx
  });

  // Definir el árbol de rutas
  const routeTree = Route.addChildren([
    indexRoute,
    chatRoute,
  ]);

  // Crear el router
  export const router = createRouter({
    routeTree,
  });

  export default function RootLayout() {
    return (
      <div className="flex h-screen">
        <ChatWindow />

        <div className="flex-1 bg-zinc-900 text-white">
          <NewChatButton onClick={() => {NavigateToDefaultChat()}} />
          <Outlet />

        </div>
      </div>
    );
  }