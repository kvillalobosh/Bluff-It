import { useState } from "react"
import { TopNav } from "@/components/ui/TopNav"
import { WaitingDots } from "@/components/ui/WaitingDots"
import { Countdown } from "@/components/Countdown"
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
  const { code, room, myAnswer, myVote, submitVote } = useGame()
  const remaining = useCountdown(room?.deadline)
  if (!room) return null

  const suspense = SUSPENSE_LINES[Math.floor(Math.random() * SUSPENSE_LINES.length)]
  const me = socket.id ? room.players[socket.id] : undefined
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
      <div className="player-answer-screen">
        <TopNav leftText="" centerText={`Round ${room.round}`} rightText={code ? `Room: ${code}` : "WAITING"} />

        <div className="player-result-card">
          <p className="player-result-title">{suspense}</p>
          {myVote && <p className="player-vote-picked">You picked “{myVote.toLowerCase()}”</p>}
          <WaitingDots />
        </div>
      </div>
    )
  }

  return (
    <div className="player-answer-screen">
      <TopNav leftText="" centerText={`Round ${room.round}`} rightText={code ? `Room: ${code}` : "WAITING"} />

      <Countdown deadline={room.deadline} total={VOTE_SECONDS} label="Which answer is real?" />

      <div className="player-vote-grid">
        {room.choices
          .filter((c) => c !== myAnswer)
          .map((choice) => (
            <button
              key={choice}
              type="button"
              className="player-vote-choice"
              disabled={busy || timeUp}
              onClick={() => onVote(choice)}
            >
              {choice.toLowerCase()}
            </button>
          ))}
      </div>

      {timeUp && <p className="player-vote-status">Time's up!</p>}
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  )
}
