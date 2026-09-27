import { useState } from "react"
import { motion } from "motion/react"
import { Avatar } from "@/components/Avatar"
import { TopNav } from "@/components/ui/TopNav"
import { Button } from "@/components/ui/button"
import { TOTAL_ROUNDS, useGame } from "@/store/game"
import star from "@/assets/star-icon.png"

// Host screen while phase === "leaderboard_view": standings table + the button that starts the next question.
export function HostLeaderboard() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { code, room, beginRound } = useGame()
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
    <div className="host-lobby-screen">
      <TopNav leftText={`ROUND ${room.round} OF ${TOTAL_ROUNDS}`} rightText={`CODE: ${code}`} />

      <main className="leaderboard-main">
        <div className="leaderboard-panel">
          <div className="leaderboard-tab">{firstRound ? "GET READY!" : "LEADERBOARD"}</div>

          <table className="leaderboard-table">
            <thead>
              <tr>
                <th className="leaderboard-rank">#</th>
                <th>PLAYER</th>
                <th className="leaderboard-points">POINTS</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => {
                // Ties share a rank (e.g. 1, 1, 3)
                const rank = 1 + players.filter((o) => o.score > p.score).length
                const leader = rank === 1 && !firstRound
                return (
                  <motion.tr
                    key={p.id}
                    className={`${leader ? "leaderboard-row--leader" : ""} ${p.connected ? "" : "leaderboard-row--away"}`}
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: "spring", bounce: 0.35, delay: i * 0.08 }}
                  >
                    <td className="leaderboard-rank">{rank}</td>
                    <td>
                      <div className="leaderboard-player">
                        <Avatar avatar={p.avatar} name={p.name} className="leaderboard-avatar" />
                        <span className="leaderboard-name">{p.name}</span>
                        {leader && (
                          <motion.img
                            src={star}
                            alt="1st place"
                            className="leaderboard-star"
                            initial={{ scale: 0, rotate: -90, opacity: 0 }}
                            animate={{ scale: 1, rotate: 15, opacity: 1 }}
                            transition={{ type: "spring", bounce: 0.55, delay: 0.5 }}
                          />
                        )}
                      </div>
                    </td>
                    <td className="leaderboard-points">{p.score.toLocaleString()}</td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>

      <Button size="lg" className="host-lobby-start" disabled={busy} onClick={onBegin}>
        <span className="host-lobby-start-icon">▶</span>
        {firstRound ? "BEGIN ROUND" : "NEXT ROUND"}
      </Button>

      {error && <p className="host-lobby-error">{error}</p>}
    </div>
  )
}
