import { TopNav } from "@/components/ui/TopNav"
import { socket } from "@/lib/socket"
import { useGame } from "@/store/game"

const animalImages: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob("@/assets/animals/*.{png,jpg,jpeg,webp}", { eager: true, import: "default" }) as Record<string, string>
  ).map(([path, image]) => [path.split("/").pop() ?? path, image])
)

export function PlayerLobby() {
  const { code, room } = useGame()

  // Find ourselves by our own socket id
  const me = socket.id ? room?.players[socket.id] : undefined
  const avatarSrc = me?.avatar ? animalImages[me.avatar] : null

  return (
    <div className="player-lobby-screen">
      <TopNav leftText="" rightText={code ? `Room: ${code}` : "WAITING"}/>

      <div className="player-lobby-message">You&apos;re in, {me?.name}!</div>

      <div className="player-lobby-card" aria-label="Your avatar">
        {me && (
          <>
            <div className="player-lobby-avatar">
              <img src={avatarSrc ?? ""} alt={me.name} className="player-lobby-avatar-image" />
            </div>
            <div className="player-lobby-player-name">{me.name}</div>
          </>
        )}
      </div>

      <p className="player-lobby-status">Waiting for the host to start…</p>
    </div>
  )
}
