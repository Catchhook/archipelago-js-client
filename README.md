# @archipelago-js/client

Core client library for [Archipelago](https://github.com/Catchhook/archipelago-rails) — the low-level fetch, response parsing, and error handling used by `@archipelago-js/react` and available standalone.

## Install

```bash
yarn add @archipelago-js/client
```

## Quick Start

```ts
import { islandFetch } from "@archipelago-js/client"

const response = await islandFetch("TeamMembers", "add_member", {
  team_id: 42,
  email: "new@example.com"
})

if (response.status === "ok") {
  console.log("Updated props:", response.props)
}
```

## `islandFetch(component, operation, payload?, options?)`

Sends a POST to the Archipelago Rails endpoint and returns a typed `IslandResponse`.

```ts
const response = await islandFetch("TeamMembers", "add_member", payload, {
  endpoint: "/islands",          // default
  fixedParams: { team_id: 42 },  // merged under payload
  overridePayload: {},           // merged over payload
  headers: {},                   // extra request headers
  signal: abortController.signal,
  stream: "TeamMembers:42",     // sent as X-Archipelago-Stream header
  navigate: (url) => { ... },   // called on redirect responses (default: Turbo.visit or location.assign)
  fetchImpl: fetch               // swap fetch for testing
})
```

## Response Types

Every response is a discriminated union on `status`:

```ts
type IslandResponse =
  | { status: "ok";       props: Record<string, unknown>; version: number }
  | { status: "redirect"; location: string }
  | { status: "error";    errors: Record<string, string[]> }
  | { status: "forbidden" }
```

`ArchipelagoResponse` is exported as an alias for `IslandResponse`.

### Handling responses

```ts
switch (response.status) {
  case "ok":
    // response.props, response.version
    break
  case "redirect":
    // response.location — navigation already happened via navigate()
    break
  case "error":
    // response.errors — e.g. { email: ["can't be blank"] }
    break
  case "forbidden":
    // no additional data
    break
}
```

## `parseIslandResponse(value)`

Parses a raw JSON value into a typed `IslandResponse`. Throws `ArchipelagoTransportError` on invalid payloads. Used internally by `islandFetch` and useful for parsing ActionCable broadcast payloads.

```ts
import { parseIslandResponse } from "@archipelago-js/client"

const parsed = parseIslandResponse(rawPayload)
```

## `buildIslandPayload(payload?, fixedParams?, overridePayload?)`

Merges three layers of params with precedence: `fixedParams` < `payload` < `overridePayload`.

```ts
import { buildIslandPayload } from "@archipelago-js/client"

buildIslandPayload(
  { email: "user@example.com" },
  { team_id: 42 },
  { email: "override@example.com" }
)
// => { team_id: 42, email: "override@example.com" }
```

## Error Handling

### `FORM_ERROR`

A constant equal to `"_base"` — the conventional key for form-level (non-field) errors:

```ts
import { FORM_ERROR } from "@archipelago-js/client"

if (response.status === "error" && response.errors[FORM_ERROR]) {
  console.log("Form-level errors:", response.errors[FORM_ERROR])
}
```

### `ArchipelagoTransportError`

A typed `Error` subclass thrown when the network request fails, the response is HTML instead of JSON, or JSON parsing fails. Properties:

| Property       | Type                  | Description                          |
|----------------|-----------------------|--------------------------------------|
| `message`      | `string`              | Human-readable error description     |
| `statusCode`   | `number \| undefined` | HTTP status code (if available)      |
| `responseBody` | `string \| undefined` | First 500 chars of the response body |

```ts
import { ArchipelagoTransportError } from "@archipelago-js/client"

try {
  await islandFetch("TeamMembers", "add_member", payload)
} catch (error) {
  if (error instanceof ArchipelagoTransportError) {
    console.error("Transport failed:", error.message, error.statusCode)
  }
}
```

## CSRF

CSRF tokens are automatically read from `<meta name="csrf-token">` and sent as `X-CSRF-Token`. The cache refreshes automatically on 422 responses (Rails CSRF rotation).

```ts
import { getCsrfToken, refreshCsrfToken, clearCsrfCache } from "@archipelago-js/client"

getCsrfToken()       // read cached or from DOM
refreshCsrfToken()   // force re-read from DOM
clearCsrfCache()     // clear cache (next call reads from DOM)
```

## API Reference

| Export                      | Description                                      |
|-----------------------------|--------------------------------------------------|
| `islandFetch`               | POST to island endpoint, returns typed response  |
| `buildIslandPayload`        | Merge fixed/payload/override params              |
| `parseIslandResponse`       | Parse raw JSON into typed `IslandResponse`       |
| `FORM_ERROR`                | `"_base"` constant for form-level errors         |
| `ArchipelagoTransportError` | Typed error for network/parse failures           |
| `getCsrfToken`              | Read CSRF token from DOM (cached)                |
| `refreshCsrfToken`          | Force re-read CSRF token                         |
| `clearCsrfCache`            | Clear CSRF token cache                           |
| `IslandResponse`            | Union type for all response statuses             |
| `ArchipelagoResponse`       | Alias for `IslandResponse`                       |
| `IslandOkResponse`          | `{ status: "ok", props, version }`               |
| `IslandRedirectResponse`    | `{ status: "redirect", location }`               |
| `IslandErrorResponse`       | `{ status: "error", errors }`                    |
| `IslandForbiddenResponse`   | `{ status: "forbidden" }`                        |
| `IslandFetchOptions`        | Options type for `islandFetch`                   |
| `IslandFetchPayload`        | Payload type (`Record<string, unknown>`)         |
