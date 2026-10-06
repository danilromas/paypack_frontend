import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

/** Read-only 5-star row; `count` (when given) renders the "(12)" review tally next to it. */
export function RatingStars({
  score,
  count,
  size = "md",
  className,
}: {
  score: number | null
  count?: number
  size?: "sm" | "md"
  className?: string
}) {
  const iconClass = size === "sm" ? "h-3 w-3" : "h-4 w-4"
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={cn(
              iconClass,
              score != null && n <= Math.round(score)
                ? "fill-warning text-warning"
                : "text-muted-foreground/30",
            )}
          />
        ))}
      </span>
      {count !== undefined && (
        <span className={cn("text-muted-foreground", size === "sm" ? "text-[10px]" : "text-xs")}>
          ({count})
        </span>
      )}
    </span>
  )
}
