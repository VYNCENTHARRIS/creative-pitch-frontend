import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Node 25 also exposes storage. Use this test environment's real jsdom Storage.
const { jsdom } = globalThis as typeof globalThis & { jsdom: { window: Window } }
Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: jsdom.window.localStorage,
})

// jsdom has no font loading or layout. Browser checks cover actual sizing and selection.
Object.defineProperty(document, 'fonts', { value: new EventTarget(), configurable: true })
Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
  value: () => new DOMRect(),
  configurable: true,
})
Object.defineProperty(Range.prototype, 'getClientRects', { value: () => [], configurable: true })

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, 'ResizeObserver', { value: ResizeObserverMock })
Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', { value: vi.fn() })
const { getComputedStyle } = window
window.getComputedStyle = (element) => getComputedStyle(element)

afterEach(cleanup)
