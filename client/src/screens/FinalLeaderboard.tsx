import { useEffect } from "react"
import confetti from "canvas-confetti"
import { motion } from "motion/react"
import { Avatar } from "@/components/Avatar"
import { socket } from "@/lib/socket"
import { useGame } from "@/store/game"

// Card sizes from 1st place down — each row is smaller than the one above it (max 8 players)
const TIERS = [
  { card: "max-w-3xl gap-6 p-6 border-[6px]", avatar: "size-28 text-5xl", name: "text-5xl", score: "text-5xl", rank: "text-7xl" },
  { card: "max-w-2xl gap-5 p-5 border-[5px]", avatar: "size-24 text-4xl", name: "text-4xl", score: "text-4xl", rank: "text-6xl" },
  { card: "max-w-xl gap-4 p-4 border-4", avatar: "size-20 text-3xl", name: "text-3xl", score: "text-3xl", rank: "text-5xl" },
  { card: "max-w-lg gap-4 p-3 border-4", avatar: "size-16 text-2xl", name: "text-2xl", score: "text-2xl", rank: "text-4xl" },
  { card: "max-w-md gap-3 p-3 border-[3px]", avatar: "size-14 text-xl", name: "text-xl", score: "text-xl", rank: "text-3xl" },
  { card: "max-w-sm gap-3 p-2 border-[3px]", avatar: "size-12 text-lg", name: "text-lg", score: "text-lg", rank: "text-2xl" },
  { card: "max-w-xs gap-2 p-2 border-2", avatar: "size-10 text-base", name: "text-base", score: "text-base", rank: "text-xl" },
  { card: "max-w-2xs gap-2 p-2 border-2", avatar: "size-9 text-sm", name: "text-sm", score: "text-sm", rank: "text-lg" },
]

// Seconds between each card appearing. Cards reveal from last place up, so 1st place lands last.
const REVEAL_STEP = 0.5

// Shown to everyone when phase === "end_screen" (after the last round).
export function FinalLeaderboard() {
  const room = useGame((s) => s.room)
  const players = Object.values(room?.players ?? {}).sort((a, b) => b.score - a.score)
  const winnerDelay = (players.length - 1) * REVEAL_STEP + 0.6

  // Confetti: a burst when the winner's card lands, then streams from both sides for a few seconds
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
    }, winnerDelay * 1000)

    return () => {
      clearTimeout(start)
      cancelAnimationFrame(frame)
      confetti.reset()
    }
  }, [winnerDelay])

  if (!room) return null

  return (
    <div className="flex min-h-svh w-full flex-col items-center gap-8 overflow-hidden px-8 py-10">
      {/* Title */}
      <motion.h1
        className="-rotate-2 text-center text-6xl font-black uppercase tracking-tight md:text-7xl"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
      >
        Thanks for playing!
      </motion.h1>
      <div className="rounded-full border-4 border-foreground px-8 py-2 text-2xl font-black uppercase">Final Scores</div>

      {/* Podium list: 1st on top and biggest, everyone else smaller below */}
      <ol className="flex w-full flex-col items-center gap-4">
        {players.map((p, i) => {
          const tier = TIERS[Math.min(i, TIERS.length - 1)]
          // Ties share a rank (e.g. 1, 1, 3)
          const rank = 1 + players.filter((o) => o.score > p.score).length
          const isWinner = rank === 1

          return (
            <motion.li
              key={p.id}
              className={`flex w-full items-center rounded-3xl border-foreground bg-background shadow-[6px_6px_0_0_var(--foreground)] ${tier.card}`}
              initial={{ y: 60, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: "spring", bounce: 0.45, delay: (players.length - 1 - i) * REVEAL_STEP }}
            >
              <span className={`w-[1.5em] shrink-0 text-center font-black ${tier.rank}`}>{rank}</span>

              <div className="relative">
                {isWinner && (
                  <motion.span
                    className="absolute -top-10 left-1/2 -translate-x-1/2 text-5xl"
                    initial={{ y: -40, opacity: 0, rotate: -30 }}
                    animate={{ y: 0, opacity: 1, rotate: -12 }}
                    transition={{ type: "spring", bounce: 0.6, delay: winnerDelay }}
                  >
                    👑
                  </motion.span>
                )}
                <Avatar avatar={p.avatar} name={p.name} className={tier.avatar} />
              </div>

              <span className={`min-w-0 flex-1 truncate font-black ${tier.name}`}>
                {p.name}
                {p.id === socket.id && <span className="font-bold text-muted-foreground"> (you)</span>}
              </span>

              <span className={`shrink-0 font-mono font-black tabular-nums ${tier.score}`}>
                {p.score.toLocaleString()}
              </span>
            </motion.li>
          )
        })}
      </ol>
    </div>
  )
}
