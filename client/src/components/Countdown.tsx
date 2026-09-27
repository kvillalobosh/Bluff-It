import { useCountdown } from "@/lib/useCountdown"

// Timer bar that fills up as time runs out, with the seconds left next to it.
// `total` is the phase length in seconds (WRITE_SECONDS / VOTE_SECONDS) so we know how full the bar is.
export function Countdown({ deadline, total, label }: { deadline: number | null | undefined; total: number; label?: string }) {
  const remaining = useCountdown(deadline)
  const seconds = remaining === null ? null : Math.ceil(remaining)
  const filled = remaining === null ? 0 : Math.min(1, 1 - remaining / total) // 0 → 1 as time passes
  const urgent = seconds !== null && seconds <= 10

  return (
    <div className="flex flex-col gap-2">
      {label && <p className="text-center text-sm text-muted-foreground">{label}</p>}
      <div className="flex items-center gap-3">
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-muted">
          {/* Width updates every 250ms; the linear transition smooths it into a continuous fill */}
          <div
            className={`h-full rounded-full transition-[width] duration-250 ease-linear ${urgent ? "bg-red-600" : "bg-primary"}`}
            style={{ width: `${filled * 100}%` }}
          />
        </div>
        <span className={`w-12 text-right font-mono text-2xl font-bold tabular-nums ${urgent ? "text-red-600" : ""}`}>
          {seconds ?? "--"}
        </span>
      </div>
    </div>
  )
}
