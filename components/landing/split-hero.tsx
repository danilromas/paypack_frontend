"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRight, Handshake, Package, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

type ActionKey = "deal" | "ship"

const ACTIONS: Record<
  ActionKey,
  {
    title: string
    hint: string
    href: string
    icon: typeof Handshake
  }
> = {
  deal: {
    title: "New Deal",
    hint: "Create secure escrow transaction",
    href: "/dashboard?mode=deal&new=1",
    icon: Handshake,
  },
  ship: {
    title: "New Shipment",
    hint: "Track & manage delivery",
    href: "/dashboard/shipments?mode=ship&new=1",
    icon: Package,
  },
}

export function LandingSplitHero() {
  const [hovered, setHovered] = useState<ActionKey | null>(null)

  const cards = useMemo(() => (Object.keys(ACTIONS) as ActionKey[]), [])

  return (
    <section
      id="about"
      className="relative overflow-hidden pt-28 pb-14 lg:pt-36 lg:pb-20"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute left-1/2 top-24 h-[320px] w-[520px] -translate-x-1/2 rounded-full bg-success/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-sm text-foreground backdrop-blur-xl">
            <Shield className="h-4 w-4 text-primary" />
            Secure internet deals & shipments in one place
          </div>

          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            PayPack<span className="font-light text-primary">.uno</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Choose what you want to create today. Smooth UX, modern design, and escrow-grade safety.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-5xl">
          <div
            className="relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card/40 backdrop-blur-xl md:flex-row"
            onMouseLeave={() => setHovered(null)}
          >
            {/* Left / Right cards */}
            {cards.map((key, idx) => {
              const action = ACTIONS[key]
              const isHovered = hovered === key
              const otherHovered = hovered !== null && !isHovered
              const Icon = action.icon

              return (
                <Link
                  key={key}
                  href={action.href}
                  onMouseEnter={() => setHovered(key)}
                  className={cn(
                    "group relative flex min-h-[240px] flex-1 items-center justify-center overflow-hidden px-8 py-12 transition-all duration-700",
                    idx === 0 && "md:border-r md:border-border/60",
                    isHovered && "md:flex-[1.35] bg-primary/[0.04]",
                    key === "ship" && isHovered && "bg-success/[0.04]",
                    otherHovered && "md:flex-[0.85] opacity-70 md:blur-[0.6px]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  )}
                >
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    <div className="absolute inset-0 bg-radial from-white/10 via-transparent to-transparent" />
                  </div>

                  <div className="relative z-10 flex flex-col items-center gap-7 text-center">
                    <div className="grid h-28 w-28 place-items-center rounded-3xl border border-border bg-card/70 shadow-sm backdrop-blur-xl transition-all duration-700 group-hover:-translate-y-2 group-hover:shadow-xl">
                      <Icon className="h-11 w-11 text-primary transition-transform duration-500 group-hover:scale-110" />
                    </div>

                    <div>
                      <h2 className="text-sm font-semibold tracking-[0.32em] text-foreground uppercase transition-all duration-500 group-hover:-translate-y-1">
                        {action.title}
                      </h2>
                      <p className="mt-2 text-sm text-muted-foreground opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                        {action.hint}
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/60 px-4 py-2 text-sm font-medium text-foreground opacity-0 backdrop-blur transition-all duration-500 group-hover:opacity-100">
                      Open
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                </Link>
              )
            })}

            {/* Center merge line */}
            <div
              className={cn(
                "pointer-events-none absolute left-1/2 top-10 hidden h-[calc(100%-5rem)] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-border/70 to-transparent opacity-70 md:block transition-opacity duration-300",
                hovered !== null && "opacity-0"
              )}
            />
          </div>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Tip: hover a card to expand it. Works great on desktop; on mobile they stack.
          </p>
        </div>
      </div>
    </section>
  )
}

