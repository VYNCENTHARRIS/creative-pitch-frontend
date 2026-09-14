import { lazy, Suspense } from 'react'
import type { RouteObject } from 'react-router'
import { FoundationPage } from '../pages/FoundationPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { writingCanvasEnabled } from './development'
import { App } from './App'
import { RequireAccess } from './RequireAccess'
import { LoginPage } from '../pages/LoginPage'
import { MyConceptsPage } from '../pages/MyConceptsPage'
import { ConceptEditorPage } from '../pages/ConceptEditorPage'
import { NavigationGuard } from '../shared/ui/NavigationGuard'

// Vite removes this import before bundling production assets.
const WritingCanvasSpikePage = import.meta.env.DEV
  ? lazy(() => import('../pages/WritingCanvasSpikePage'))
  : null

export function appRoutes(): RouteObject[] {
  return [
    {
      element: (
        <NavigationGuard>
          <App />
        </NavigationGuard>
      ),
      children: [
        { path: '/', element: <FoundationPage showWritingCanvas={writingCanvasEnabled} /> },
        { path: '/login', element: <LoginPage /> },
        {
          element: <RequireAccess />,
          children: [
            { path: '/concepts', element: <MyConceptsPage /> },
            { path: '/concepts/:conceptId', element: <ConceptEditorPage /> },
          ],
        },
        ...(writingCanvasEnabled && WritingCanvasSpikePage
          ? [
              {
                path: '/spikes/writing-canvas',
                element: (
                  <Suspense fallback={<p role="status">Loading writing canvas…</p>}>
                    <WritingCanvasSpikePage />
                  </Suspense>
                ),
              },
            ]
          : []),
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ]
}
