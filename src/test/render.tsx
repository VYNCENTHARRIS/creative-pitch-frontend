import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { cssVariablesResolver, theme } from '../app/theme'

export function renderWithProviders(ui: ReactElement, route?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const content =
    route === undefined ? ui : <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
  return render(
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      forceColorScheme="light"
      env="test"
    >
      <QueryClientProvider client={client}>{content}</QueryClientProvider>
    </MantineProvider>,
  )
}
