export type IslandProps = Record<string, unknown>

export type IslandOkResponse = {
  status: "ok"
  props: IslandProps
  version?: number
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
    throw new Error("Invalid island response payload")
  }

  switch (value.status) {
    case "ok": {
      if (!isRecord(value.props)) {
        throw new Error("Invalid ok payload")
      }

      if (value.version != null && typeof value.version !== "number") {
        throw new Error("Invalid ok version")
      }

      return {
        status: "ok",
        props: value.props,
        version: typeof value.version === "number" ? value.version : undefined
      }
    }
    case "redirect": {
      if (typeof value.location !== "string") {
        throw new Error("Invalid redirect payload")
      }

      return { status: "redirect", location: value.location }
    }
    case "error": {
      if (!isErrorMap(value.errors)) {
        throw new Error("Invalid error payload")
      }

      return { status: "error", errors: value.errors }
    }
    case "forbidden":
      return { status: "forbidden" }
    default:
      throw new Error("Unknown island response status")
  }
}
