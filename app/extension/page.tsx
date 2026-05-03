import Link from "next/link"
import { LandingHeader } from "@/components/landing/header"
import { LandingFooter } from "@/components/landing/footer"
import { Download, Puzzle, Settings2, MousePointerClick, Copy } from "lucide-react"

export const metadata = {
  title: "Browser extension | PayPack",
  description:
    "Install the PayPack Marketplace Chrome extension and import Facebook Marketplace listings into your dashboard.",
}

export default function ExtensionPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32 lg:px-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
            <Puzzle className="h-6 w-6 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              PayPack browser extension
            </h1>
            <p className="text-sm text-muted-foreground">
              Chrome · Facebook Marketplace → your PayPack dashboard
            </p>
          </div>
        </div>

        <a
          href="/api/extension/download/"
          className="mb-8 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-secondary/60 sm:text-base"
        >
          <Download className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          Download ZIP (paypack-marketplace-extension.zip)
        </a>

        <div className="max-w-none space-y-8 text-foreground">
          <section className="rounded-xl border border-border bg-card/40 p-5 sm:p-6">
            <h2 className="text-base font-semibold text-foreground">Installation</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>Download the ZIP using the button above.</li>
              <li>
                Unzip into a folder (for example{" "}
                <code className="text-foreground">paypack-marketplace</code>).
              </li>
              <li>
                Open <code className="text-foreground">chrome://extensions</code> and turn on{" "}
                <strong className="text-foreground">Developer mode</strong>.
              </li>
              <li>
                Click <strong className="text-foreground">Load unpacked</strong> and select that
                folder.
              </li>
              <li>
                Click the extension icon → enter your PayPack site URL (for example{" "}
                <code className="text-foreground">https://paypack.uno</code> or{" "}
                <code className="text-foreground">http://localhost:3000</code>).
              </li>
              <li>
                Open a Marketplace listing — use <em>Open in PayPack</em> or{" "}
                <em>Copy import link</em>. See <code className="text-foreground">INSTALL.txt</code>{" "}
                inside the ZIP for a short recap.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">What it does (v0.2)</h2>
            <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">Dashboard import</strong> — reads title,
                  price, and description from the page and opens deal creation with those fields
                  prefilled.
                </span>
              </li>
              <li className="flex gap-3">
                <Copy className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">Copy import URL</strong> — share or paste the
                  link manually; the last import is stored and shown in the extension popup.
                </span>
              </li>
              <li className="flex gap-3">
                <Settings2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">Popup settings</strong> — set your PayPack
                  origin and toggle the floating button on Facebook without editing code.
                </span>
              </li>
            </ul>
          </section>

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
      <LandingFooter />
    </div>
  )
}
