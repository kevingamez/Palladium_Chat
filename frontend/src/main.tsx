import React from 'react'
import ReactDOM from 'react-dom/client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { TamaguiProvider } from 'tamagui'
import config from '../tamagui.config.ts'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a client
const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TamaguiProvider config={config}>
        <RouterProvider router={createRouter({ routeTree })} />
      </TamaguiProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
