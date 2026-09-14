import '@mantine/core/styles.css'
import './app/global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { appRoutes } from './app/router'
import { AppProviders } from './app/providers'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={createBrowserRouter(appRoutes())} />
    </AppProviders>
  </StrictMode>,
)
