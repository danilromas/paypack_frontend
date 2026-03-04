"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

const shipments = [
  {
    id: "1",
    sender: {
      name: "Ivanov Ivan",
      location: "Moscow, Russia",
      initials: "II",
      color: "from-primary to-primary/70",
    },
    receiver: { name: "Petrov Sergey", location: "Saint Petersburg" },
    service: "Express 24h",
    serviceColor: "bg-primary/10 text-primary border-primary/20",
    dimensions: "30x20x15 cm",
    weight: "2.5 kg",
    status: "arrived" as const,
    createdAt: "2024-03-15T10:30:00Z",
  },
  {
    id: "2",
    sender: {
      name: "Anna Smith",
      location: "London, UK",
      initials: "AS",
      color: "from-success to-success/70",
    },
    receiver: { name: "John Doe", location: "Manchester, UK" },
    service: "Standard",
    serviceColor: "bg-secondary text-secondary-foreground border-border",
    dimensions: "40x30x25 cm",
    weight: "5.0 kg",
    status: "in-transit" as const,
    createdAt: "2024-03-14T14:20:00Z",
  },
  {
    id: "3",
    sender: {
      name: "Maria Kuznetsova",
      location: "Berlin, Germany",
      initials: "MK",
      color: "from-warning to-warning/70",
    },
    receiver: { name: "Hans Mueller", location: "Munich, Germany" },
    service: "Same Day",
    serviceColor: "bg-primary/10 text-primary border-primary/20",
    dimensions: "25x15x10 cm",
    weight: "1.2 kg",
    status: "pending" as const,
    createdAt: "2024-03-16T09:15:00Z",
  },
];

type SortDirection = "asc" | "desc";

function getStatusBadge(status: "arrived" | "in-transit" | "pending") {
  switch (status) {
    case "arrived":
      return {
        label: "ARRIVED",
        className: "bg-success text-success-foreground",
      };
    case "in-transit":
      return {
        label: "IN TRANSIT",
        className: "bg-primary text-primary-foreground",
      };
    case "pending":
      return {
        label: "PENDING",
        className: "bg-warning text-warning-foreground",
      };
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ShipmentsTable() {
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  };

  const sortedShipments = [...shipments].sort((a, b) => {
    const comparison =
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sortDirection === "asc" ? comparison : -comparison;
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <table className="w-full">
        <thead className="border-b border-border bg-secondary/50">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Receiver
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sender
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Service
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dimensions/Weight
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </th>
            <th
              className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground"
              onClick={handleSort}
            >
              <div className="flex items-center gap-1">
                Date Created
                {sortDirection === "asc" ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sortedShipments.map((s) => {
            const badge = getStatusBadge(s.status);
            return (
              <tr
                key={s.id}
                className="transition-colors hover:bg-secondary/30"
              >
                <td className="px-6 py-5">
                  <div className="font-semibold text-foreground">
                    {s.receiver.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.receiver.location}
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-semibold text-foreground">
                        {s.sender.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.sender.location}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
                      s.serviceColor,
                    )}
                  >
                    {s.service}
                  </span>
                </td>
                <td className="px-6 py-5 text-sm text-foreground">
                  {s.dimensions}
                  <br />
                  <span className="text-muted-foreground">{s.weight}</span>
                </td>
                <td className="px-6 py-5">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-semibold",
                      badge.className,
                    )}
                  >
                    {badge.label}
                  </span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="font-medium text-foreground">
                    {formatDate(s.createdAt)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2">
                    <button className="text-sm font-medium text-primary hover:underline">
                      Tracking
                    </button>
                    <span className="text-border">|</span>
                    <button className="text-sm text-muted-foreground hover:text-foreground">
                      Details
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
