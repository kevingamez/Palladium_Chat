import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import Header from '../components/Header'
import Layout from '../components/Layout'

export const Route = createRootRoute({
  component: () => (
    <>
      <Header />
      <Layout>
      <Outlet />
      </Layout>
      <TanStackRouterDevtools />
    </>
  ),
})
