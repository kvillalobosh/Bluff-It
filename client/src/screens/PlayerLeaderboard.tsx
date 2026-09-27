import { motion } from "motion/react"
import { AnimatedScore } from "@/components/AnimatedScore"
import { Avatar } from "@/components/Avatar"
import { TopNav } from "@/components/ui/TopNav"
import { socket } from "@/lib/socket"
import { TOTAL_ROUNDS, useGame } from "@/store/game"
import star from "@/assets/star-icon.png"

// When the score count-up starts, and how long it runs (seconds)
const COUNT_DELAY = 0.7
const COUNT_DURATION = 1.4

// Player screen while phase === "leaderboard_view": just you — your avatar and your score
// counting up from what you had before the round. The full standings live on the host screen.
export function PlayerLeaderboard() {
  const room = useGame((s) => s.room)
  const roundStartScores = useGame((s) => s.roundStartScores)
  if (!room) return null

  const me = socket.id ? room.players[socket.id] : undefined
  if (!me) return null

  // Round 1 = game just started, nothing to count up yet
  const firstRound = room.round <= 1 || !roundStartScores
  const start = firstRound ? me.score : (roundStartScores?.[me.id] ?? me.score)
  const gain = me.score - start
  const isLeader = !firstRound && Object.values(room.players).every((p) => p.score <= me.score)

  const roundLabel = firstRound ? `ROUND 1 OF ${TOTAL_ROUNDS}` : `ROUND ${room.round - 1} OF ${TOTAL_ROUNDS} COMPLETE`

  return (
    <div className="player-board">
      <TopNav leftText={firstRound ? "GET READY" : "YOUR SCORE"} rightText={roundLabel} />

      <main className="player-board-main">
        <motion.section
          className="player-board-hero"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
        >
          <div className="player-board-avatar-wrap">
            <Avatar avatar={me.avatar} name={me.name} className="player-board-avatar" />
            {isLeader && (
              <motion.img
                src={star}
                alt="1st place"
                className="player-board-star"
                initial={{ scale: 0, rotate: -90, opacity: 0 }}
                animate={{ scale: 1, rotate: 15, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.55, delay: 0.4 }}
              />
            )}
          </div>

          <span className="player-board-name">{me.name}</span>

          <div className="player-board-score">
            <AnimatedScore from={start} to={me.score} delay={COUNT_DELAY} duration={COUNT_DURATION} />
            <span className="player-board-score-unit">PTS</span>
          </div>

          {/* Pops in as the counter starts climbing */}
          {!firstRound &&
            (gain > 0 ? (
              <motion.span
                className="player-board-gain"
                initial={{ opacity: 0, scale: 0.6, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: COUNT_DELAY, type: "spring", bounce: 0.5 }}
              >
                +{gain.toLocaleString()} THIS ROUND
              </motion.span>
            ) : (
              <motion.span
                className="player-board-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: COUNT_DELAY }}
              >
                No points this round
              </motion.span>
            ))}
        </motion.section>
      </main>

      <footer className="player-board-wait">
        Waiting for the host
        <span className="player-board-dots" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      </footer>
    </div>
  )
}
