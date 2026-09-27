import { useState } from "react"
import { TopNav } from "@/components/ui/TopNav"
import { Button } from "@/components/ui/button"
import { useGame } from "@/store/game"

const animalImages: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob("@/assets/animals/*.{png,jpg,jpeg,webp}", { eager: true, import: "default" }) as Record<string, string>
  ).map(([path, image]) => [path.split("/").pop() ?? path, image])
)

export function HostLobby() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { code, room, startGame } = useGame()

  const players = Object.values(room?.players ?? {})
  const playerCount = Object.keys(room?.players ?? {}).length

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

  const gridPlayers = Array.from({ length: 8 }, (_, index) => players[index] ?? null)

  return (
    <div className="host-lobby-screen">
      <TopNav leftText="HOST LOBBY" rightText={`${playerCount} OF 8 JOINED`} />

      <main className="host-lobby-main">
        <div className="host-lobby-code-panel">
          <div className="host-lobby-code-label">ROOM CODE:</div>
          <div className="host-lobby-code-value">{code || "BLUFF 01"}</div>
        </div>

        <div className="host-lobby-url">JOIN ON YOUR PHONE • BLUFFTRIVIA.com</div>

        <div className="host-player-grid" aria-label="Players joined">
          {gridPlayers.map((player, index) => {
            const avatarSrc = player?.avatar ? animalImages[player.avatar] : null

            return (
              <div className="host-player-card" key={player?.id ?? `empty-${index}`}>
                {player && (
                  <div className="host-player-avatar">
                    <img src={avatarSrc ?? ""} alt={player.name} className="host-player-image" />
                  </div>
                )}
                <div className="host-player-name">{player?.name ?? ""}</div>
              </div>
            )
          })}
        </div>
      </main>

      <Button size="lg" className="host-lobby-start" disabled={busy || players.length === 0} onClick={onStart}>
        <span className="host-lobby-start-icon">▶</span>
        START GAME
      </Button>

      {error && <p className="host-lobby-error">{error}</p>}
    </div>
  )
}
