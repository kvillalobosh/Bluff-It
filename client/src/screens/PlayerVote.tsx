import { useState } from "react"
import { Countdown } from "@/components/Countdown"
import { Button } from "@/components/ui/button"
import { socket } from "@/lib/socket"
import { useCountdown } from "@/lib/useCountdown"
import { VOTE_SECONDS, useGame } from "@/store/game"

// Shown on the "locked in" screen — one picked at random per round
const SUSPENSE_LINES = [
  "Locked in… no take-backs.",
  "Your fate is sealed.",
  "The truth is out there…",
  "Hold your breath…",
  "Drumroll, please…",
]

// Player screen while phase === "question_voting": pick the answer you think is real.
export function PlayerVote() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // useState initializer runs once per mount, so the line doesn't change on every re-render
  const [suspense] = useState(() => SUSPENSE_LINES[Math.floor(Math.random() * SUSPENSE_LINES.length)])
  const { room, myAnswer, myVote, submitVote } = useGame()
  const remaining = useCountdown(room?.deadline)
  if (!room) return null

  const me = socket.id ? room.players[socket.id] : undefined
  const active = Object.values(room.players).filter((p) => p.connected)
  const voted = active.filter((p) => p.has_voted).length
  const timeUp = remaining === 0

  const onVote = async (choice: string) => {
    setBusy(true)
    setError(null)
    try {
      await submitVote(choice)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  // Already voted: grey suspense screen until the server moves to "results"
  if (me?.has_voted) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-3xl font-bold">{suspense}</p>
        {myVote && <p className="text-muted-foreground">You picked “{myVote.toLowerCase()}”</p>}
        <p className="text-sm text-muted-foreground">
          {voted}/{active.length} voted
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-6 px-4 py-6">
      <Countdown deadline={room.deadline} total={VOTE_SECONDS} label="Which answer is real?" />

      {/* Question card */}
      <div className="rounded-xl border p-6">
        <p className="text-center text-2xl font-bold">{room.question}</p>
      </div>

      {/* Same shuffled order as the host screen, minus this player's own fake */}
      <div className="grid gap-3">
        {room.choices
          .filter((c) => c !== myAnswer)
          .map((choice) => (
            <Button
              key={choice}
              variant="outline"
              size="lg"
              className="h-auto min-h-14 rounded-xl py-3 text-base whitespace-normal"
              disabled={busy || timeUp}
              onClick={() => onVote(choice)}
            >
              {choice.toLowerCase()}
            </Button>
          ))}
      </div>

      {timeUp && <p className="text-center text-sm text-muted-foreground">Time's up!</p>}
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  )
}
