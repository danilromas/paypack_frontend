"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { ChevronUp, ChevronDown, PackageSearch } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

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
type SortField = "date" | "receiver" | "sender" | "status";

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
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedShipments = [...shipments].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case "receiver":
        comparison = a.receiver.name.localeCompare(b.receiver.name);
        break;
      case "sender":
        comparison = a.sender.name.localeCompare(b.sender.name);
        break;
      case "status":
        comparison = a.status.localeCompare(b.status);
        break;
      case "date":
      default:
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  return (
    <>
      {/* Mobile: Card layout */}
      <div className="space-y-3 md:hidden">
        {sortedShipments.map((s) => {
          const badge = getStatusBadge(s.status);
          return (
            <div
              key={s.id}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-foreground">
                    {s.receiver.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.receiver.location}
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold",
                    badge.className,
                  )}
                >
                  {badge.label}
                </span>
              </div>
              <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span>From {s.sender.name}</span>
                <span>•</span>
                <span> {s.service}</span>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                <span className="text-xs text-muted-foreground">
                  {formatDate(s.createdAt)}
                </span>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="text-xs font-medium text-primary">
                        Tracking
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
                      <DialogHeader className="space-y-1">
                        <DialogTitle className="flex items-center justify-between text-base">
                          <span>Shipment tracking</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {`#${s.id}`}
                          </Badge>
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                          Current status and history for this shipment.
                        </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4 space-y-3 text-sm">
                          <div className="flex items-center gap-2">
                            <PackageSearch className="h-4 w-4 text-primary" />
                            <span className="font-medium text-foreground">
                              {s.service}
                            </span>
                          </div>
                          <Separator />
                          <ul className="space-y-1 text-xs text-muted-foreground">
                            <li>Package created • {formatDate(s.createdAt)}</li>
                            <li>Picked up by courier • +2h</li>
                            <li>In transit to destination hub • +8h</li>
                          </ul>
                        </div>
                      </DialogContent>
                    </Dialog>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="text-xs text-muted-foreground">
                        Details
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
                      <DialogHeader className="space-y-1">
                        <DialogTitle className="flex items-center justify-between text-base">
                          <span>Shipment details</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {s.status.toUpperCase()}
                          </Badge>
                        </DialogTitle>
                        </DialogHeader>
                        <div className="mt-4 space-y-3 text-sm">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs text-muted-foreground">
                                Receiver
                              </div>
                              <div className="font-semibold text-foreground">
                                {s.receiver.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {s.receiver.location}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">
                                Sender
                              </div>
                              <div className="font-semibold text-foreground">
                                {s.sender.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {s.sender.location}
                              </div>
                            </div>
                          </div>
                          <Separator />
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1 rounded-lg bg-secondary px-3 py-2">
                              <div className="text-muted-foreground">
                                Dimensions
                              </div>
                              <div className="font-medium text-foreground">
                                {s.dimensions}
                              </div>
                            </div>
                            <div className="space-y-1 rounded-lg bg-secondary px-3 py-2">
                              <div className="text-muted-foreground">
                                Weight
                              </div>
                              <div className="font-medium text-foreground">
                                {s.weight}
                              </div>
                            </div>
                          </div>
                          <div className="pt-2">
                            <Button className="w-full" size="sm">
                              Open full shipment page
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: Table layout */}
      <div className="hidden overflow-x-auto md:block">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <table className="w-full">
        <thead className="border-b border-border bg-secondary/50">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <button
                type="button"
                onClick={() => handleSort("receiver")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 transition-colors",
                  sortField === "receiver"
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-secondary/70 hover:text-foreground"
                )}
              >
                Receiver
                {sortField === "receiver" &&
                  (sortDirection === "asc" ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  ))}
              </button>
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <button
                type="button"
                onClick={() => handleSort("sender")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 transition-colors",
                  sortField === "sender"
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-secondary/70 hover:text-foreground"
                )}
              >
                Sender
                {sortField === "sender" &&
                  (sortDirection === "asc" ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  ))}
              </button>
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Service
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dimensions/Weight
            </th>
            <th className="whitespace-nowrap px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <button
                type="button"
                onClick={() => handleSort("status")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 transition-colors",
                  sortField === "status"
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-secondary/70 hover:text-foreground"
                )}
              >
                Status
                {sortField === "status" &&
                  (sortDirection === "asc" ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  ))}
              </button>
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <button
                type="button"
                onClick={() => handleSort("date")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 transition-colors",
                  sortField === "date"
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-secondary/70 hover:text-foreground"
                )}
              >
                Date Created
                {sortField === "date" &&
                  (sortDirection === "asc" ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  ))}
              </button>
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
                <td className="px-6 py-5 whitespace-nowrap">
                  <span
                    className={cn(
                      "inline-block whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold",
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
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="text-sm font-medium text-primary hover:underline">
                          Tracking
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader className="space-y-1">
                          <DialogTitle className="flex items-center justify-between text-base">
                            <span>Shipment tracking</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {`#${s.id}`}
                          </Badge>
                          </DialogTitle>
                          <DialogDescription className="text-xs">
                            Current status and history for this shipment.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4 space-y-3 text-sm">
                          <div className="flex items-center gap-2">
                            <PackageSearch className="h-4 w-4 text-primary" />
                            <span className="font-medium text-foreground">
                              {s.service}
                            </span>
                          </div>
                          <Separator />
                          <ul className="space-y-1 text-xs text-muted-foreground">
                            <li>Package created • {formatDate(s.createdAt)}</li>
                            <li>Picked up by courier • +2h</li>
                            <li>In transit to destination hub • +8h</li>
                          </ul>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <span className="text-border">|</span>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="text-sm text-muted-foreground hover:text-foreground">
                          Details
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader className="space-y-1">
                          <DialogTitle className="flex items-center justify-between text-base">
                            <span>Shipment details</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {s.status.toUpperCase()}
                            </Badge>
                          </DialogTitle>
                          <DialogDescription className="text-xs">
                            Receiver, sender and package information.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4 space-y-3 text-sm">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs text-muted-foreground">
                                Receiver
                              </div>
                              <div className="font-semibold text-foreground">
                                {s.receiver.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {s.receiver.location}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">
                                Sender
                              </div>
                              <div className="font-semibold text-foreground">
                                {s.sender.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {s.sender.location}
                              </div>
                            </div>
                          </div>
                          <Separator />
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1 rounded-lg bg-secondary px-3 py-2">
                              <div className="text-muted-foreground">
                                Dimensions
                              </div>
                              <div className="font-medium text-foreground">
                                {s.dimensions}
                              </div>
                            </div>
                            <div className="space-y-1 rounded-lg bg-secondary px-3 py-2">
                              <div className="text-muted-foreground">
                                Weight
                              </div>
                              <div className="font-medium text-foreground">
                                {s.weight}
                              </div>
                            </div>
                          </div>
                          <div className="pt-2">
                            <Button className="w-full" size="sm">
                              Open full shipment page
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
        </div>
      </div>
    </div>
    </>
  );
}
