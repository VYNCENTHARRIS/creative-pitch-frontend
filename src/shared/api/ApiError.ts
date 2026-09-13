export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number | null = null,
    public readonly code: string | null = null,
    public readonly backendMessage: string | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
