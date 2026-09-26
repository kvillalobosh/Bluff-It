import "./App.css"
import { Home } from "@/screens/Home"
import { HostLobby } from "@/screens/HostLobby"
import { Leaderboard } from "@/screens/Leaderboard"
import { PlayerLobby } from "@/screens/PlayerLobby"
import { useGame } from "@/store/game"

function App() {
  const role = useGame((s) => s.role)
  const phase = useGame((s) => s.room?.phase)

  // Not in a room yet (the store sets role once host:create / player:join_room succeeds)
  if (!role) return <Home />

  // In a room: the server's phase decides the screen
  switch (phase) {
    case "lobby":
      return role === "host" ? <HostLobby /> : <PlayerLobby />
    case "leaderboard_view":
      return <Leaderboard />
    default:
      // Phase without a screen yet — show it so we can confirm the server moved on
      return (
        <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
          {role} · phase: <code className="ml-1">{phase}</code> (screen not built yet)
        </div>
      )
  }
}

export default App
