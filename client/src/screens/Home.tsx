import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { Ack } from "@/lib/socket"
import { useGame } from "@/store/game"

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
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold">🃏 Bluff Trivia</div>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <span className={`size-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
          {connected ? "online" : "offline"}
        </span>
      </div>

      {mode === "choose" ? (
        <>
          <Button size="lg" className="h-12 text-base" disabled={!connected || busy} onClick={() => run(createRoom)}>
            Host a game
          </Button>
          <Button size="lg" variant="outline" className="h-12 text-base" disabled={!connected} onClick={() => setMode("join")}>
            Join a game
          </Button>
        </>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            run(() => joinRoom(code, name))
          }}
        >
          <input
            className="h-12 rounded-lg border px-3 text-center font-mono text-2xl tracking-[0.5em] uppercase"
            placeholder="ABCD"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^a-z]/gi, "").toUpperCase())}
            autoFocus
          />
          <input
            className="h-12 rounded-lg border px-3"
            placeholder="Nickname"
            maxLength={20}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" size="lg" className="h-12 text-base" disabled={busy || code.length !== 4 || !name.trim()}>
            Join
          </Button>
          <Button type="button" variant="ghost" onClick={() => setMode("choose")}>
            Back
          </Button>
        </form>
      )}

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      {ack && <pre className="rounded-lg border p-3 text-xs">ack: {JSON.stringify(ack, null, 2)}</pre>}
      {room != null && (
        <pre className="rounded-lg border p-3 text-xs whitespace-pre-wrap">state:update: {JSON.stringify(room, null, 2)}</pre>
      )}
    </div>
  )
}
