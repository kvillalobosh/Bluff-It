import { useState } from "react"
import { TopNav } from "@/components/ui/TopNav"
import { WaitingDots } from "@/components/ui/WaitingDots"
import { Countdown } from "@/components/Countdown"
import { socket } from "@/lib/socket"
import { useCountdown } from "@/lib/useCountdown"
import { WRITE_SECONDS, useGame } from "@/store/game"

// Player screen while phase === "question_staging": write and submit a fake answer.
export function PlayerAnswer() {
  const [answer, setAnswer] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { code, room, submitAnswer } = useGame()
  const remaining = useCountdown(room?.deadline)
  if (!room) return null

  // Server tracks who answered; use it so a refresh/reconnect still shows the right state
  const me = socket.id ? room.players[socket.id] : undefined
  const submitted = me?.has_answered ?? false
  const timeUp = remaining === 0

  const onSubmit = async () => {
    setBusy(true)
    setError(null)
    try {
      await submitAnswer(answer.trim())
    } catch (e) {
      // e.g. "Answer has to be fake. Get creative!" when it matches the real answer
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="player-answer-screen">
      <TopNav leftText="" centerText={`Round ${room.round}`} rightText={code ? `Room: ${code}` : "WAITING"} />

      <Countdown deadline={room.deadline} total={WRITE_SECONDS} label="" />

      <div className="player-answer-card">
        <p className="player-answer-question">{room.question}</p>
      </div>

      <div className="player-answer-form">
        {submitted ? (
          <>
            <p className="text-center font-medium text-green-600" style={{ fontFamily: "'Coiny', system-ui" }}>Locked in ✓</p>
            <WaitingDots />
          </>
        ) : (
          <form
            className="player-answer-form"
            onSubmit={(e) => {
              e.preventDefault()
              onSubmit()
            }}
          >
            <input
              className="player-answer-input"
              placeholder="Write a convincing fake answer"
              maxLength={60}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={timeUp}
              autoFocus
            />
            <button type="submit" className="player-answer-submit" disabled={busy || timeUp || !answer.trim()}>
              {timeUp ? "Time's up!" : "Submit answer"}
            </button>
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          </form>
        )}
      </div>
    </div>
  )
}
