import { socket } from "@/lib/socket"
import { useGame } from "@/store/game"

// Player screen while phase === "results": tells them if they found the real answer or got fooled.
export function PlayerResult() {
  const room = useGame((s) => s.room)
  if (!room) return null

  // The server only sends real_answer / round_votes / round_answers in the results phase
  const myVote = socket.id ? room.round_votes?.[socket.id] : undefined

  // Didn't vote before the timer ran out
  if (!myVote) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-3xl font-bold">Time's up — no vote!</p>
        <p className="text-muted-foreground">The real answer was “{room.real_answer?.toLowerCase()}”</p>
      </div>
    )
  }

  if (myVote === room.real_answer) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-3xl font-bold">“{room.real_answer?.toLowerCase()}” was the truth! +1000</p>
      </div>
    )
  }

  // Fooled: find who wrote the fake we picked (same lookup the server uses to award points)
  const authorSid = Object.entries(room.round_answers ?? {}).find(([, text]) => text === myVote)?.[0]
  const authorName = authorSid ? room.players[authorSid]?.name : undefined

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-4xl font-black">BAMBOOZLED!</p>
      <p className="text-2xl font-bold">{authorName ?? "Someone"} got you!</p>
      <p className="text-muted-foreground">The real answer was “{room.real_answer?.toLowerCase()}”</p>
    </div>
  )
}
