import { useState } from "react"
import { ChartNoAxesColumn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { centerIndex, toRows } from "@/lib/layout"
import { useGame } from "@/store/game"

type Card = {
  choiceId: string
  choice: string
  isReal: boolean
  author: string | null // who wrote this fake (null for the real answer)
  pickedBy: string[] // names of players who voted for it
}

// Host screen while phase === "results": every answer card with who wrote it and who fell for it.
export function HostResults() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { room, nextRound } = useGame()
  if (!room) return null

  const answers = room.round_answers ?? {} // sid -> fake text
  const votes = room.round_votes ?? {} // sid -> chosen choice id
  const nameOf = (sid: string) => room.players[sid]?.name ?? "?"

  const allCards: Card[] = room.choices.map((choice) => {
    const isReal = choice.text === room.real_answer
    // Same lookup the server uses for scoring: first player whose fake matches this text
    const authorSid = isReal ? undefined : Object.keys(answers).find((sid) => answers[sid] === choice.text)
    const pickedBy = Object.keys(votes).filter((sid) => votes[sid] === choice.id).map(nameOf)
    return { choiceId: choice.id, choice: choice.text, isReal, author: authorSid ? nameOf(authorSid) : null, pickedBy }
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
    <div className="flex min-h-svh w-full flex-col">
      {/* Centered vertically on the full screen (teammate's navbar will sit above this) */}
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-8 py-8">
        <div className="rounded-full border-2 border-foreground px-12 py-3">
          <p className="text-5xl font-black">ROUND {room.round} RESULTS</p>
        </div>

        {/* Rows sized by rowSizes(): ≤5 -> one row, 7 -> 3/4, 8 -> 4/4, 9 -> 3/3/3 — each row centered */}
        <div className="flex w-full flex-col gap-4">
          {toRows(cards).map((row, i) => (
            <div key={i} className="flex items-center justify-center gap-4">
              {row.map((card) => (
                <ResultCard key={card.choiceId} card={card} />
              ))}
            </div>
          ))}
        </div>

        <Button
          size="lg"
          variant="outline"
          className="h-20 w-full max-w-xl rounded-full border-4 border-foreground text-3xl font-black"
          disabled={busy}
          onClick={onLeaderboard}
        >
          <ChartNoAxesColumn className="size-8" /> LEADERBOARD
        </Button>
        {error && <p className="text-center text-sm font-medium text-red-600">{error}</p>}
      </main>
    </div>
  )
}

function ResultCard({ card }: { card: Card }) {
  if (card.isReal) {
    return (
      <div className="flex w-full max-w-60 scale-105 flex-col items-center gap-2 rounded-2xl border-4 border-foreground p-5 text-center">
        <p className="text-xl font-black">{card.choice.toLowerCase()}</p>
        <span className="rounded-md bg-green-300 px-2 font-bold text-black">CORRECT</span>
        {card.pickedBy.length === 0 ? (
          <p className="text-sm">No one found it</p>
        ) : (
          card.pickedBy.map((name) => (
            <p key={name} className="font-bold">
              {name} +1000
            </p>
          ))
        )}
      </div>
    )
  }

  return (
    <div className="flex w-full max-w-52 flex-col items-center gap-1 rounded-2xl border-2 border-foreground p-4 text-center">
      <p className="text-lg font-black">{card.choice.toLowerCase()}</p>
      <p className="text-sm">Written by {card.author ?? "?"}</p>
      <p className="text-sm font-semibold">
        {card.pickedBy.length === 0
          ? "No one fooled"
          : `Fooled ${card.pickedBy.join(", ")} +${500 * card.pickedBy.length}`}
      </p>
    </div>
  )
}
