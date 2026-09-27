import { useState } from "react"
import { motion } from "motion/react"
import star from "@/assets/star-icon.png"
import { Avatar } from "@/components/Avatar"
import { TopNav } from "@/components/ui/TopNav"
import { Button } from "@/components/ui/button"
import { centerIndex, toRows } from "@/lib/layout"
import { useGame } from "@/store/game"

type Card = {
  choiceId: string
  choice: string
  isReal: boolean
  author: string | null
  authorId: string | null
  pickedBy: string[]
  pickedByIds: string[]
}

// Host screen while phase === "results": every answer card with who wrote it and who fell for it.
export function HostResults() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { code, room, nextRound } = useGame()
  if (!room) return null

  const answers = room.round_answers ?? {} // sid -> fake text
  const votes = room.round_votes ?? {} // sid -> chosen choice id
  const nameOf = (sid: string) => room.players[sid]?.name ?? "?"

  const allCards: Card[] = room.choices.map((choice) => {
    const isReal = choice.text === room.real_answer
    const authorSid = isReal ? undefined : Object.keys(answers).find((sid) => answers[sid] === choice.text)
    const pickedByIds = Object.keys(votes).filter((sid) => votes[sid] === choice.id)
    const pickedBy = pickedByIds.map(nameOf)
    return {
      choiceId: choice.id,
      choice: choice.text,
      isReal,
      author: authorSid ? nameOf(authorSid) : null,
      authorId: authorSid ?? null,
      pickedBy,
      pickedByIds,
    }
  })

  // Put the real answer in the center slot (middle of the middle row), fakes around it
  const real = allCards.find((c) => c.isReal)
  const cards = allCards.filter((c) => !c.isReal)
  if (real) cards.splice(centerIndex(allCards.length), 0, real)

  const onLeaderboard = async () => {
    setBusy(true)
    setError(null)
    try {
      await nextRound() // host:next_round -> everyone goes to leaderboard_view (or end_screen)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="host-results-screen">
      <TopNav leftText={`ROUND ${room.round}`} rightText={`CODE: ${code ?? ""}`} />

      <main className="host-results-main">
        <div className="host-results-header">
          <span>ROUND {room.round} RESULTS</span>
        </div>

        <div className="host-results-grid">
          {toRows(cards).map((row, i) => (
            <div key={i} className="host-results-row">
              {row.map((card) => (
                <ResultCard key={card.choiceId} card={card} room={room} />
              ))}
            </div>
          ))}
        </div>

        <Button size="lg" className="host-lobby-start" disabled={busy} onClick={onLeaderboard}>
          <span className="host-lobby-start-icon">▶</span>
          LEADERBOARD
        </Button>

        {error && <p className="host-lobby-error">{error}</p>}
      </main>
    </div>
  )
}

function ResultCard({ card, room }: { card: Card; room: any }) {
  if (card.isReal) {
    return (
      <motion.div
        className="result-card result-card--real"
        initial={{ opacity: 0.55, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: [0.98, 1.08, 1.04], y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <div className="result-card-sparkles" aria-hidden="true">
          {[...Array(6)].map((_, i) => (
            <motion.img
              key={i}
              src={star}
              alt=""
              className="result-card-sparkle"
              style={{
                left: `${16 + i * 13}%`,
                top: `${12 + (i % 3) * 22}%`,
              }}
              initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.7], rotate: [0, 25, -10] }}
              transition={{ duration: 1.6, delay: i * 0.12, repeat: Infinity, repeatDelay: 1.2 }}
            />
          ))}
        </div>

        <p className="result-card-text result-card-text--real">{card.choice.toLowerCase()}</p>
        <span className="result-card-badge">CORRECT</span>

        {card.pickedBy.length === 0 ? (
          <p className="result-card-meta">No one found it</p>
        ) : (
          <div className="result-card-picks-row">
            {card.pickedByIds.map((sid) => {
              const player = room.players[sid]
              if (!player) return null
              return (
                <div key={sid} className="result-card-player-mini">
                  <Avatar avatar={player.avatar} name={player.name} className="result-card-avatar-mini" />
                  <span>{player.name}</span>
                  <span className="result-card-pick-score">+1000</span>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <div className="result-card result-card--fake">
      <div className="result-card-author-row">
        <Avatar avatar={card.authorId ? room.players[card.authorId]?.avatar : undefined} name={card.author ?? "?"} className="result-card-avatar" />
      </div>
      <p className="result-card-text">{card.choice.toLowerCase()}</p>
      <p className="result-card-meta">Written by {card.author ?? "?"}</p>
      <p className="result-card-pickline">
        {card.pickedBy.length === 0
          ? "No one fooled"
          : `Fooled ${card.pickedBy.join(", ")} +${500 * card.pickedBy.length}`}
      </p>
    </div>
  )
}
