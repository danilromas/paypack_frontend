import { FileText, Lock, PackageCheck } from "lucide-react"

const steps = [
  {
    icon: FileText,
    step: "01",
    title: "Create a Deal",
    description:
      "Buyer and seller agree on terms. The item details, price, and shipping info are recorded in a secure deal.",
  },
  {
    icon: Lock,
    step: "02",
    title: "Funds Held in Escrow",
    description:
      "The buyer deposits funds into PayPack escrow. Money is locked safely until both parties confirm.",
  },
  {
    icon: PackageCheck,
    step: "03",
    title: "Confirm & Release",
    description:
      "Once the buyer receives and confirms the item, funds are released to the seller instantly.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border bg-secondary/30 py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How Escrow Works
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Three simple steps to protect every transaction
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((item) => (
            <div key={item.step} className="relative text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <item.icon className="h-8 w-8" />
              </div>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-primary">
                Step {item.step}
              </span>
              <h3 className="mb-3 text-xl font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
