import Link from "next/link"
import { LandingHeader } from "@/components/landing/header"
import { LandingSplitHero } from "@/components/landing/split-hero"
import { HowItWorks } from "@/components/landing/how-it-works"
import { BuyerSeller } from "@/components/landing/buyer-seller"
import { SecuritySection } from "@/components/landing/security"
import { FAQSection } from "@/components/landing/faq"
import { LandingFooter } from "@/components/landing/footer"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <LandingSplitHero />
      <HowItWorks />
      <BuyerSeller />
      <SecuritySection />
      <FAQSection />
      <p className="border-t border-border/40 py-3 text-center text-[11px] leading-snug text-muted-foreground/70">
        <Link
          href="/extension/"
          className="underline decoration-transparent underline-offset-2 transition-colors hover:text-muted-foreground hover:decoration-border"
        >
          PayPack browser extension — import Facebook Marketplace listings
        </Link>
      </p>
      <LandingFooter />
    </div>
  )
}
