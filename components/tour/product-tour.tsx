"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { useAppStore } from "@/store/app-store"
import { TOUR_STEPS } from "@/lib/tour-steps"

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

const PAD = 8

export function ProductTour() {
  const tourActive = useAppStore((s) => s.tourActive)
  const tourStepIndex = useAppStore((s) => s.tourStepIndex)
  const nextTourStep = useAppStore((s) => s.nextTourStep)
  const stopTour = useAppStore((s) => s.stopTour)
  const [rect, setRect] = useState<Rect | null>(null)
  const step = TOUR_STEPS[tourStepIndex]

  useEffect(() => {
    if (!tourActive || !step) {
      setRect(null)
      return
    }

    let attachedEl: Element | null = null

    function handleAdvance() {
      // Defer so the element's own real click handler runs first.
      setTimeout(() => nextTourStep(), 50)
    }

    function sync() {
      const el = document.querySelector(step!.target)
      if (!el) {
        setRect(null)
        if (attachedEl) {
          attachedEl.removeEventListener("click", handleAdvance)
          attachedEl = null
        }
        return
      }
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })

      if (step!.waitForClick && attachedEl !== el) {
        if (attachedEl) attachedEl.removeEventListener("click", handleAdvance)
        el.addEventListener("click", handleAdvance)
        attachedEl = el
      }
    }

    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.body, { childList: true, subtree: true })
    window.addEventListener("resize", sync)
    window.addEventListener("scroll", sync, true)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", sync)
      window.removeEventListener("scroll", sync, true)
      if (attachedEl) attachedEl.removeEventListener("click", handleAdvance)
    }
  }, [tourActive, tourStepIndex, step, nextTourStep])

  if (!tourActive || !step) return null

  const tooltipWidth = 288
  const tooltipTop = rect
    ? rect.top + rect.height + PAD * 2 + 8 < window.innerHeight - 140
      ? rect.top + rect.height + PAD * 2
      : Math.max(16, rect.top - 160)
    : 0
  const tooltipLeft = rect
    ? Math.min(Math.max(16, rect.left), window.innerWidth - tooltipWidth - 16)
    : 0

  return (
    <div className="fixed inset-0 z-[999]" style={{ pointerEvents: "none" }}>
      {rect && (
        <svg className="absolute inset-0 h-full w-full">
          <defs>
            <mask id="pp-tour-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={rect.left - PAD}
                y={rect.top - PAD}
                width={rect.width + PAD * 2}
                height={rect.height + PAD * 2}
                rx={12}
                fill="black"
              />
            </mask>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="rgba(15,23,42,0.55)" mask="url(#pp-tour-mask)" />
        </svg>
      )}

      {rect && (
        <div
          className="fixed rounded-xl ring-4 ring-primary/70 transition-all duration-200"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
          }}
        />
      )}

      {rect ? (
        <div
          className="pp-animate-scale-in fixed z-[1000] rounded-2xl border border-border bg-card p-4 shadow-2xl"
          style={{ top: tooltipTop, left: tooltipLeft, width: tooltipWidth, pointerEvents: "auto" }}
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
              Step {tourStepIndex + 1} of {TOUR_STEPS.length}
            </span>
            <button
              type="button"
              onClick={stopTour}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close tour"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{step.body}</p>
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={stopTour}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Skip tour
            </button>
            {step.waitForClick ? (
              <span className="text-[11px] text-muted-foreground">Click the highlighted spot →</span>
            ) : (
              <button
                type="button"
                onClick={nextTourStep}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                {tourStepIndex === TOUR_STEPS.length - 1 ? "Finish" : "Next"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="pointer-events-auto fixed bottom-6 right-6 z-[1000] rounded-full border border-border bg-card px-4 py-2 text-xs text-muted-foreground shadow-lg">
          <button type="button" onClick={stopTour} className="hover:text-foreground">
            Skip tour
          </button>
        </div>
      )}
    </div>
  )
}
