import Link from "next/link"
import path from "path"
import { readFileSync } from "fs"
import { LandingHeader } from "@/components/landing/header"
import { LandingFooter } from "@/components/landing/footer"
import {
  Download,
  Puzzle,
  Settings2,
  MousePointerClick,
  Copy,
  Table2,
  LayoutDashboard,
} from "lucide-react"

function getExtensionVersion() {
  try {
    const manifestPath = path.join(
      process.cwd(),
      "extensions",
      "paypack-marketplace",
      "manifest.json",
    )
    return JSON.parse(readFileSync(manifestPath, "utf8")).version as string
  } catch {
    return "1.0.0"
  }
}

export const metadata = {
  title: "Browser extension | PayPack",
  description:
    "Install the PayPack Marketplace Chrome extension — history table, settings, and one-click Facebook Marketplace import.",
}

export default function ExtensionPage() {
  const extensionVersion = getExtensionVersion()

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
          Download v{extensionVersion} (paypack-marketplace-extension.zip)
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
                Open the popup — set your PayPack URL in{" "}
                <strong className="text-foreground">Settings</strong> (default{" "}
                <code className="text-foreground">https://paypack.uno</code>).
              </li>
              <li>
                Open a Marketplace listing — use <em>BUY IN PAYPACK</em> above the seller message
                box, or import from the popup Overview tab.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">
              What&apos;s new in v{extensionVersion}
            </h2>
            <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <LayoutDashboard className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">Overview</strong> — status pill, today/total
                  counters, open dashboard, import current listing, copy import link.
                </span>
              </li>
              <li className="flex gap-3">
                <Table2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">History table</strong> — last imports with
                  search, open again, copy link, delete, and clear all.
                </span>
              </li>
              <li className="flex gap-3">
                <Settings2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">Settings</strong> — PayPack origin, detail/feed
                  toggles, button label &amp; color (#0f7680 default), EN/RU UI, debug mode.
                </span>
              </li>
              <li className="flex gap-3">
                <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">Stable overlay</strong> — fixed button above
                  the seller composer (no Facebook DOM injection); settings apply live via storage.
                </span>
              </li>
              <li className="flex gap-3">
                <Copy className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">Dashboard import</strong> — still prefills
                  title, price, description, and image into deal creation.
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
