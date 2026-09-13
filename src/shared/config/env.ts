export function parseBackendUrl(value: unknown): string {
  const message =
    'Set VITE_BACKEND_URL to an absolute HTTP(S) backend URL without credentials, query, or fragment.'
  if (typeof value !== 'string' || !value || /\s|\\/.test(value)) {
    throw new Error(message)
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(message)
  }
  if (
    !/^https?:\/\//i.test(value) ||
    !url.hostname ||
    url.username ||
    url.password ||
    value.includes('?') ||
    value.includes('#')
  ) {
    throw new Error(message)
  }

  // Keep the supplied URL intact except for one trailing slash.
  return value.replace(/\/$/, '')
}

export const env = { backendUrl: parseBackendUrl(import.meta.env.VITE_BACKEND_URL) }
