"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowLeftRight, Handshake, Package } from "lucide-react"
import { cn } from "@/lib/utils"

type ActionKey = "deal" | "ship" | "transfer"

const ACTIONS: Record<
  ActionKey,
  {
    title: string
    hint: string
    href: string
    icon: typeof Handshake
    external?: boolean
    sticker?: string
  }
> = {
  deal: {
    title: "DEAL",
    hint: "Create secure escrow transaction",
    href: "/dashboard?mode=deal&new=1",
    icon: Handshake,
  },
  ship: {
    title: "SHIPMENT",
    hint: "Track & manage delivery",
    href: "/dashboard/shipments?mode=ship",
    icon: Package,
  },
  transfer: {
    title: "TRANSFER",
    hint: "Crypto transfer via aWallet",
    href: "https://awallet.tech",
    icon: ArrowLeftRight,
    external: true,
    sticker: "",
  },
}

export function LandingSplitHero() {
  const [hovered, setHovered] = useState<ActionKey | null>(null)

  const cards = useMemo(() => (Object.keys(ACTIONS) as ActionKey[]), [])

  return (
    <section
      id="about"
      className="relative overflow-hidden pt-24 pb-10 sm:pt-28 sm:pb-14 lg:pt-36 lg:pb-20"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute left-1/2 top-24 h-[320px] w-[520px] -translate-x-1/2 rounded-full bg-[#5E90B4]/15 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
            PayPack<span className="font-light text-primary">.uno</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Secure internet deals & shipments in one place.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-6xl sm:mt-12">
          <div
            className="relative flex flex-row overflow-hidden rounded-2xl border border-border bg-card/40 backdrop-blur-xl sm:rounded-3xl"
            onMouseLeave={() => setHovered(null)}
          >
            {cards.map((key, idx) => {
              const action = ACTIONS[key]
              const isHovered = hovered === key
              const otherHovered = hovered !== null && !isHovered
              const Icon = action.icon
              const cardClassName = cn(
                "group relative flex min-h-[140px] min-w-0 flex-1 items-center justify-center overflow-hidden px-3 py-6 transition-all duration-700 sm:min-h-[220px] sm:px-5 sm:py-10 md:px-6",
                idx < cards.length - 1 && "border-r border-border/60",
                isHovered && "md:flex-[1.35] bg-primary/[0.04]",
                key === "ship" && isHovered && "bg-success/[0.04]",
                key === "transfer" && isHovered && "bg-[#1b74e4]/[0.05]",
                otherHovered && "md:flex-[0.85] opacity-70 md:blur-[0.6px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              )
              const cardInner = (
                <>
                  {action.sticker ? (
                    <span className="absolute right-3 top-3 z-20 inline-flex items-center rounded-full border border-[#1b74e4]/25 bg-[#1b74e4]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#1b74e4] shadow-sm backdrop-blur-sm">
                      {action.sticker}
                    </span>
                  ) : null}
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    <div className="absolute inset-0 bg-radial from-white/10 via-transparent to-transparent" />
                  </div>

                  <div className="relative z-10 flex flex-col items-center gap-5 text-center sm:gap-7">
                    <div
                      className={cn(
                        "grid h-24 w-24 place-items-center rounded-3xl border border-border bg-card/70 shadow-sm backdrop-blur-xl transition-all duration-700 group-hover:-translate-y-2 group-hover:shadow-xl sm:h-28 sm:w-28",
                        key === "transfer" && "border-[#1b74e4]/20",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-10 w-10 transition-transform duration-500 group-hover:scale-110 sm:h-11 sm:w-11 text-primary",
                        )}
                      />
                    </div>

                    <div>
                      <h2 className="text-base font-semibold text-foreground transition-all duration-500 group-hover:-translate-y-1 sm:text-lg">
                        {action.title}
                      </h2>
                      <p className="mt-2 text-xs text-muted-foreground opacity-100 transition-all duration-500 sm:text-sm md:opacity-0 md:group-hover:opacity-100">
                        {action.hint}
                      </p>
                    </div>
                  </div>
                </>
              )

              if (action.external) {
                return (
                  <a
                    key={key}
                    href={action.href}
                    target="_blank"
                    rel="noreferrer"
                    onMouseEnter={() => setHovered(key)}
                    className={cardClassName}
                  >
                    {cardInner}
                  </a>
                )
              }

              return (
                <Link
                  key={key}
                  href={action.href}
                  onMouseEnter={() => setHovered(key)}
                  className={cardClassName}
                >
                  {cardInner}
                </Link>
              )
            })}
          </div>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Tip: hover a card to expand it. DEAL and SHIP open PayPack; TRANSFER opens aWallet.
          </p>
        </div>
      </div>
    </section>
  )
}
