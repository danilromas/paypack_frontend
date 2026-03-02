"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    q: "How does escrow work?",
    a: "Escrow holds funds until both parties confirm the transaction. Buyer deposits money, seller ships item, buyer confirms receipt, and funds are released to the seller.",
  },
  {
    q: "What if I don't receive my item?",
    a: "Open a dispute within 7 days of expected delivery. Our team will investigate and refund if the item wasn't delivered.",
  },
  {
    q: "How do I cancel a deal?",
    a: "Both parties must agree to cancel. Go to Deal Details, Actions, and Request Cancellation. Funds return to the buyer within 24 hours.",
  },
  {
    q: "What are the fees?",
    a: "PayPack charges a flat 3% transaction fee on the deal amount. Shipping costs are separate and paid directly to the carrier.",
  },
  {
    q: "Is my personal information safe?",
    a: "Yes. We use bank-level encryption for all data. Your personal information is only shared with the counterparty as needed for shipping.",
  },
  {
    q: "How long does it take to receive my funds?",
    a: "Once the buyer confirms receipt, funds are released to your wallet instantly. Withdrawal to your bank account takes 1-3 business days.",
  },
]

export function FAQSection() {
  return (
    <section id="faq" className="py-24">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to know about PayPack Uno
          </p>
        </div>

        <Accordion type="single" collapsible className="mt-12">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-base font-medium text-foreground">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
