import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { StrictMode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { appRoutes } from '../app/router'
import { cssVariablesResolver, theme } from '../app/theme'
import { AuthProvider } from '../features/auth'
import { authHarness } from './auth'

export function renderApp(route = '/', auth = authHarness()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const router = createMemoryRouter(appRoutes(), { initialEntries: [route] })
  const view = render(
    <StrictMode>
      <MantineProvider
        theme={theme}
        cssVariablesResolver={cssVariablesResolver}
        forceColorScheme="light"
        env="test"
      >
        <QueryClientProvider client={client}>
          <AuthProvider controller={auth.controller}>
            <RouterProvider router={router} />
          </AuthProvider>
        </QueryClientProvider>
      </MantineProvider>
    </StrictMode>,
  )
  return { ...view, client, router, auth }
}
