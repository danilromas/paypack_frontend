/**
 * Talks to the PayPack browser extension through its bridge.js content script (window.postMessage).
 * Facebook only shows listings to logged-in browsers, so FB links are read by the extension in the
 * user's own browser rather than by our server.
 */

const PAGE_SOURCE = "paypack-page"
const EXT_SOURCE = "paypack-extension"

export interface ExtensionListing {
  title: string
  price: number
  desc: string
  image: string
  link: string
}

export type ExtensionScrapeResult =
  | { status: "ok"; listing: ExtensionListing }
  | { status: "no_extension" }
  | { status: "login_required" }
  | { status: "failed" }

function waitForMessage<T>(match: (data: Record<string, unknown>) => T | undefined, timeoutMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      window.removeEventListener("message", onMessage)
      resolve(null)
    }, timeoutMs)
    function onMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return
      const data = event.data as Record<string, unknown> | null
      if (!data || data.source !== EXT_SOURCE) return
      const result = match(data)
      if (result === undefined) return
      clearTimeout(timer)
      window.removeEventListener("message", onMessage)
      resolve(result)
    }
    window.addEventListener("message", onMessage)
  })
}

export async function isExtensionAvailable(): Promise<boolean> {
  const pong = waitForMessage((d) => (d.type === "PP_PONG" ? true : undefined), 600)
  window.postMessage({ source: PAGE_SOURCE, type: "PP_PING" }, window.location.origin)
  return (await pong) === true
}

export async function scrapeListingViaExtension(url: string): Promise<ExtensionScrapeResult> {
  if (!(await isExtensionAvailable())) return { status: "no_extension" }

  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const result = waitForMessage(
    (d) => (d.type === "PP_SCRAPE_RESULT" && d.requestId === requestId ? d : undefined),
    25000,
  )
  window.postMessage({ source: PAGE_SOURCE, type: "PP_SCRAPE_LISTING", requestId, url }, window.location.origin)
  const res = await result
  if (!res) return { status: "failed" }
  if (res.ok && res.data) return { status: "ok", listing: res.data as ExtensionListing }
  if (res.error === "login_required") return { status: "login_required" }
  return { status: "failed" }
}
