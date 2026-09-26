import { socket } from "@/lib/socket"
import { useGame } from "@/store/game"

export function PlayerLobby() {
  const { code, room } = useGame()

  // Players come from the latest state:update broadcast (keyed by socket sid)
  const players = Object.values(room?.players ?? {})
  // Find ourselves by our own socket id
  const me = socket.id ? room?.players[socket.id] : undefined

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-4 px-4 py-6">
      <p className="text-center text-sm text-muted-foreground">
        Room <span className="font-mono font-semibold text-foreground">{code}</span>
      </p>
      <div className="text-center text-3xl font-bold">You're in, {me?.name}!</div>
      <p className="text-center text-muted-foreground">Waiting for the host to start…</p>

      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Players</span>
        <span className="text-muted-foreground">{players.length} joined</span>
      </div>
      <ul className="divide-y rounded-lg border">
        {players.map((p) => (
          <li key={p.id} className="px-3 py-2 font-medium">
            {p.name}
            {p.id === me?.id && <span className="text-muted-foreground"> (you)</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
