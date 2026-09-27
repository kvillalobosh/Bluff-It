import { useEffect } from "react"
import { Avatar } from "@/components/Avatar"
import confetti from "canvas-confetti"
import { motion } from "motion/react"
import { useGame } from "@/store/game"
import "../FinalLeaderboard.css"

// Seconds between each card appearing. Cards reveal 4th → 1st, so 1st place lands last.
const REVEAL_STEP = 0.5
const BASE_DELAY = 0.6 // wait for the title + "Final Scores" pill first
const SLOTS = 4

// Clouds all drift left → right, each in its own lane in the blue half of the sky.
// Negative delays start them mid-journey so the sky is already populated on load.
// size = width in px, duration = seconds to cross the screen, opacity = depth
const CLOUDS = [
  { top: "3%", size: 260, duration: 38, delay: -4, opacity: 0.95 },
  { top: "11%", size: 150, duration: 52, delay: -30, opacity: 0.7 },
  { top: "19%", size: 210, duration: 44, delay: -18, opacity: 0.85 },
  { top: "27%", size: 120, duration: 60, delay: -45, opacity: 0.6 },
  { top: "34%", size: 230, duration: 48, delay: -8, opacity: 0.8 },
  { top: "7%", size: 180, duration: 56, delay: -40, opacity: 0.75 },
  { top: "40%", size: 140, duration: 64, delay: -24, opacity: 0.55 },
]

// Shown to everyone when phase === "end_screen" (after the last round).
export function FinalLeaderboard() {
  const room = useGame((s) => s.room)
  const players = Object.values(room?.players ?? {}).sort((a, b) => b.score - a.score)

  // Top 4, padded with empty slots so there are always 4 cards on screen.
  // Rank uses "competition ranking": tied scores share a rank (1, 1, 3, 4).
  const slots = Array.from({ length: SLOTS }, (_, i) => {
    const p = players[i] ?? null
    const rank = p ? 1 + players.filter((o) => o.score > p.score).length : i + 1
    return { p, rank, slot: i }
  })

  const revealDelay = (slot: number) => BASE_DELAY + (SLOTS - 1 - slot) * REVEAL_STEP
  const winnerDelay = revealDelay(0) + 0.35

  // Confetti: a burst when 1st place lands, then streams from both sides for a few seconds
  useEffect(() => {
    let frame = 0
    const start = setTimeout(() => {
      confetti({ particleCount: 180, spread: 100, origin: { y: 0.35 } })
      const end = Date.now() + 3000
      const stream = () => {
        confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } })
        confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } })
        if (Date.now() < end) frame = requestAnimationFrame(stream)
      }
      stream()
    }, winnerDelay * 3000)

    return () => {
      clearTimeout(start)
      cancelAnimationFrame(frame)
      confetti.reset()
    }
  }, [winnerDelay])

  if (!room) return null

  return (
    <div className="final-board">
      {/* Backdrop: gradient + grid + drifting clouds. Fixed behind everything, never fills content. */}
      <div className="final-sky" aria-hidden>
        {CLOUDS.map((c, i) => (
          <div
            key={i}
            className="final-sky-cloud"
            style={{
              top: c.top,
              width: c.size,
              opacity: c.opacity,
              animationDuration: `${c.duration}s`,
              animationDelay: `${c.delay}s`,
            }}
          >
            <Cloud />
          </div>
        ))}
      </div>

      {/* Title — straight, not arched */}
      <motion.h1
        className="final-board-title"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
      >
        Thanks for playing!
      </motion.h1>

      <motion.div
        className="final-board-pill"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", bounce: 0.4 }}
      >
        Final Scores
      </motion.div>

      {/* Four pointed cards — no grey backdrop behind them */}
      <div className="final-board-panel">
        <div className="final-board-row">
          {slots.map(({ p, rank, slot }) => (
            <motion.div
              key={p?.id ?? `empty-${slot}`}
              className={[
                "final-card",
                rank === 1 && p ? "final-card--first" : "",
                rank === 2 && p ? "final-card--silver" : "",
                rank === 3 && p ? "final-card--bronze" : "",
                !p ? "final-card--empty" : "",
              ].join(" ")}
              initial={{ y: 40, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: "spring", bounce: 0.45, delay: revealDelay(slot) }}
            >
              {/* House-shaped card: offset shadow + white body with blue outline */}
              <svg className="final-card-shape" viewBox="0 0 200 250" preserveAspectRatio="none" aria-hidden>
                <path className="final-card-shadow" d={CARD_PATH} transform="translate(7 7)" />
                <path className="final-card-body" d={CARD_PATH} vectorEffect="non-scaling-stroke" />
              </svg>

              <span className="final-card-rank">{rank}</span>
              {rank === 1 && p && <Crown />}

              <div className="final-card-content">
                {p ? (
                  <>
                    <div className="final-card-avatar">
                      <Avatar avatar={p.avatar} name={p.name} className="final-card-avatar-image" />
                    </div>

                    <div className="final-card-player">
                      <span className="final-card-player-name">{p.name}</span>
                      <div className="final-card-points">
                        <span>{p.score.toLocaleString()}</span>
                        <span className="final-card-points-unit">pts</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="final-card-avatar final-card-avatar--empty" />
                    <div className="final-card-player final-card-player--empty">
                      <span className="final-card-player-name">—</span>
                      <div className="final-card-points">
                        <span>—</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Pentagon "house" with softly rounded bottom corners, drawn in a 200×250 box
const CARD_PATH = "M100 5 L195 62 L195 232 Q195 245 182 245 L18 245 Q5 245 5 232 L5 62 Z"

// Lineless cartoon cloud: pale-blue underside peeking out below a white puff stack
function Cloud() {
  const puffs = (
    <>
      <circle cx="52" cy="66" r="30" />
      <circle cx="90" cy="46" r="38" />
      <circle cx="132" cy="52" r="32" />
      <circle cx="162" cy="70" r="24" />
      <rect x="28" y="62" width="156" height="34" rx="17" />
    </>
  )
  return (
    <svg viewBox="0 0 200 100" className="final-sky-cloud-svg">
      <g fill="#d6e6f7">{puffs}</g>
      <g fill="#ffffff" transform="translate(0 -6)">{puffs}</g>
    </svg>
  )
}

// Gold crown that sits on the roof peak of the 1st-place card
function Crown() {
  const shape = (
    <>
      <path d="M12 56 L8 22 L30 40 L50 12 L70 40 L92 22 L88 56 Z" />
      <rect x="10" y="52" width="80" height="14" rx="5" />
      <circle cx="8" cy="20" r="6" />
      <circle cx="50" cy="10" r="7" />
      <circle cx="92" cy="20" r="6" />
    </>
  )
  return (
    <svg className="final-card-crown" viewBox="-2 0 104 72" aria-hidden>
      {/* offset shadow */}
      <g fill="#2c4f82" transform="translate(3 3)">{shape}</g>
      {/* gold body */}
      <g fill="#f3d97a" stroke="#8e782b" strokeWidth="3" strokeLinejoin="round">{shape}</g>
      {/* shine + jewels */}
      <path d="M22 44 L30 46 L50 22" fill="none" stroke="#fff6c9" strokeWidth="3" strokeLinecap="round" />
      <circle cx="30" cy="59" r="4" fill="#e46a6a" />
      <circle cx="50" cy="59" r="4.5" fill="#4a6fa5" />
      <circle cx="70" cy="59" r="4" fill="#e46a6a" />
    </svg>
  )
}