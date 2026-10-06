"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Handshake,
  MessageCircle,
  HelpCircle,
  Settings,
  ShieldCheck,
  Bell,
  Wallet,
  LogOut,
  Package,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RatingStars } from "@/components/dashboard/rating-stars";

interface RatingSummary {
  ratingAverage: number | null;
  ratingCount: number;
  memberSince: string;
}

const lowerNavItems = [
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
  { href: "/admin", icon: ShieldCheck, label: "Admin" },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const chatThreads = useAppStore((s) => s.chatThreads);
  const notifications = useAppStore((s) => s.notifications);
  const unreadChats = chatThreads.reduce((sum, t) => sum + t.unreadCount, 0);
  const unreadNotifications = notifications.filter((n) => !n.readAt).length;
  const [rating, setRating] = useState<RatingSummary | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    fetch(`/api/users/${user.id}/public`, { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<RatingSummary>) : null))
      .then((data) => {
        if (!cancelled) setRating(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dashboard/deals", icon: Handshake, label: "Deals" },
    { href: "/dashboard/shipments", icon: Package, label: "Shipments" },
    { href: "/dashboard/chats", icon: MessageCircle, label: "Chats", badge: unreadChats || undefined },
    { href: "/dashboard/users", icon: Users, label: "Find users" },
    { href: "/dashboard/support", icon: HelpCircle, label: "Support" },
    {
      href: "/dashboard/notifications",
      icon: Bell,
      label: "Notifications",
      badge: unreadNotifications || undefined,
    },
    { href: "/dashboard/wallet", icon: Wallet, label: "Wallet" },
  ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-sidebar text-sidebar-foreground md:flex">
      {/* Logo */}
      <div className="border-b border-sidebar-border px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="PayPack logo"
            width={48}
            height={48}
            className="h-12 w-12 rounded-xl"
            priority
          />
          <div className="flex flex-col">
            <div>
              <span className="text-lg font-bold tracking-tight">PayPack</span>
              <span className="text-lg font-light text-primary">.uno</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Profile */}
      <Link
        href="/dashboard/profile"
        className={cn(
          "flex items-center gap-3 border-b border-sidebar-border px-6 py-4 transition-colors hover:bg-sidebar-accent/50",
          pathname.startsWith("/dashboard/profile") && "bg-sidebar-accent",
        )}
      >
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-sidebar-accent text-sm font-bold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col text-left text-sm">
          <span className="truncate font-semibold text-sidebar-foreground">
            {user?.name ?? "..."}
          </span>
          {rating ? (
            <>
              <RatingStars score={rating.ratingAverage} count={rating.ratingCount} size="sm" />
              <span className="truncate text-[10px] text-sidebar-muted">
                On PayPack since {new Date(rating.memberSince).getFullYear()}
              </span>
            </>
          ) : (
            <span className="truncate text-xs text-sidebar-muted">{user?.email ?? ""}</span>
          )}
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                isActive
                  ? "bg-sidebar-accent text-primary"
                  : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
              {item.badge ? (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-sidebar-border px-4 py-3">
        {lowerNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                isActive
                  ? "bg-sidebar-accent text-primary"
                  : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Logout */}
      <div className="border-t border-sidebar-border p-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-sidebar-muted transition-all hover:bg-sidebar-accent/50 hover:text-destructive"
        >
          <LogOut className="h-5 w-5" />
          Log Out
        </button>
      </div>
    </aside>
  );
}
