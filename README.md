# 🃏 Bluff It! — Bluff Trivia Game

A browser-based, Kahoot/Jackbox-style party game where players write fake answers to trivia questions to fool each other. One host screen shows the game, while up to 8 players join from their own devices using a 4-letter room code.

Built for ShellHacks 2026!

---

## Project Architecture

The repository is a monorepo containing both the frontend and backend:

```text
├── client/              # Frontend (React + Vite + TypeScript + Tailwind CSS)
│   └── src/
│       ├── App.tsx      # Picks the screen from the server's phase + this tab's role (host / player)
│       ├── screens/     # One component per screen (HostLobby, PlayerVote, HostLeaderboard, ...)
│       ├── store/       # Zustand store: mirrors the server's room state, sends actions
│       └── lib/         # Socket.IO client, countdown hook, layout helpers
├── server/              # Backend (Python + python-socketio)
│   ├── main.py          # Rooms, game state machine, timers, scoring
│   ├── questions.py     # Loads and picks questions
│   └── questions.json   # Question bank
├── requirements.txt     # Python dependencies
└── README.md
```

* **Frontend:** React, Vite, TypeScript, Tailwind CSS, shadcn/ui, Motion (animations) and Zustand (state). Deploys to Vercel.
* **Backend:** Python `python-socketio` running on `uvicorn`, with in-memory rooms and asyncio timers.
* **Communication:** Real-time, two-way WebSockets via Socket.IO. The server is the single source of truth; clients only render the state it broadcasts.

---

## Game Loop & Rules

A game has **5 rounds**. The host's screen shows the room; each player sees their own view.

1. **Lobby:** The host creates a room (4-letter code). Players join with the code and a nickname and get a random animal avatar.
2. **Leaderboard:** Standings are shown. The host starts the next round.
3. **Write (45s):** Players read the question and submit their best fake answer. Moves on early once everyone has submitted.
4. **Vote (30s):** The real answer and all fakes are shown, shuffled. Players pick the one they think is real (they don't see their own fake). Moves on early once everyone has voted.
5. **Results:** The real answer is revealed, along with who wrote each fake and who fell for it. The host clicks **Leaderboard** to continue.

Steps 2–5 repeat for each round. After round 5, everyone sees the **final podium**.

### Scoring System

* **+1,000 points:** You pick the real answer.
* **+500 points:** For each player who picks your fake answer.
* Points are never taken away. Not submitting or voting just earns nothing that round.

---

## Getting Started Locally

You need two terminal windows: one for the backend and one for the frontend.

### Prerequisites

* [Node.js](https://nodejs.org/) (v18+ recommended)
* [Python](https://www.python.org/) (v3.11+ recommended)
* Git

---

### 1. Backend Setup (`/server`)

Open a terminal and go to the `server` directory:

```bash
cd server
```

Create and activate a Python virtual environment:

* **macOS / Linux:**

  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

* **Windows (PowerShell):**

  ```powershell
  python -m venv venv
  venv\Scripts\Activate.ps1
  ```

Install the Python dependencies (`requirements.txt` is in the repo root):

```bash
pip install -r ../requirements.txt
```

Start the Socket.IO server:

```bash
uvicorn main:socket_app --reload --port 8000
```

The server runs at `http://localhost:8000`.

> **Note:** Rooms live in memory. With `--reload`, saving `server/main.py` restarts the server and deletes every room, so refresh all tabs and create a new room afterward.

---

### 2. Frontend Setup (`/client`)

Open a second terminal and go to the `client` directory:

```bash
cd client
```

Install Node modules:

```bash
npm install
```

Create a `.env.local` file inside `/client` (optional; this is the default):

```env
VITE_SERVER_URL=http://localhost:8000
```

Start the Vite development server:

```bash
npm run dev
```

Open `http://localhost:5173`. To test alone, open one tab as the host and other tabs as players.

---

## 📡 Socket.IO Events Contract

The server is the single source of truth. Clients send requests, and every request gets a direct reply (an "ack"): `{ "success": true, ... }`, or `{ "success": false, "error": "..." }` if it's rejected. All game state reaches clients through one broadcast event, `state:update`.

### Client → Server

| Event | Sent by | Payload | Ack (reply) | Description |
| --- | --- | --- | --- | --- |
| `host:create` | Host | none | `{ "room_code": "ABCD" }` | Creates a room with a random 4-letter code; the host joins it |
| `player:join_room` | Player | `{ "code": "ABCD", "name": "Name" }` | `{ "success": true, "room_code": "ABCD" }` | Joins a room in the lobby (max 8 players, unique names); assigns a random animal avatar |
| `host:start_game` | Host | `{ "code": "ABCD" }` | `{ "success": true }` | Starts the game (needs at least 1 player); phase → `leaderboard_view` |
| `host:begin_question_staging` | Host | `{ "code": "ABCD" }` | `{ "success": true }` | Picks a question and starts the 45s writing timer; phase → `question_staging` |
| `player:answer_created` | Player | `{ "code": "ABCD", "answer": "Text" }` | `{ "success": true }` | Submits a fake answer (not blank, not the real answer, one per round) |
| `player:submit_vote` | Player | `{ "code": "ABCD", "choice": "Answer text" }` | `{ "success": true }` | Votes for the answer the player thinks is real (one per round) |
| `host:next_round` | Host | `{ "code": "ABCD" }` | `{ "success": true }` | After results: phase → `leaderboard_view`, or `end_screen` after the last round |

### Server → Room

| Event | Payload | Description |
| --- | --- | --- |
| `state:update` | Room state (below) | Broadcast after every change: a player joins, submits or disconnects, or the phase changes |

**`state:update` payload**

```json
{
  "phase": "lobby | leaderboard_view | question_staging | question_voting | results | end_screen",
  "round": 1,
  "players": {
    "<sid>": {
      "id": "<sid>",
      "name": "Name",
      "avatar": "bear.png",
      "score": 0,
      "connected": true,
      "has_answered": false,
      "has_voted": false
    }
  },
  "question": "Question text or null",
  "choices": ["Shuffled answers: the real one plus every fake, no authors"],
  "deadline": 1790000000.0,

  "real_answer": "Only sent during results",
  "round_answers": { "<sid>": "Their fake (only sent during results)" },
  "round_votes": { "<sid>": "The answer they picked (only sent during results)" }
}
```

- `deadline` is a Unix timestamp in seconds for when the current phase's timer ends. Clients use it for the countdown.
- `real_answer`, `round_answers` and `round_votes` are only included once the phase is `results`, so nobody can see the real answer early.
- A phase advances as soon as every connected player has answered or voted, instead of waiting for the timer.
- When a player disconnects, they're marked `"connected": false` and aren't waited on.

### Shared constants

These values exist on both sides and must match:

| Constant | Server (`server/main.py`) | Client (`client/src/store/game.ts`) |
| --- | --- | --- |
| Writing time | `WRITE_SECONDS = 45` | `WRITE_SECONDS = 45` |
| Voting time | `VOTE_SECONDS = 30` | `VOTE_SECONDS = 30` |
| Rounds per game | `TOTAL_ROUNDS = 5` | `TOTAL_ROUNDS = 5` |

---

## 🛠️ Tech Stack Details

* **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Motion, Zustand, `socket.io-client`, canvas-confetti.
* **Backend:** `python-socketio`, `uvicorn`.
* **Question Bank:** Static JSON file at `server/questions.json`.
* **Deployment:** Frontend on Vercel; game server on Render/Railway.
