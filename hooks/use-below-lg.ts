import * as React from "react"

/** Matches Tailwind's `lg` breakpoint — below it, list + side-panel pages show their panel in a sheet. */
const LG_BREAKPOINT = 1024

export function useIsBelowLg() {
  const [below, setBelow] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${LG_BREAKPOINT - 1}px)`)
    const onChange = () => setBelow(mql.matches)
    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return below
}
