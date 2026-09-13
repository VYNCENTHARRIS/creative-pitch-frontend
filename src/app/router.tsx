import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { FoundationPage } from '../pages/FoundationPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { writingCanvasEnabled } from './development'

// Vite removes this import before bundling production assets.
const WritingCanvasSpikePage = import.meta.env.DEV
  ? lazy(() => import('../pages/WritingCanvasSpikePage'))
  : null

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<FoundationPage />} />
      {writingCanvasEnabled && WritingCanvasSpikePage && (
        <Route
          path="/spikes/writing-canvas"
          element={
            <Suspense fallback={<p role="status">Loading writing canvas…</p>}>
              <WritingCanvasSpikePage />
            </Suspense>
          }
        />
      )}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
