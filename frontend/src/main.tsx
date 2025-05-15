import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'     // generado por Vite plugin
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'

// Crear una instancia del QueryClient
const queryClient = new QueryClient()

// Crear el router
const router = createRouter({ routeTree })

// Asegurarse de que existe un elemento para montar la aplicación
const rootElement = document.getElementById('root') || document.body;

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
)
