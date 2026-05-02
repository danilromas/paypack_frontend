import { formatDistanceToNow } from "date-fns"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** ISO timestamps from API → relative label; passthrough if invalid. */
export function formatDealRelativeTime(isoOrText: string) {
  const d = new Date(isoOrText)
  if (Number.isNaN(d.getTime())) return isoOrText
  return formatDistanceToNow(d, { addSuffix: true })
}

export function formatDealDateTime(isoOrText: string) {
  const d = new Date(isoOrText)
  if (Number.isNaN(d.getTime())) return isoOrText
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d)
}
