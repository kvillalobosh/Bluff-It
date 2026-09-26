import { useCountdown } from "@/lib/useCountdown"
import { useGame } from "@/store/game"

// Host screen while phase === "question_staging": players are writing their fake answers.
export function QuestionStaging() {
  const room = useGame((s) => s.room)
  const secondsLeft = useCountdown(room?.deadline)
  if (!room) return null

  const players = Object.values(room.players)
  // The server moves on once every *connected* player has answered, so count the same way
  const active = players.filter((p) => p.connected)
  const answered = active.filter((p) => p.has_answered).length

  return (
    <div className="mx-auto flex min-h-svh max-w-4xl flex-col justify-center gap-6 px-4 py-6">
      {/* Timer above both cards */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Round {room.round} · Write a fake answer!</p>
        <div className={`font-mono text-6xl font-black ${secondsLeft !== null && secondsLeft <= 10 ? "text-red-600" : ""}`}>
          {secondsLeft ?? "--"}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        {/* Left: the question */}
        <div className="flex items-center justify-center rounded-xl border p-8">
          <p className="text-center text-3xl font-bold">{room.question}</p>
        </div>

        {/* Right: who has submitted */}
        <div className="flex flex-col gap-3 rounded-xl border p-4">
          <p className="font-medium">
            {answered}/{active.length} players submitted
          </p>
          <ul className="divide-y">
            {players.map((p) => (
              <li key={p.id} className={`flex items-center justify-between py-2 ${p.connected ? "" : "opacity-40"}`}>
                <span className="font-medium">{p.name}</span>
                <span className={p.has_answered ? "text-green-600" : "text-muted-foreground"}>
                  {p.has_answered ? "✓ submitted" : "writing…"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
