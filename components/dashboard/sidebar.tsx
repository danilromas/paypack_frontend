"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  MessageCircle,
  HelpCircle,
  Settings,
  ShieldCheck,
  Bell,
  Wallet,
  LogOut,
  Users,
  BadgeCheck,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RatingStars } from "@/components/dashboard/rating-stars";
import {
  SECTION_HOME,
  SectionSwitcher,
  isNavItemActive,
  sectionForPath,
} from "@/components/dashboard/section-switcher";

interface RatingSummary {
  avatarUrl: string | null;
  kycStatus: string;
  completedDealsCount: number;
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
  const storedMode = useAppStore((s) => s.mode);
  const mode = sectionForPath(pathname) ?? storedMode;
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
    // "Dashboard" opens the home of the section you're in — the shipments board while shipping.
    { href: SECTION_HOME[mode], icon: LayoutDashboard, label: "Dashboard" },
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
        <SectionSwitcher className="mt-4" />
      </div>

      {/* Profile */}
      <div className="border-b border-sidebar-border px-4 py-3">
        <Link
          href="/dashboard/profile"
          className={cn(
            "group flex items-center gap-3 rounded-2xl border border-sidebar-border bg-sidebar-accent/40 p-3 transition-all hover:border-primary/30 hover:bg-sidebar-accent",
            pathname.startsWith("/dashboard/profile") && "border-primary/40 bg-sidebar-accent",
          )}
        >
          <div className="relative shrink-0">
            <Avatar className="h-11 w-11 ring-2 ring-primary/25 ring-offset-2 ring-offset-sidebar">
              {rating?.avatarUrl ? <AvatarImage src={rating.avatarUrl} alt="" className="object-cover" /> : null}
              <AvatarFallback className="bg-gradient-to-br from-primary/25 to-primary/5 text-sm font-bold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            {rating?.kycStatus === "approved" && (
              <span
                title="Identity verified"
                className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-sidebar"
              >
                <BadgeCheck className="h-4 w-4 fill-primary text-sidebar" />
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
            <span className="truncate text-sm font-semibold leading-tight text-sidebar-foreground">
              {user?.name ?? "..."}
            </span>
            {rating ? (
              <>
                <span className="flex items-center gap-1.5">
                  <RatingStars score={rating.ratingAverage} size="sm" />
                  <span className="text-[11px] font-medium text-sidebar-foreground">
                    {rating.ratingAverage != null ? rating.ratingAverage.toFixed(1) : "New"}
                  </span>
                  {rating.ratingCount > 0 && (
                    <span className="text-[10px] text-sidebar-muted">({rating.ratingCount})</span>
                  )}
                </span>
                <span className="truncate text-[10px] text-sidebar-muted">
                  {rating.completedDealsCount > 0
                    ? `${rating.completedDealsCount} deal${rating.completedDealsCount === 1 ? "" : "s"} · `
                    : ""}
                  since {new Date(rating.memberSince).getFullYear()}
                </span>
              </>
            ) : (
              <span className="truncate text-xs text-sidebar-muted">{user?.email ?? ""}</span>
            )}
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-sidebar-muted transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-3">
        {navItems.map((item) => {
          const isActive = isNavItemActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                isActive
                  ? "bg-sidebar-accent font-semibold text-sidebar-foreground shadow-[inset_3px_0_0_var(--primary)]"
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
          const isActive = isNavItemActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                isActive
                  ? "bg-sidebar-accent font-semibold text-sidebar-foreground shadow-[inset_3px_0_0_var(--primary)]"
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
