import { TopNav } from "@/components/ui/TopNav"
import { socket } from "@/lib/socket"
import { useGame } from "@/store/game"

// Player screen while phase === "results": tells them if they found the real answer or got fooled.
export function PlayerResult() {
  const { code, room } = useGame()
  if (!room) return null

  // The server only sends real_answer / round_votes / round_answers in the results phase
  const myVote = socket.id ? room.round_votes?.[socket.id] : undefined
  const myVoteChoice = room.choices.find((choice) => choice.id === myVote)

  const renderContent = () => {
    // Didn't vote before the timer ran out
    if (!myVoteChoice) {
      return (
        <>
          <p className="player-result-title">Time's up — no vote!</p>
          <p className="player-result-detail">The real answer was “{room.real_answer?.toLowerCase()}”</p>
        </>
      )
    }

    if (myVoteChoice.text === room.real_answer) {
      return (
        <>
          <p className="player-result-title">“{room.real_answer?.toLowerCase()}” was the truth!</p>
          <p className="player-result-detail">+1000 points</p>
        </>
      )
    }

    // Fooled: find who wrote the fake we picked (same lookup the server uses to award points)
    const authorSid = Object.entries(room.round_answers ?? {}).find(([, text]) => text === myVoteChoice.text)?.[0]
    const authorName = authorSid ? room.players[authorSid]?.name : undefined

    return (
      <>
        <p className="player-result-title">Bamboozled!</p>
        <p className="player-result-subtitle">{authorName ?? "Someone"} got you!</p>
        <p className="player-result-detail">The real answer was “{room.real_answer?.toLowerCase()}”</p>
      </>
    )
  }

  return (
    <div className="player-answer-screen">
      <TopNav leftText="" centerText={`Round ${room.round}`} rightText={code ? `Room: ${code}` : "WAITING"} />

      <div className="player-result-card">{renderContent()}</div>
    </div>
  )
}
