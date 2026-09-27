import { Avatar } from "@/components/Avatar"
import { Countdown } from "@/components/Countdown"
import { TopNav } from "@/components/ui/TopNav"
import { useGame } from "@/store/game"
import { WRITE_SECONDS } from "@/store/game"

// Host screen while phase === "question_staging": players are writing their fake answers.
export function QuestionStaging() {
  const room = useGame((s) => s.room)
  const code = useGame((s) => s.code)
  if (!room) return null

  const players = Object.values(room.players)
  const active = players.filter((p) => p.connected)
  const answered = active.filter((p) => p.has_answered).length

  return (
    <div className="host-lobby-screen question-staging-screen">
      <TopNav leftText={`ROUND ${room.round}`} rightText={`ROOM: ${code ?? ""}`} />

      <main className="question-staging-main">
        <Countdown deadline={room.deadline} total={WRITE_SECONDS} label="" />

        <div className="question-staging-grid">
          <section className="question-staging-card-wrap">
            <div className="question-staging-card">
              <p className="question-staging-question">{room.question}</p>
            </div>
            <p className="question-staging-instruction">Write a convincing fake answer on your device!</p>
          </section>

          <aside className="question-staging-status-panel">
            <div className="question-staging-status-header">
              <span>{answered}/{active.length}</span>
              <span>SUBMITTED</span>
            </div>

            <div className="question-staging-rows">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={`question-staging-row ${p.connected ? "" : "question-staging-row--away"} ${p.has_answered ? "question-staging-row--done" : ""}`}
                >
                  <div className="question-staging-player">
                    <Avatar avatar={p.avatar} name={p.name} className="question-staging-avatar" />
                    <span className="question-staging-player-name">{p.name}</span>
                  </div>

                  <span className="question-staging-status-indicator">
                    {p.has_answered ? "✓" : "…"}
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
