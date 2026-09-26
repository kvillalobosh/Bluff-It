import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useGame } from "@/store/game"

export function HostLobby() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { code, room, startGame } = useGame()

  // Players come from the latest state:update broadcast
  const players = Object.values(room?.players ?? {})

  const onStart = async () => {
    setBusy(true)
    setError(null)
    try {
      await startGame()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-4 px-4 py-6">
      <p className="text-center text-sm text-muted-foreground">Join with room code</p>
      <div className="text-center font-mono text-6xl font-black tracking-widest">{code}</div>

      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Players</span>
        <span className="text-muted-foreground">{players.length} joined</span>
      </div>

      {players.length === 0 ? (
        <p className="rounded-lg border p-3 text-center text-sm text-muted-foreground">Waiting for players…</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {players.map((p) => (
            <li key={p.id} className="px-3 py-2 font-medium">
              {p.name}
            </li>
          ))}
        </ul>
      )}

      <Button size="lg" className="h-12 text-base" disabled={busy || players.length === 0} onClick={onStart}>
        Start game
      </Button>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  )
}
