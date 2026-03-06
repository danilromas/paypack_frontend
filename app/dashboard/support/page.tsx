"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import {
  HelpCircle,
  MessageCircle,
  FileText,
  AlertTriangle,
  ChevronRight,
  Search,
  Clock,
  CheckCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

const categories = [
  { icon: HelpCircle, label: "General Help", desc: "Account, billing, and general questions", color: "bg-primary/10 text-primary" },
  { icon: AlertTriangle, label: "Disputes", desc: "Open or manage a transaction dispute", color: "bg-destructive/10 text-destructive" },
  { icon: FileText, label: "Documentation", desc: "Guides, tutorials, and API docs", color: "bg-success/10 text-success" },
  { icon: MessageCircle, label: "Live Chat", desc: "Talk to our support team now", color: "bg-warning/10 text-warning" },
]

const tickets = [
  { id: "TK-1234", subject: "Dispute: iPhone 15 deal #44317544", status: "open", date: "Jan 15, 2024", priority: "high" },
  { id: "TK-1201", subject: "Withdrawal not received", status: "resolved", date: "Jan 12, 2024", priority: "medium" },
  { id: "TK-1189", subject: "KYC verification issue", status: "resolved", date: "Jan 10, 2024", priority: "low" },
]

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<"help" | "tickets">("help")

  return (
    <>
      <DashboardHeader />
      <div className="flex-1 overflow-auto px-4 py-6 sm:px-6 md:p-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-2 text-xl font-bold text-foreground sm:text-2xl">Support Center</h1>
          <p className="mb-6 text-sm text-muted-foreground sm:mb-8 sm:text-base">
            {"How can we help you today?"}
          </p>

          {/* Search */}
          <div className="relative mb-6 sm:mb-8">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search for help articles, FAQ, or describe your issue..."
              className="w-full rounded-2xl border border-border bg-card py-4 pl-12 pr-4 text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Tabs */}
          <div className="mb-8 flex gap-2 rounded-xl bg-secondary/50 p-1">
            {(["help", "tickets"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 rounded-lg py-2.5 text-sm font-medium capitalize transition-all",
                  activeTab === tab ? "bg-card text-foreground shadow" : "text-muted-foreground"
                )}
              >
                {tab === "help" ? "Help Center" : "My Tickets"}
              </button>
            ))}
          </div>

          {activeTab === "help" && (
            <>
              {/* Categories */}
              <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {categories.map((cat) => (
                  <button
                    key={cat.label}
                    className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-primary/30 hover:shadow-md"
                  >
                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", cat.color)}>
                      <cat.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-card-foreground">{cat.label}</h3>
                      <p className="text-sm text-muted-foreground">{cat.desc}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                ))}
              </div>

              {/* Quick FAQ */}
              <h2 className="mb-4 text-lg font-semibold text-foreground">Popular Articles</h2>
              <div className="space-y-2">
                {[
                  "How do I open a dispute?",
                  "How long does it take to receive my refund?",
                  "How do I verify my identity (KYC)?",
                  "What are the transaction fees?",
                ].map((q) => (
                  <button
                    key={q}
                    className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-5 py-4 text-left text-sm font-medium text-foreground transition-all hover:border-primary/30"
                  >
                    {q}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </>
          )}

          {activeTab === "tickets" && (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", ticket.status === "open" ? "bg-warning/10 text-warning" : "bg-success/10 text-success")}>
                      {ticket.status === "open" ? <Clock className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{ticket.subject}</h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:gap-3">
                        <span>{ticket.id}</span>
                        <span>{ticket.date}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", ticket.priority === "high" ? "bg-destructive/10 text-destructive" : ticket.priority === "medium" ? "bg-warning/10 text-warning" : "bg-secondary text-muted-foreground")}>
                          {ticket.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className={cn("shrink-0 self-start rounded-full px-3 py-1 text-xs font-medium capitalize sm:self-center", ticket.status === "open" ? "bg-warning/10 text-warning" : "bg-success/10 text-success")}>
                    {ticket.status}
                  </span>
                </div>
              ))}

              <button className="w-full rounded-xl border border-primary/30 bg-primary/5 py-3 text-center text-sm font-medium text-primary transition-all hover:bg-primary/10">
                Create New Ticket
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
