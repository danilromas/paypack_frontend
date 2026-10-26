import type { Metadata } from "next"
import Script from "next/script"

export const metadata: Metadata = {
  title: "PayPack API reference",
  description: "HTTP API documentation for PayPack.",
}

// Renders public/openapi.json with Redoc — the JSON file is the source of truth for the API reference.
export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* @ts-expect-error -- Redoc registers the <redoc> custom element at runtime */}
      <redoc spec-url="/openapi.json" hide-download-button="false" />
      <Script src="https://cdn.jsdelivr.net/npm/redoc@2.1.5/bundles/redoc.standalone.js" strategy="afterInteractive" />
    </div>
  )
}
