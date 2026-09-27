import { useCountdown } from "@/lib/useCountdown"

// Timer bar that fills up as time runs out, with the seconds left next to it.
// `total` is the phase length in seconds (WRITE_SECONDS / VOTE_SECONDS) so we know how full the bar is.
export function Countdown({ deadline, total, label }: { deadline: number | null | undefined; total: number; label?: string }) {
  const remaining = useCountdown(deadline)
  const seconds = remaining === null ? null : Math.ceil(remaining)
  const filled = remaining === null ? 0 : Math.min(1, 1 - remaining / total) // 0 → 1 as time passes
  const urgent = seconds !== null && seconds <= 10

  return (
    <div className="player-answer-timer">
      {label && <p className="player-answer-timer-label">{label}</p>}
      <div className="player-answer-timer-row">
        <div className="player-answer-timer-track">
          <div
            className={`player-answer-timer-fill ${urgent ? "player-answer-timer-fill--urgent" : ""}`}
            style={{ width: `${filled * 100}%` }}
          />
        </div>
        <span className={`player-answer-timer-seconds ${urgent ? "player-answer-timer-seconds--urgent" : ""}`}>
          {seconds ?? "--"}
        </span>
      </div>
    </div>
  )
}
