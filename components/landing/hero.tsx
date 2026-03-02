import Link from "next/link"
import { ArrowRight, Shield, Truck, Headphones } from "lucide-react"

export function LandingHero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-32">
      {/* Subtle background accent */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-sm text-secondary-foreground">
            <Shield className="h-4 w-4 text-primary" />
            Trusted by 10,000+ users worldwide
          </div>

          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Secure internet deals
            <br />
            <span className="text-primary">without risk</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            PayPack Uno holds funds safely in escrow until both buyer and seller
            confirm the transaction. No trust required — just secure, transparent
            deals.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:opacity-90"
            >
              Create Deal
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-8 py-3.5 text-base font-medium text-foreground transition-all hover:bg-secondary"
            >
              How it works
            </a>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mx-auto mt-20 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              icon: Shield,
              title: "Secure Escrow",
              desc: "Funds locked until delivery confirmed",
            },
            {
              icon: Truck,
              title: "Fast Shipping",
              desc: "Worldwide delivery network",
            },
            {
              icon: Headphones,
              title: "24/7 Support",
              desc: "Always here to help",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-border bg-card p-6 text-center transition-all hover:border-primary/30 hover:shadow-lg"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-1 font-semibold text-card-foreground">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
