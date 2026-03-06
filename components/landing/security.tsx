import { Shield, Fingerprint, Lock, ScanFace } from "lucide-react"

export function SecuritySection() {
  return (
    <section id="security" className="border-t border-border bg-secondary/30 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Enterprise-Grade Security
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Multi-layered verification and bank-level encryption protect every
            transaction.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
          {[
            {
              icon: Shield,
              title: "Escrow Protection",
              desc: "Funds are held securely in regulated escrow accounts, never touching our operating funds.",
            },
            {
              icon: Fingerprint,
              title: "KYC Verification",
              desc: "Multi-level identity verification (email, phone, ID document, proof of address) ensures real users.",
            },
            {
              icon: Lock,
              title: "End-to-End Encryption",
              desc: "All messages, documents, and payment data are encrypted with AES-256 bit encryption.",
            },
            {
              icon: ScanFace,
              title: "Fraud Detection",
              desc: "AI-powered fraud detection monitors every transaction for suspicious activity in real time.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-semibold text-card-foreground">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
