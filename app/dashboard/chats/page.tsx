"use client"

import { useState } from "react"
import { Search, Send, Paperclip, MoreVertical, Phone, Video, User, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

const conversations = [
  {
    id: "1",
    name: "Marcello Rossi",
    initials: "MR",
    color: "from-primary to-primary/70",
    lastMessage: "Ok, I will ship the phone soon.",
    time: "2 min ago",
    unread: 2,
    deal: "iPhone 15 (256 GB)",
  },
  {
    id: "2",
    name: "Anna Bianchi",
    initials: "AB",
    color: "from-success to-success/70",
    lastMessage: "Package received, thank you!",
    time: "1h ago",
    unread: 0,
    deal: "MacBook Pro M3",
  },
  {
    id: "3",
    name: "PayPack Support",
    initials: "PP",
    color: "from-warning to-warning/70",
    lastMessage: "Your dispute has been resolved.",
    time: "3h ago",
    unread: 1,
    deal: "Support",
  },
]

const messages = [
  { id: "1", sender: "them", text: "Hi! I've confirmed the deal. When will you ship?", time: "10:30 AM" },
  { id: "2", sender: "me", text: "Hello! I'll ship it tomorrow morning via DHL Express.", time: "10:32 AM" },
  { id: "3", sender: "them", text: "Great! Can you share the tracking number once it's shipped?", time: "10:33 AM" },
  { id: "4", sender: "me", text: "Of course! I'll send it as soon as I have it.", time: "10:35 AM" },
  { id: "5", sender: "system", text: "Escrow funds locked: 500 EUR", time: "10:36 AM" },
  { id: "6", sender: "them", text: "Ok, I will ship the phone soon.", time: "10:38 AM" },
]

export default function ChatsPage() {
  const [selected, setSelected] = useState("1")
  const activeConv = conversations.find((c) => c.id === selected) || conversations[0]

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <div className="flex w-80 flex-col border-r border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full rounded-xl border border-border bg-secondary py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelected(conv.id)}
              className={cn(
                "flex w-full items-start gap-3 border-b border-border p-4 text-left transition-colors",
                selected === conv.id ? "bg-primary/5" : "hover:bg-secondary/50"
              )}
            >
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-primary-foreground", conv.color)}>
                {conv.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{conv.name}</span>
                  <span className="text-xs text-muted-foreground">{conv.time}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{conv.lastMessage}</p>
                <span className="text-[10px] text-primary">{conv.deal}</span>
              </div>
              {conv.unread > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
                  {conv.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-primary-foreground", activeConv.color)}>
              {activeConv.initials}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{activeConv.name}</h3>
              <span className="text-xs text-success">Online</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
              <Phone className="h-4 w-4" />
            </button>
            <button className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
              <Video className="h-4 w-4" />
            </button>
            <button className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-auto p-6">
          {messages.map((msg) => {
            if (msg.sender === "system") {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
                    <Shield className="h-3 w-3" />
                    {msg.text}
                  </span>
                </div>
              )
            }
            const isMe = msg.sender === "me"
            return (
              <div key={msg.id} className={cn("flex gap-3", isMe && "flex-row-reverse")}>
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold", isMe ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
                  {isMe ? "JD" : <User className="h-4 w-4" />}
                </div>
                <div className={cn("max-w-md rounded-2xl px-4 py-3", isMe ? "rounded-tr-none bg-primary text-primary-foreground" : "rounded-tl-none border border-border bg-card text-card-foreground")}>
                  <p className="text-sm">{msg.text}</p>
                  <span className={cn("mt-1 block text-[10px]", isMe ? "text-primary-foreground/70" : "text-muted-foreground")}>{msg.time}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Input */}
        <div className="border-t border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
              <Paperclip className="h-5 w-5" />
            </button>
            <input
              type="text"
              placeholder="Type a message..."
              className="flex-1 rounded-xl border border-border bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:opacity-90">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
