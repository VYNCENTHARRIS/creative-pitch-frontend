import { describe, expect, it } from 'vitest'
import { parseBackendUrl, parsePublishableKey, parseSupabaseUrl } from './env'

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

it('requires a public Supabase origin and publishable key without echoing rejected values', () => {
  expect(parseSupabaseUrl('https://auth.example.test/')).toBe('https://auth.example.test')
  expect(parsePublishableKey('sb_publishable_fabricated')).toBe('sb_publishable_fabricated')
  for (const value of [
    '',
    undefined,
    'http://auth.example.test',
    'https://auth.example.test/path',
    'https://user:private@auth.example.test',
  ])
    expect(() => parseSupabaseUrl(value)).toThrow('Set VITE_SUPABASE_URL')
  for (const value of ['', undefined, 'sb_secret_private', 'private.jwt.token'])
    expect(() => parsePublishableKey(value)).toThrow('public Supabase publishable key')
})
