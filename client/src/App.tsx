import "./App.css"
import { FinalLeaderboard } from "@/screens/FinalLeaderboard"
import { Home } from "@/screens/Home"
import { HostLobby } from "@/screens/HostLobby"
import { HostLeaderboard } from "@/screens/HostLeaderboard"
import { HostResults } from "@/screens/HostResults"
import { PlayerAnswer } from "@/screens/PlayerAnswer"
import { PlayerLeaderboard } from "@/screens/PlayerLeaderboard"
import { PlayerLobby } from "@/screens/PlayerLobby"
import { PlayerResult } from "@/screens/PlayerResult"
import { PlayerVote } from "@/screens/PlayerVote"
import { QuestionStaging } from "@/screens/QuestionStaging"
import { QuestionVoting } from "@/screens/QuestionVoting"
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
      return role === "host" ? <HostLeaderboard /> : <PlayerLeaderboard />
    case "question_staging":
      return role === "host" ? <QuestionStaging /> : <PlayerAnswer />
    case "question_voting":
      return role === "host" ? <QuestionVoting /> : <PlayerVote />
    case "results":
      return role === "host" ? <HostResults /> : <PlayerResult />
    case "end_screen":
      return <FinalLeaderboard />
    default:
      return <Placeholder role={role} phase={phase} />
  }
}

// Phase without a screen yet to confirm the server moved on
function Placeholder({ role, phase }: { role: string; phase?: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
      {role} · phase: <code className="ml-1">{phase}</code> (screen not built yet)
    </div>
  )
}

export default App
