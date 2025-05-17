import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const Route = createRootRoute({
  component: () => (
    <div className="flex h-screen">
      {/* <aside className="w-72"><Link to="/">Chats</Link></aside> */}
      <div className="flex-1"><Outlet /></div>
      <TanStackRouterDevtools />
    </div>
  ),
})