import { describe, expect, it } from 'vitest'
import { parseBackendUrl } from './env'

describe('backend configuration', () => {
  it('accepts HTTP(S) and removes only one trailing slash', () => {
    expect(parseBackendUrl('http://localhost:7084/')).toBe('http://localhost:7084')
    expect(parseBackendUrl('https://example.com/backend')).toBe('https://example.com/backend')
    expect(parseBackendUrl('https://EXAMPLE.com/a%20b//')).toBe('https://EXAMPLE.com/a%20b/')
  })

  it('rejects missing, malformed, or credential-bearing URLs without echoing them', () => {
    for (const value of [
      undefined,
      '',
      'localhost:7084',
      '/api',
      'ftp://example.com',
      'https:example.com',
      ' http://localhost:7084',
      'https://user:private@example.com',
      'https://example.com?token=private',
      'https://example.com#private',
      'https://example.com\\path',
    ]) {
      expect(() => parseBackendUrl(value)).toThrow('Set VITE_BACKEND_URL')
      expect(() => parseBackendUrl(value)).not.toThrow('private')
    }
  })
})
