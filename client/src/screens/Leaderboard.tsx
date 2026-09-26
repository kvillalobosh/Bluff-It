import { useState } from "react"
import { Button } from "@/components/ui/button"
import { socket } from "@/lib/socket"
import { useGame } from "@/store/game"

// Shown to everyone while phase === "leaderboard_view".
// Host gets the Begin/Next Round button; players just watch.
export function Leaderboard() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { role, room, beginRound } = useGame()
  if (!room) return null

  // Highest score first
  const players = Object.values(room.players).sort((a, b) => b.score - a.score)
  // Round 1 = game just started (all 0 pts). host:next_round bumps round, so > 1 means we're between rounds.
  const firstRound = room.round <= 1

  const onBegin = async () => {
    setBusy(true)
    setError(null)
    try {
      await beginRound()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-4 px-4 py-6">
      <p className="text-center text-sm text-muted-foreground">{firstRound ? "Get ready!" : "Scores so far"}</p>
      <div className="text-center text-3xl font-bold">Leaderboard · Round {room.round}</div>

      <ol className="divide-y rounded-lg border">
        {players.map((p, i) => (
          <li key={p.id} className={`flex items-center justify-between px-3 py-2 ${p.connected ? "" : "opacity-40"}`}>
            <span className="font-medium">
              <span className="mr-2 text-muted-foreground">{i + 1}.</span>
              {p.name}
              {p.id === socket.id && <span className="text-muted-foreground"> (you)</span>}
            </span>
            <span className="font-mono">{p.score} pts</span>
          </li>
        ))}
      </ol>

      {role === "host" ? (
        <Button size="lg" className="h-12 text-base" disabled={busy} onClick={onBegin}>
          {firstRound ? "Begin Round" : "Next Round"}
        </Button>
      ) : (
        <p className="text-center text-muted-foreground">Waiting for the host to begin…</p>
      )}

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  )
}
