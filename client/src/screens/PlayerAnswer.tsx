import { useState } from "react"
import { Countdown } from "@/components/Countdown"
import { Button } from "@/components/ui/button"
import { socket } from "@/lib/socket"
import { useCountdown } from "@/lib/useCountdown"
import { WRITE_SECONDS, useGame } from "@/store/game"

// Player screen while phase === "question_staging": write and submit a fake answer.
export function PlayerAnswer() {
  const [answer, setAnswer] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { room, myAnswer, submitAnswer } = useGame()
  const remaining = useCountdown(room?.deadline)
  if (!room) return null

  // Server tracks who answered; use it so a refresh/reconnect still shows the right state
  const me = socket.id ? room.players[socket.id] : undefined
  const submitted = me?.has_answered ?? false
  const timeUp = remaining === 0

  const active = Object.values(room.players).filter((p) => p.connected)
  const answered = active.filter((p) => p.has_answered).length

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
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-6 px-4 py-6">
      {/* Countdown on top */}
      <Countdown deadline={room.deadline} total={WRITE_SECONDS} label={`Round ${room.round} · Write a fake answer!`} />

      {/* Question card */}
      <div className="rounded-xl border p-6">
        <p className="text-center text-2xl font-bold">{room.question}</p>
      </div>

      {/* Answer card */}
      <div className="flex flex-col gap-3 rounded-xl border p-4">
        {submitted ? (
          <>
            <p className="text-center font-medium text-green-600">Locked in ✓</p>
            {myAnswer && <p className="text-center text-muted-foreground">“{myAnswer.toLowerCase()}”</p>}
            <p className="text-center text-sm text-muted-foreground">
              Waiting for others… {answered}/{active.length} submitted
            </p>
          </>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              onSubmit()
            }}
          >
            <input
              className="h-12 rounded-lg border px-3"
              placeholder="Write a convincing fake answer"
              maxLength={60}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={timeUp}
              autoFocus
            />
            <Button type="submit" size="lg" className="h-12 text-base" disabled={busy || timeUp || !answer.trim()}>
              {timeUp ? "Time's up!" : "Submit answer"}
            </Button>
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          </form>
        )}
      </div>
    </div>
  )
}
