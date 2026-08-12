"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, Send, User as UserIcon, Shield } from "lucide-react"
import { cn, formatDealRelativeTime } from "@/lib/utils"
import { DashboardHeader } from "@/components/dashboard/header"
import { useAppStore } from "@/store/app-store"
import type { ChatMessageDTO } from "@/lib/chat"

function initials(name: string | null | undefined) {
  if (!name) return "?"
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function ChatsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { chatThreads, refreshChats, user } = useAppStore()
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("thread"))
  const [messages, setMessages] = useState<ChatMessageDTO[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    refreshChats().catch(() => {})
    const interval = setInterval(() => refreshChats().catch(() => {}), 4000)
    return () => clearInterval(interval)
  }, [refreshChats])

  useEffect(() => {
    if (!selectedId && chatThreads.length > 0) {
      setSelectedId(chatThreads[0].threadId)
    }
  }, [chatThreads, selectedId])

  useEffect(() => {
    if (!selectedId) {
      setMessages([])
      return
    }
    let cancelled = false
    async function load() {
      const res = await fetch(`/api/chats/${selectedId}/messages`)
      if (!cancelled && res.ok) setMessages(await res.json())
    }
    load()
    const interval = setInterval(load, 4000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [selectedId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  const filteredThreads = useMemo(() => {
    if (!search.trim()) return chatThreads
    const q = search.toLowerCase()
    return chatThreads.filter(
      (t) => t.dealTitle.toLowerCase().includes(q) || (t.otherName ?? "").toLowerCase().includes(q),
    )
  }, [chatThreads, search])

  const activeThread = chatThreads.find((t) => t.threadId === selectedId) ?? null

  function selectThread(threadId: string) {
    setSelectedId(threadId)
    router.replace("/dashboard/chats/", { scroll: false })
  }

  async function sendMessage() {
    if (!selectedId || !input.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/chats/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim() }),
      })
      if (res.ok) {
        const msg = (await res.json()) as ChatMessageDTO
        setMessages((prev) => [...prev, msg])
        setInput("")
        refreshChats().catch(() => {})
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <DashboardHeader />
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Sidebar */}
        <div className="flex w-full flex-col border-b border-border bg-card md:w-80 md:border-b-0 md:border-r">
          <div className="border-b border-border p-3 sm:p-4">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full rounded-xl border border-border bg-secondary py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {filteredThreads.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                No conversations yet. Invite a counterparty from a deal to start chatting.
              </p>
            ) : (
              filteredThreads.map((t) => (
                <button
                  key={t.threadId}
                  onClick={() => selectThread(t.threadId)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border p-4 text-left transition-colors",
                    selectedId === t.threadId ? "bg-primary/5" : "hover:bg-secondary/50",
                  )}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-sm font-semibold text-primary-foreground">
                    {initials(t.otherName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {t.otherName ?? t.otherInvitedEmail ?? "Invited"}
                      </span>
                      {t.lastMessageAt ? (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDealRelativeTime(t.lastMessageAt)}
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{t.lastMessage ?? "No messages yet"}</p>
                    <span className="text-[10px] text-primary">{t.dealTitle}</span>
                  </div>
                  {t.unreadCount > 0 ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
                      {t.unreadCount}
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex flex-1 flex-col">
          {!activeThread ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
              Select a conversation, or invite a counterparty from a deal to start one.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-sm font-semibold text-primary-foreground">
                    {initials(activeThread.otherName)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {activeThread.otherName ?? activeThread.otherInvitedEmail ?? "Waiting to join"}
                    </h3>
                    <span className="text-xs text-muted-foreground">{activeThread.dealTitle}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-auto p-4 sm:p-6">
                {!activeThread.otherJoined ? (
                  <div className="flex justify-center">
                    <span className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
                      <Shield className="h-3 w-3" />
                      Waiting for {activeThread.otherInvitedEmail ?? "the counterparty"} to join PayPack
                    </span>
                  </div>
                ) : null}
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground">No messages yet — say hello.</p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={cn("flex gap-3", msg.isMine && "flex-row-reverse")}>
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          msg.isMine ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                        )}
                      >
                        {msg.isMine ? initials(user?.name) : <UserIcon className="h-4 w-4" />}
                      </div>
                      <div
                        className={cn(
                          "max-w-md rounded-2xl px-4 py-3",
                          msg.isMine
                            ? "rounded-tr-none bg-primary text-primary-foreground"
                            : "rounded-tl-none border border-border bg-card text-card-foreground",
                        )}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <span
                          className={cn(
                            "mt-1 block text-[10px]",
                            msg.isMine ? "text-primary-foreground/70" : "text-muted-foreground",
                          )}
                        >
                          {formatDealRelativeTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-border bg-card p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 rounded-xl border border-border bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !input.trim()}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default function ChatsPage() {
  return (
    <Suspense fallback={null}>
      <ChatsPageContent />
    </Suspense>
  )
}
