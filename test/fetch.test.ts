import { beforeEach, describe, expect, it, vi } from "vitest"

import { clearCsrfCache } from "../src/csrf"
import { buildIslandPayload, islandFetch } from "../src/fetch"

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
})
