import { LandingHero } from "@/components/landing/hero"
import { LandingHeader } from "@/components/landing/header"
import { HowItWorks } from "@/components/landing/how-it-works"
import { BuyerSeller } from "@/components/landing/buyer-seller"
import { SecuritySection } from "@/components/landing/security"
import { FAQSection } from "@/components/landing/faq"
import { LandingFooter } from "@/components/landing/footer"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <LandingHero />
      <HowItWorks />
      <BuyerSeller />
      <SecuritySection />
      <FAQSection />
      <LandingFooter />
    </div>
  )
}
