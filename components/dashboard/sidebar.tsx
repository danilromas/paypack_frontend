"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation"; // Добавляем useRouter
import {
  LayoutDashboard,
  MessageCircle,
  HelpCircle,
  Settings,
  LogOut,
  Package,
  Handshake,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/chats", icon: MessageCircle, label: "Chats", badge: 3 },
  { href: "/dashboard/support", icon: HelpCircle, label: "Support" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter(); // Инициализируем роутер
  const { mode, setMode } = useAppStore();

  const handleModeChange = (newMode: "deal" | "ship") => {
    setMode(newMode);
    // Перенаправляем на соответствующий маршрут
    if (newMode === "deal") {
      router.push("/dashboard"); // или /dashboard/deals, если у вас отдельная страница сделок
    } else {
      router.push("/dashboard/shipments");
    }
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-sidebar-border px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 font-bold text-primary-foreground shadow-lg">
          P
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight">PayPack</span>
          <span className="text-lg font-light text-primary">.uno</span>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="px-4 py-4">
        <div className="flex gap-1 rounded-xl bg-sidebar-accent/50 p-1">
          <button
            onClick={() => handleModeChange("deal")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              mode === "deal"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-sidebar-muted hover:text-sidebar-foreground",
            )}
          >
            <Handshake className="h-4 w-4" />
            DEAL
          </button>
          <button
            onClick={() => handleModeChange("ship")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              mode === "ship"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-sidebar-muted hover:text-sidebar-foreground",
            )}
          >
            <Package className="h-4 w-4" />
            SHIP
          </button>
        </div>
      </div>

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

      {/* Logout */}
      <div className="border-t border-sidebar-border p-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-sidebar-muted transition-all hover:bg-sidebar-accent/50 hover:text-destructive"
        >
          <LogOut className="h-5 w-5" />
          Log Out
        </Link>
      </div>
    </aside>
  );
}
