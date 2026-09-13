export interface HealthResponse {
  status: 'ok'
}

export interface ReadyResponse {
  status: 'ready'
}

export interface AppInfo {
  app_name: 'Creative Pitch'
  environment: string
}

export type ConnectionState =
  'checking' | 'api-unavailable' | 'database-unavailable' | 'readiness-unavailable' | 'ready'
