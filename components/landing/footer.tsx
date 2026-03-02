import Link from "next/link"

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-sm font-bold text-primary-foreground">
              P
            </div>
            <span className="text-lg font-semibold text-foreground">
              PayPack<span className="font-light text-primary">.uno</span>
            </span>
          </div>

          <nav className="flex gap-8">
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Contact
            </Link>
          </nav>

          <p className="text-sm text-muted-foreground">
            2024 PayPack Uno. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
