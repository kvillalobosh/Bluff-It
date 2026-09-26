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

// Mirrors get_public_room_state() in server/main.py
export type Player = {
  id: string // socket sid
  name: string
  score: number
  connected: boolean
  has_answered: boolean // submitted a fake this round
  has_voted: boolean // voted this round
}

export type RoomState = {
  // "lobby" | "leaderboard_view" | "question_staging" | "question_voting" | "results" | "end_screen"
  phase: string
  round: number // 1-5; the server increments it on host:next_round
  players: Record<string, Player> // keyed by sid
  question: string | null
  choices: string[]
  // Only sent during "results"
  real_answer?: string
  round_answers?: Record<string, string> // sid -> fake text
  round_votes?: Record<string, string> // sid -> chosen text
}

type GameStore = {
  // --- data ---
  connected: boolean // is this tab's socket connected to the server?
  role: "host" | "player" | null // set once host:create / player:join_room succeeds
  code: string | null // room code this tab belongs to
  room: RoomState | null // latest state:update payload from the server

  // actions (send events to the server, resolve with its "ack")
  createRoom: () => Promise<Ack> // host:create -> { room_code }
  joinRoom: (code: string, name: string) => Promise<Ack> // player:join_room -> { success, room_code } or throws
  startGame: () => Promise<Ack> // host:start_game -> { success } or throws
  beginRound: () => Promise<Ack> // host:begin_question_staging -> { success } or throws
}

// create() returns a React hook. Components read the store with useGame(),
// and re-render whenever the values they read change.
export const useGame = create<GameStore>((set, get) => ({
  // Initial state (usually false until the "connect" event is hit below)
  connected: socket.connected,
  role: null,
  code: null,
  room: null, // no room until the server sends a state:update

  // Actions send the request and hand back the "ack" to the caller (ex. Home.tsx).
  // Room data only arrives via state:update.
  createRoom: async () => {
    const res = await call("host:create")
    // Remember we're the host of this room so App.tsx can show the lobby
    set({ role: "host", code: res.room_code as string })
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
}))

// Socket listeners: copy server events into the store.
socket.on("connect", () => useGame.setState({ connected: true }))
socket.on("disconnect", () => useGame.setState({ connected: false }))

// Broadcast to everyone in the room whenever the room changes (player joins, phase changes, etc.)
socket.on("state:update", (room: RoomState) => useGame.setState({ room }))
