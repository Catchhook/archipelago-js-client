import { beforeEach, describe, expect, it, vi } from "vitest"

import { clearCsrfCache } from "../src/csrf"
import { buildIslandPayload, islandFetch } from "../src/fetch"
import { ArchipelagoTransportError } from "../src/types"

describe("buildIslandPayload", () => {
  it("respects precedence fixed -> payload -> override", () => {
    expect(
      buildIslandPayload(
        { email: "payload@example.com", keep: 1 },
        { email: "fixed@example.com", team_id: 10 },
        { email: "override@example.com" }
      )
    ).toEqual({
      email: "override@example.com",
      keep: 1,
      team_id: 10
    })
  })
})

describe("islandFetch", () => {
  beforeEach(() => {
    clearCsrfCache()
    document.head.innerHTML = '<meta name="csrf-token" content="abc123">'
  })

  it("posts JSON and parses response", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response(JSON.stringify({ status: "ok", props: { x: 1 }, version: 1 }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    })

    const response = await islandFetch("TeamMembers", "add_member", { email: "a@b.c" }, { fetchImpl })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0] as [RequestInfo | URL, RequestInit]
    expect(url).toContain("/islands/TeamMembers/add_member")
    expect(init.headers).toMatchObject({ "x-csrf-token": "abc123" })
    expect(response).toEqual({ status: "ok", props: { x: 1 }, version: 1 })
  })

  it("navigates on redirect response", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ status: "redirect", location: "/teams/1" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    })

    const navigate = vi.fn()
    await islandFetch("TeamMembers", "add_member", {}, { fetchImpl, navigate })

    expect(navigate).toHaveBeenCalledWith("/teams/1")
  })

  it("uses Turbo.visit for redirects when navigate is not provided", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ status: "redirect", location: "/teams/2" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    })

    const visit = vi.fn()
    ;(window as typeof window & { Turbo?: { visit: (path: string) => void } }).Turbo = { visit }

    await islandFetch("TeamMembers", "add_member", {}, { fetchImpl })

    expect(visit).toHaveBeenCalledWith("/teams/2")
    delete (window as typeof window & { Turbo?: { visit: (path: string) => void } }).Turbo
  })

  it("falls back to window.location.assign when Turbo is unavailable", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ status: "redirect", location: "/teams/3" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    })

    delete (window as typeof window & { Turbo?: { visit: (path: string) => void } }).Turbo
    const assignSpy = vi.fn()
    const originalLocation = window.location
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        assign: assignSpy
      }
    })

    await islandFetch("TeamMembers", "add_member", {}, { fetchImpl })

    expect(assignSpy).toHaveBeenCalledWith("/teams/3")
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation
    })
  })

  it("handles empty bodies as ok response", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response("", { status: 200, headers: { "content-length": "0" } })
    })

    const response = await islandFetch("TeamMembers", "add_member", {}, { fetchImpl })
    expect(response.status).toBe("ok")
  })

  it("maps empty forbidden body", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 403, headers: { "content-length": "0" } }))

    await expect(islandFetch("TeamMembers", "add_member", {}, { fetchImpl })).resolves.toEqual({
      status: "forbidden"
    })
  })

  it("parses non-empty forbidden responses as normal payloads", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ status: "error", errors: { base: ["denied"] } }), {
        status: 403,
        headers: { "content-type": "application/json" }
      })
    })

    await expect(islandFetch("TeamMembers", "add_member", {}, { fetchImpl })).resolves.toEqual({
      status: "error",
      errors: { base: ["denied"] }
    })
  })

  it("treats whitespace-only response body as empty ok", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response("   \n\t  ", {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    })

    const response = await islandFetch("TeamMembers", "add_member", {}, { fetchImpl })
    expect(response.status).toBe("ok")
  })

  it("refreshes csrf cache on 422 responses", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response(JSON.stringify({ status: "ok", props: {}, version: 1 }), {
        status: 422,
        headers: { "content-type": "application/json" }
      })
    })

    document.head.innerHTML = '<meta name="csrf-token" content="old-token">'
    await islandFetch("TeamMembers", "add_member", {}, { fetchImpl })

    document.head.innerHTML = '<meta name="csrf-token" content="new-token">'
    await islandFetch("TeamMembers", "add_member", {}, { fetchImpl })

    const secondCall = fetchImpl.mock.calls[1] as [RequestInfo | URL, RequestInit]
    expect(secondCall[1].headers).toMatchObject({ "x-csrf-token": "new-token" })
  })

  it("sends X-Archipelago-Stream header when stream option provided", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ status: "ok", props: {}, version: 1 }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    })

    await islandFetch("TeamMembers", "add_member", {}, { fetchImpl, stream: "TeamMembers:42" })

    const [, init] = fetchImpl.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit]
    expect(init.headers).toMatchObject({ "x-archipelago-stream": "TeamMembers:42" })
  })

  it("does not send stream header when stream option is not provided", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ status: "ok", props: {}, version: 1 }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    })

    await islandFetch("TeamMembers", "add_member", {}, { fetchImpl })

    const [, init] = fetchImpl.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit]
    expect((init.headers as Record<string, string>)["x-archipelago-stream"]).toBeUndefined()
  })

  it("throws ArchipelagoTransportError for HTML responses", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response("<!DOCTYPE html><html><body>Error</body></html>", {
        status: 500,
        headers: { "content-type": "text/html" }
      })
    })

    await expect(islandFetch("TeamMembers", "add_member", {}, { fetchImpl })).rejects.toThrow(
      ArchipelagoTransportError
    )

    try {
      await islandFetch("TeamMembers", "add_member", {}, { fetchImpl })
    } catch (error) {
      expect((error as ArchipelagoTransportError).statusCode).toBe(500)
      expect((error as ArchipelagoTransportError).message).toContain("HTML")
    }
  })

  it("throws ArchipelagoTransportError for invalid JSON responses", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response("not-json-{{{", {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    })

    await expect(islandFetch("TeamMembers", "add_member", {}, { fetchImpl })).rejects.toThrow(
      ArchipelagoTransportError
    )
  })

  it("throws ArchipelagoTransportError on network failure", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch")
    })

    await expect(islandFetch("TeamMembers", "add_member", {}, { fetchImpl })).rejects.toThrow(
      ArchipelagoTransportError
    )
  })

  it("uses XHR transport and reports progress when onUploadProgress is provided", async () => {
    const progressEvents: Array<{ percentage: number; loaded: number; total: number | undefined }> = []

    const originalXHR = globalThis.XMLHttpRequest
    const mockXHR = {
      open: vi.fn(),
      send: vi.fn(),
      setRequestHeader: vi.fn(),
      withCredentials: false,
      status: 200,
      responseText: JSON.stringify({ status: "ok", props: { x: 1 }, version: 1 }),
      upload: {
        addEventListener: vi.fn()
      },
      addEventListener: vi.fn(),
      getResponseHeader: vi.fn().mockReturnValue(null)
    }

    globalThis.XMLHttpRequest = vi.fn(() => mockXHR) as unknown as typeof XMLHttpRequest

    const promise = islandFetch("TeamMembers", "add_member", { email: "a@b.c" }, {
      onUploadProgress: (p) => progressEvents.push(p)
    })

    const uploadProgressHandler = mockXHR.upload.addEventListener.mock.calls.find(
      (c: unknown[]) => c[0] === "progress"
    )?.[1] as (event: { lengthComputable: boolean; loaded: number; total: number }) => void

    uploadProgressHandler({ lengthComputable: true, loaded: 50, total: 100 })
    uploadProgressHandler({ lengthComputable: true, loaded: 100, total: 100 })

    const loadHandler = mockXHR.addEventListener.mock.calls.find(
      (c: unknown[]) => c[0] === "load"
    )?.[1] as () => void

    loadHandler()

    const result = await promise

    expect(result).toEqual({ status: "ok", props: { x: 1 }, version: 1 })
    expect(progressEvents).toEqual([
      { percentage: 50, loaded: 50, total: 100 },
      { percentage: 100, loaded: 100, total: 100 }
    ])
    expect(mockXHR.open).toHaveBeenCalledWith("POST", "/islands/TeamMembers/add_member", true)
    expect(mockXHR.setRequestHeader).toHaveBeenCalledWith("content-type", "application/json")

    globalThis.XMLHttpRequest = originalXHR
  })

  it("XHR transport handles error events as ArchipelagoTransportError", async () => {
    const originalXHR = globalThis.XMLHttpRequest
    const mockXHR = {
      open: vi.fn(),
      send: vi.fn(),
      setRequestHeader: vi.fn(),
      withCredentials: false,
      upload: { addEventListener: vi.fn() },
      addEventListener: vi.fn(),
      getResponseHeader: vi.fn().mockReturnValue(null)
    }

    globalThis.XMLHttpRequest = vi.fn(() => mockXHR) as unknown as typeof XMLHttpRequest

    const promise = islandFetch("TeamMembers", "add_member", {}, {
      onUploadProgress: () => {}
    })

    const errorHandler = mockXHR.addEventListener.mock.calls.find(
      (c: unknown[]) => c[0] === "error"
    )?.[1] as () => void

    errorHandler()

    await expect(promise).rejects.toThrow(ArchipelagoTransportError)

    globalThis.XMLHttpRequest = originalXHR
  })

  it("XHR transport aborts when signal is already aborted", async () => {
    const originalXHR = globalThis.XMLHttpRequest
    const mockXHR = {
      open: vi.fn(),
      send: vi.fn(),
      abort: vi.fn(),
      setRequestHeader: vi.fn(),
      withCredentials: false,
      upload: { addEventListener: vi.fn() },
      addEventListener: vi.fn(),
      getResponseHeader: vi.fn().mockReturnValue(null)
    }

    globalThis.XMLHttpRequest = vi.fn(() => mockXHR) as unknown as typeof XMLHttpRequest

    const controller = new AbortController()
    controller.abort()

    const promise = islandFetch("TeamMembers", "add_member", {}, {
      signal: controller.signal,
      onUploadProgress: () => {}
    })

    const abortHandler = mockXHR.addEventListener.mock.calls.find(
      (c: unknown[]) => c[0] === "abort"
    )?.[1] as () => void

    abortHandler()

    await expect(promise).rejects.toThrow("aborted")
    expect(mockXHR.abort).toHaveBeenCalled()

    globalThis.XMLHttpRequest = originalXHR
  })
})
