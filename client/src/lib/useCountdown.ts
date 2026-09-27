import { useEffect, useState } from "react"

// Seconds left (with decimals) until `deadline` (unix seconds from the server), ticking down locally.
// Returns null when there's no deadline, and never goes below 0.
export function useCountdown(deadline: number | null | undefined) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!deadline) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id) // stop ticking when the screen goes away or deadline changes
  }, [deadline])

  if (!deadline) return null
  return Math.max(0, deadline - now / 1000)
}
