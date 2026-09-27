// It is the one shared place that holds the game state and actions
//
// Flow:
//   IN:  server emits "state:update" -> listener below -> setState -> components re-render
//   OUT: component calls an action (createRoom, joinRoom) -> call() -> server handler -> receive "ack"
//
// The server is the source of truth! It never decides the phase, it only
// keeps a copy of the latest state the server broadcast.

import { create } from "zustand"
import { call, socket, type Ack } from "@/lib/socket"

// Game length — must match the `round > 5` check in host:next_round (server/main.py)
export const TOTAL_ROUNDS = 5
// Phase lengths in seconds — must match WRITE_SECONDS / VOTE_SECONDS in server/main.py (used to size the timer bar)
export const WRITE_SECONDS = 45
export const VOTE_SECONDS = 30

// Mirrors get_public_room_state() in server/main.py
export type Player = {
  id: string // socket sid
  name: string
  avatar?: string // animal id, e.g. "fox" -> client/public/avatars/fox.png (see components/Avatar.tsx)
  score: number
  connected: boolean
  has_answered: boolean // submitted a fake this round
  has_voted: boolean // voted this round
}

export type Choice = {
  id: string
  text: string
}

export type RoomState = {
  // "lobby" | "leaderboard_view" | "question_staging" | "question_voting" | "results" | "end_screen"
  phase: string
  round: number // 1-5; the server increments it on host:next_round
  players: Record<string, Player> // keyed by sid
  question: string | null
  choices: Choice[]
  deadline: number | null // unix seconds when the current phase's timer ends (write / vote)
  // Only sent during "results"
  real_answer?: string
  round_answers?: Record<string, string> // sid -> fake text
  round_votes?: Record<string, string> // sid -> chosen choice id
}

type GameStore = {
  // --- data ---
  connected: boolean // is this tab's socket connected to the server?
  role: "host" | "player" | null // set once host:create / player:join_room succeeds
  code: string | null // room code this tab belongs to
  room: RoomState | null // latest state:update payload from the server
  myAnswer: string | null // this player's fake for the current round (so voting can hide it later)
  myAnswerId: string | null // stable id for this player's submitted fake answer, so duplicates remain distinct
  myVote: string | null // the choice this player voted for this round
  roundStartScores: Record<string, number> | null // sid -> score when the current round began (leaderboard counts up from here)

  // actions (send events to the server, resolve with its "ack")
  createRoom: () => Promise<Ack> // host:create -> { room_code }
  joinRoom: (code: string, name: string) => Promise<Ack> // player:join_room -> { success, room_code } or throws
  startGame: () => Promise<Ack> // host:start_game -> { success } or throws
  beginRound: () => Promise<Ack> // host:begin_question_staging -> { success } or throws
  submitAnswer: (answer: string) => Promise<Ack> // player:answer_created -> { success } or throws
  submitVote: (choiceId: string) => Promise<Ack> // player:submit_vote -> { success } or throws
  nextRound: () => Promise<Ack> // host:next_round -> back to leaderboard_view (or end_screen after the last round)
}

// create() returns a React hook. Components read the store with useGame(),
// and re-render whenever the values they read change.
export const useGame = create<GameStore>((set, get) => ({
  // Initial state (usually false until the "connect" event is hit below)
  connected: socket.connected,
  role: null,
  code: null,
  room: null, // no room until the server sends a state:update
  myAnswer: null,
  myAnswerId: null,
  myVote: null,
  roundStartScores: null,

  // Actions send the request and hand back the "ack" to the caller (ex. Home.tsx).
  // Room data only arrives via state:update.
  createRoom: async () => {
    const res = await call("host:create")
    const roomCode = res.room_code as string
    const hostToken = typeof res.host_token === "string" ? res.host_token : null

    sessionStorage.setItem("host_room_code", roomCode)
    if (hostToken) sessionStorage.setItem("host_token", hostToken)

    // Remember we're the host of this room so App.tsx can show the lobby
    set({ role: "host", code: roomCode })
    return res
  },
  joinRoom: async (code, name) => {
    const res = await call("player:join_room", { code, name })
    // Remember we're a player in this room so App.tsx can show the player lobby
    set({ role: "player", code: res.room_code as string })
    return res
  },
  startGame: () => call("host:start_game", { code: get().code }),
  beginRound: () => call("host:begin_question_staging", { code: get().code }),
  submitAnswer: async (answer) => {
    const res = await call("player:answer_created", { code: get().code, answer })
    // Only remember it once the server accepted it (e.g. not rejected for matching the real answer)
    set({ myAnswer: answer, myAnswerId: typeof res.choice_id === "string" ? res.choice_id : null })
    return res
  },
  submitVote: async (choiceId) => {
    const res = await call("player:submit_vote", { code: get().code, choice_id: choiceId })
    set({ myVote: choiceId })
    return res
  },
  nextRound: () => call("host:next_round", { code: get().code }),
}))

// Socket listeners: copy server events into the store.
socket.on("disconnect", () => useGame.setState({ connected: false }))
socket.on("connect", async () => {
  useGame.setState({ connected: true })

  // Only restore a host session if we are truly reconnecting to an existing room,
  // not when the user is simply creating a fresh room in this tab.
  if (useGame.getState().role !== null) return

  const savedCode = sessionStorage.getItem("host_room_code")
  const savedToken = sessionStorage.getItem("host_token")

  if (!savedCode || !savedToken) return

  socket.emit(
    "host:reconnect",
    { code: savedCode, host_token: savedToken },
    (res: { success: boolean; state?: any; error?: string }) => {
      if (res.success) {
        useGame.setState({
          role: "host",
          code: savedCode,
          room: res.state,
        })
      } else {
        sessionStorage.clear()
      }
    }
  )
})

// Broadcast to everyone in the room whenever the room changes (player joins, phase changes, etc.)
socket.on("state:update", (room: RoomState) => {
  const prevPhase = useGame.getState().room?.phase

  // A new writing phase starting = new round: forget last round's answer/vote and snapshot everyone's score
  if (room.phase === "question_staging" && prevPhase !== "question_staging") {
    const roundStartScores = Object.fromEntries(Object.values(room.players).map((p) => [p.id, p.score]))
    useGame.setState({ room, myAnswer: null, myVote: null, roundStartScores })
    return
  }

  useGame.setState({ room })
})
