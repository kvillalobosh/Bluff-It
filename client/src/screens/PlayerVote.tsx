import { useEffect, useState } from "react"
import { TopNav } from "@/components/ui/TopNav"
import { WaitingDots } from "@/components/ui/WaitingDots"
import { Countdown } from "@/components/Countdown"
import { socket } from "@/lib/socket"
import { useCountdown } from "@/lib/useCountdown"
import { VOTE_SECONDS, useGame } from "@/store/game"

// Shown on the "locked in" screen — one picked once per round and kept stable until the round changes.
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
  const [suspense, setSuspense] = useState(SUSPENSE_LINES[0])
  const { code, room, myAnswer, myAnswerId, myVote, submitVote } = useGame()
  const remaining = useCountdown(room?.deadline)
  if (!room) return null

  useEffect(() => {
    setSuspense(SUSPENSE_LINES[Math.floor(Math.random() * SUSPENSE_LINES.length)])
  }, [room.round])

  const me = socket.id ? room.players[socket.id] : undefined
  const timeUp = remaining === 0
  const myVoteChoice = room.choices.find((choice) => choice.id === myVote)
  const isOwnChoice = (choice: { id: string; text: string }) => {
    if (myAnswerId) return choice.id === myAnswerId
    return choice.text === myAnswer
  }

  const onVote = async (choiceId: string) => {
    setBusy(true)
    setError(null)
    try {
      await submitVote(choiceId)
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
          {myVoteChoice && <p className="player-vote-picked">You picked “{myVoteChoice.text.toLowerCase()}”</p>}
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
          .filter((choice) => !isOwnChoice(choice))
          .map((choice) => (
            <button
              key={choice.id}
              type="button"
              className="player-vote-choice"
              disabled={busy || timeUp}
              onClick={() => onVote(choice.id)}
            >
              {choice.text.toLowerCase()}
            </button>
          ))}
      </div>

      {timeUp && <p className="player-vote-status">Time's up!</p>}
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  )
}
