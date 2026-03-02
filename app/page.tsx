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
      <LandingFooter />
    </div>
  )
}
