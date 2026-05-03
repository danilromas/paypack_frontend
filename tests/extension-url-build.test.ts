import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import vm from "node:vm"
import { beforeAll, describe, expect, it } from "vitest"

const urlBuildPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../extensions/paypack-marketplace/url-build.js"
)

type Listing = {
  title?: string
  link?: string
  price?: number
  desc?: string
}

type PayPackUrlBuildApi = {
  DEFAULT_ORIGIN: string
  buildDashboardImportUrl: (
    paypackOrigin: string | undefined,
    listing: Listing
  ) => string
}

let PayPackUrlBuild: PayPackUrlBuildApi

beforeAll(() => {
  const code = readFileSync(urlBuildPath, "utf-8")
  const ctx = vm.createContext({ URLSearchParams })
  vm.runInContext(code, ctx)
  const api = (ctx as { PayPackUrlBuild?: PayPackUrlBuildApi }).PayPackUrlBuild
  if (!api) throw new Error("PayPackUrlBuild missing after loading url-build.js")
  PayPackUrlBuild = api
})

describe("PayPackUrlBuild (extension url-build.js)", () => {
  it("uses paypack.uno as default origin constant", () => {
    expect(PayPackUrlBuild.DEFAULT_ORIGIN).toBe("https://paypack.uno")
  })

  it("falls back to default origin when paypackOrigin is empty", () => {
    const u = PayPackUrlBuild.buildDashboardImportUrl("", {
      title: "Vintage lamp",
      link: "https://www.facebook.com/marketplace/item/123/",
      price: 42,
      desc: "",
    })
    expect(u.startsWith("https://paypack.uno/dashboard/?")).toBe(true)
    expect(u).toContain("pp_import=1")
    expect(u).toContain("title=")
    expect(u).toContain("price=42")
    expect(u).not.toMatch(/[&?]desc=/)
  })

  it("strips trailing slash from configured origin", () => {
    const u = PayPackUrlBuild.buildDashboardImportUrl("https://paypack.uno/", {
      title: "",
      link: "https://example.com/listing",
      price: 0,
      desc: "",
    })
    expect(u.startsWith("https://paypack.uno/dashboard/?")).toBe(true)
    expect(u).not.toContain("paypack.uno//")
  })

  it("does not append price when zero or NaN", () => {
    const u = PayPackUrlBuild.buildDashboardImportUrl("https://paypack.uno", {
      title: "T",
      link: "https://fb/l",
      price: 0,
      desc: "x",
    })
    expect(u).not.toMatch(/[&?]price=/)

    const u2 = PayPackUrlBuild.buildDashboardImportUrl("https://paypack.uno", {
      title: "T",
      link: "https://fb/l",
      price: Number.NaN,
      desc: "",
    })
    expect(u2).not.toMatch(/[&?]price=/)
  })

  it("encodes special characters via URLSearchParams", () => {
    const u = PayPackUrlBuild.buildDashboardImportUrl("https://paypack.uno", {
      title: "a & b",
      link: "https://www.facebook.com/marketplace/item/abc/",
      price: 1,
      desc: "hello\nworld",
    })
    const parsed = new URL(u)
    expect(parsed.searchParams.get("title")).toBe("a & b")
    expect(parsed.searchParams.get("link")).toBe(
      "https://www.facebook.com/marketplace/item/abc/"
    )
    expect(parsed.searchParams.get("desc")).toBe("hello\nworld")
  })
})
