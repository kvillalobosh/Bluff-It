import { io } from "socket.io-client"

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:8000"

// To allow multiple players to play (several tabs) to simulate host + players.
export const socket = io(SERVER_URL, { transports: ["websocket"] })

export type Ack = { success?: boolean; error?: string; [key: string]: unknown }

// Emit an event and wait for the server's return value (the "ack").
// Throws if the server replies { success: false } or doesn't answer in 5s.
export async function call(event: string, data?: object): Promise<Ack> {
  const emitter = socket.timeout(5000)
  const res: Ack =
    data === undefined
      ? await emitter.emitWithAck(event)
      : await emitter.emitWithAck(event, data)
  if (res?.success === false) throw new Error(res.error ?? "Request failed")
  return res
}
