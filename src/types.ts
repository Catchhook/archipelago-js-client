export type IslandProps = Record<string, unknown>

export const FORM_ERROR = "_base" as const

export class ArchipelagoTransportError extends Error {
  public readonly statusCode: number | undefined
  public readonly responseBody: string | undefined

  constructor(
    message: string,
    options?: { statusCode?: number; responseBody?: string; cause?: unknown }
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined)
    this.name = "ArchipelagoTransportError"
    this.statusCode = options?.statusCode
    this.responseBody = options?.responseBody
  }
}

export type IslandOkResponse = {
  status: "ok"
  props: IslandProps
  version: number
}

export type IslandRedirectResponse = {
  status: "redirect"
  location: string
}

export type IslandErrorResponse = {
  status: "error"
  errors: Record<string, string[]>
}

export type IslandForbiddenResponse = {
  status: "forbidden"
}

export type IslandResponse =
  | IslandOkResponse
  | IslandRedirectResponse
  | IslandErrorResponse
  | IslandForbiddenResponse

export type ArchipelagoResponse = IslandResponse

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isErrorMap(value: unknown): value is Record<string, string[]> {
  if (!isRecord(value)) {
    return false
  }

  return Object.values(value).every((messages) => {
    return Array.isArray(messages) && messages.every((message) => typeof message === "string")
  })
}

export function parseIslandResponse(value: unknown): IslandResponse {
  if (!isRecord(value) || typeof value.status !== "string") {
    throw new ArchipelagoTransportError("Invalid island response payload")
  }

  switch (value.status) {
    case "ok": {
      if (!isRecord(value.props)) {
        throw new ArchipelagoTransportError("Invalid ok payload")
      }

      return {
        status: "ok",
        props: value.props,
        version: typeof value.version === "number" ? value.version : Date.now()
      }
    }
    case "redirect": {
      if (typeof value.location !== "string") {
        throw new ArchipelagoTransportError("Invalid redirect payload")
      }

      return { status: "redirect", location: value.location }
    }
    case "error": {
      if (!isErrorMap(value.errors)) {
        throw new ArchipelagoTransportError("Invalid error payload")
      }

      return { status: "error", errors: value.errors }
    }
    case "forbidden":
      return { status: "forbidden" }
    default:
      throw new ArchipelagoTransportError("Unknown island response status")
  }
}
