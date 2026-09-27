import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { Ack } from "@/lib/socket"
import { useGame } from "@/store/game"
import logo from "@/assets/bluffit-logo.png"

export function Home() {
  const [mode, setMode] = useState<"choose" | "join">("choose")
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const [ack, setAck] = useState<Ack | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { connected, room, createRoom, joinRoom } = useGame()

  const run = async (fn: () => Promise<Ack>) => {
    setBusy(true)
    setError(null)
    setAck(null)
    try {
      setAck(await fn())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="home-page">
      <div className="home-header">
        <img
          src={logo}
          alt="Bluff Trivia"
          className={`home-logo ${mode === "join" ? "home-logo--tiny" : ""}`}
        />
      </div>

      <div className="home-status">
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <span className={`size-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
          {connected ? "online" : "offline"}
        </span>
      </div>

      <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 px-4 py-6">
        {mode === "choose" ? (
          <>
            <Button size="lg" className="home-action-button home-action-button-secondary" disabled={!connected || busy} onClick={() => run(createRoom)}>
              Host a game
            </Button>
            <Button size="lg" variant="outline" className="home-action-button" disabled={!connected} onClick={() => setMode("join")}>
              Join a game
            </Button>
          </>
        ) : (
          <form
            className="home-form"
            onSubmit={(e) => {
              e.preventDefault()
              run(() => joinRoom(code, name))
            }}
          >
            <input
              className="home-input home-input-code"
              placeholder="Room Code"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^a-z]/gi, "").toUpperCase())}
              autoFocus
            />
            <input
              className="home-input"
              placeholder="Nickname"
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button type="submit" size="lg" className="home-action-button" disabled={busy || code.length !== 4 || !name.trim()}>
              Join
            </Button>
            <Button type="button" className="home-action-button home-action-button-secondary" onClick={() => setMode("choose")}>
              Back
            </Button>
          </form>
        )}
      </div>
      

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      {ack && <pre className="rounded-lg border p-3 text-xs">ack: {JSON.stringify(ack, null, 2)}</pre>}
      {room != null && (
        <pre className="rounded-lg border p-3 text-xs whitespace-pre-wrap">state:update: {JSON.stringify(room, null, 2)}</pre>
      )}
    </div>
  )
}
