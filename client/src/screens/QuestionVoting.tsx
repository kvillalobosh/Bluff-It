import { Avatar } from "@/components/Avatar"
import { Countdown } from "@/components/Countdown"
import { TopNav } from "@/components/ui/TopNav"
import { TOTAL_ROUNDS, VOTE_SECONDS, useGame } from "@/store/game"

// Host screen while phase === "question_voting": players pick which answer they think is real.
export function QuestionVoting() {
  const room = useGame((s) => s.room)
  const code = useGame((s) => s.code)
  if (!room) return null

  const players = Object.values(room.players)
  const totalRounds = room.max_rounds ?? TOTAL_ROUNDS
  const active = players.filter((p) => p.connected)
  const voted = active.filter((p) => p.has_voted).length

  return (
    <div className="host-lobby-screen question-voting-screen">
      <TopNav leftText={`ROUND ${room.round}`} rightText={`ROOM: ${code ?? ""}`} />

      <main className="question-voting-main">
        <Countdown deadline={room.deadline} total={VOTE_SECONDS} label="Which answer is real? Vote on your device!" />

        <div className="question-voting-grid">
          <section className="question-voting-left-panel">
            <div className="question-voting-question-card">
              <p className="question-voting-round-label">ROUND {room.round} OF {totalRounds}</p>
              <p className="question-voting-question">{room.question}</p>
            </div>

            <div className="question-voting-answer-grid">
              {room.choices.map((choice) => (
                <div key={choice.id} className="question-voting-answer-card">
                  {choice.text.toLowerCase()}
                </div>
              ))}
            </div>
          </section>

          <aside className="question-voting-status-panel">
            <div className="question-voting-status-header">
              <span>{voted}/{active.length}</span>
              <span>VOTED</span>
            </div>

            <div className="question-voting-rows">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={`question-voting-row ${p.connected ? "" : "question-voting-row--away"} ${p.has_voted ? "question-voting-row--done" : ""}`}
                >
                  <div className="question-voting-player">
                    <Avatar avatar={p.avatar} name={p.name} className="question-voting-avatar" />
                    <span className="question-voting-player-name">{p.name}</span>
                  </div>

                  <span className="question-voting-status-indicator">
                    {p.has_voted ? "✓" : "…"}
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
