import { clearCsrfCache, getCsrfToken } from "./csrf"
import { IslandResponse, parseIslandResponse } from "./types"

export type IslandFetchOptions = {
  endpoint?: string
  fixedParams?: Record<string, unknown>
  overridePayload?: Record<string, unknown>
  headers?: Record<string, string>
  signal?: AbortSignal
  fetchImpl?: typeof fetch
  navigate?: (location: string) => void
}

export type IslandFetchPayload = Record<string, unknown>

function defaultNavigate(location: string): void {
  const turbo = (window as typeof window & { Turbo?: { visit: (path: string) => void } }).Turbo

  if (turbo?.visit) {
    turbo.visit(location)
    return
  }

  window.location.assign(location)
}

function hasContent(response: Response): boolean {
  const contentLength = response.headers.get("content-length")
  return contentLength == null || contentLength !== "0"
}

export function buildIslandPayload(
  payload: IslandFetchPayload = {},
  fixedParams: Record<string, unknown> = {},
  overridePayload: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    ...fixedParams,
    ...payload,
    ...overridePayload
  }
}

export async function islandFetch(
  component: string,
  operation: string,
  payload: IslandFetchPayload = {},
  options: IslandFetchOptions = {}
): Promise<IslandResponse> {
  const fetchImpl = options.fetchImpl ?? fetch
  const endpoint = options.endpoint ?? "/islands"
  const mergedPayload = buildIslandPayload(payload, options.fixedParams, options.overridePayload)
  const csrfToken = getCsrfToken()

  const response = await fetchImpl(
    `${endpoint}/${encodeURIComponent(component)}/${encodeURIComponent(operation)}`,
    {
      method: "POST",
      signal: options.signal,
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        "x-requested-with": "XMLHttpRequest",
        ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        ...(options.headers ?? {})
      },
      body: JSON.stringify(mergedPayload)
    }
  )

  if (response.status === 422) {
    // Rails may rotate CSRF token; force re-read on next request.
    clearCsrfCache()
  }

  if (response.status === 403 && !hasContent(response)) {
    return { status: "forbidden" }
  }

  if (!hasContent(response)) {
    return { status: "ok", props: {}, version: Date.now() }
  }

  const text = await response.text()
  if (text.trim().length === 0) {
    return { status: "ok", props: {}, version: Date.now() }
  }

  const parsed = parseIslandResponse(JSON.parse(text))

  if (parsed.status === "redirect") {
    const navigate = options.navigate ?? defaultNavigate
    navigate(parsed.location)
  }

  return parsed
}
