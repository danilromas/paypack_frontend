import { ShieldCheck, Eye, Undo2, Banknote, Clock, Star } from "lucide-react"

export function BuyerSeller() {
  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Built for Both Sides
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Whether you are buying or selling, PayPack protects your interests.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-8 lg:mt-16 lg:grid-cols-2">
          {/* Buyers */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <h3 className="mb-6 text-xl font-bold text-foreground">
              For Buyers
            </h3>
            <ul className="space-y-5">
              {[
                {
                  icon: ShieldCheck,
                  title: "Money-back guarantee",
                  desc: "If the item doesn't match, get a full refund.",
                },
                {
                  icon: Eye,
                  title: "Full transparency",
                  desc: "Track every step of the transaction in real time.",
                },
                {
                  icon: Undo2,
                  title: "Easy disputes",
                  desc: "Open a dispute with one click if anything goes wrong.",
                },
              ].map((item) => (
                <li key={item.title} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-card-foreground">
                      {item.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Sellers */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <h3 className="mb-6 text-xl font-bold text-foreground">
              For Sellers
            </h3>
            <ul className="space-y-5">
              {[
                {
                  icon: Banknote,
                  title: "Guaranteed payment",
                  desc: "Funds are secured before you ship. No chargebacks.",
                },
                {
                  icon: Clock,
                  title: "Fast payouts",
                  desc: "Funds released instantly upon buyer confirmation.",
                },
                {
                  icon: Star,
                  title: "Build reputation",
                  desc: "Completed deals boost your seller rating and trust score.",
                },
              ].map((item) => (
                <li key={item.title} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-card-foreground">
                      {item.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
