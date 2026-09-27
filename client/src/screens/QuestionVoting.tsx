import { Countdown } from "@/components/Countdown"
import { TOTAL_ROUNDS, VOTE_SECONDS, useGame } from "@/store/game"

// Host screen while phase === "question_voting": players pick which answer they think is real.
export function QuestionVoting() {
  const room = useGame((s) => s.room)
  if (!room) return null

  const players = Object.values(room.players)
  // The server moves on once every *connected* player has voted, so count the same way
  const active = players.filter((p) => p.connected)
  const voted = active.filter((p) => p.has_voted).length

  return (
    <div className="mx-auto flex min-h-svh max-w-5xl flex-col justify-center gap-6 px-4 py-6">
      {/* Timer above both columns */}
      <Countdown deadline={room.deadline} total={VOTE_SECONDS} label="Which answer is real? Vote on your device!" />

      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        {/* Left: round + question card, answer cards below it */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-3 rounded-xl border p-8">
            <p className="text-4xl font-black">
              Round {room.round} of {TOTAL_ROUNDS}
            </p>
            <p className="text-center text-2xl font-bold">{room.question}</p>
          </div>

          {/* Real answer + every player's fake, already shuffled by the server (up to 8 players + 1 real = 9) */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {room.choices.map((choice) => (
              <div key={choice.id} className="flex min-h-20 items-center justify-center rounded-xl border p-3 text-center font-medium">
                {choice.text.toLowerCase()}
              </div>
            ))}
          </div>
        </div>

        {/* Right: who has voted */}
        <div className="flex flex-col gap-3 self-start rounded-xl border p-4">
          <p className="font-medium">
            {voted}/{active.length} voted
          </p>
          <ul className="divide-y">
            {players.map((p) => (
              <li key={p.id} className={`flex items-center justify-between py-2 ${p.connected ? "" : "opacity-40"}`}>
                <span className="font-medium">{p.name}</span>
                <span className={p.has_voted ? "text-green-600" : "text-muted-foreground"}>
                  {p.has_voted ? "✓ locked in" : "thinking…"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
