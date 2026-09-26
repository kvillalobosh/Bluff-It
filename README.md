```markdown
# 🃏 Bluff Trivia Game

A browser-based, Kahoot/Jackbox-style party game where players submit fake answers to trivia questions to fool each other[cite: 1]. One host screen displays the game room, while 3–8 players join from their phones using a 4-letter room code[cite: 1].

Built for ShellHacks 2026[cite: 1, 4].

---

## 🏗️ Project Architecture

The repository is structured as a monorepo containing both the frontend and backend[cite: 1]:

```text
├── client/          # Frontend (React + Vite + TypeScript + Tailwind CSS)
├── server/          # Backend (Python + FastAPI + python-socketio)
├── .gitignore       # Root-level ignore file (ignores venv, node_modules, etc.)
└── README.md

```

* **Frontend:** Built with React, Vite, TypeScript, Tailwind CSS, shadcn/ui, and Framer Motion. It deploys to Vercel.


* **Backend:** Built with Python (FastAPI + `python-socketio`), using in-memory room management and asyncio timers.


* **Communication:** Real-time bi-directional WebSockets via Socket.IO.



---

## 🎮 Game Loop & Rules

Each round moves automatically through 5 server-synchronized phases:

1. **Lobby:** Host creates a room (4-letter code); players join with code and nickname.


2. **Write (~45s):** Players read the question and submit their best fake answer.


3. **Vote (~20s):** All answers (real answer + player fakes, shuffled) are shown; players guess the real answer.


4. **Reveal:** The server reveals who wrote what, who got fooled, and the real answer.


5. **Scoreboard:** Running totals update; moves to the next round or the final podium.



### Scoring System

* **+500 points:** Per player who picks your fake answer.


* **+1,000 points:** If you correctly pick the real answer.


* **0 points:** If you fail to submit an answer.



---

## 🚀 Getting Started Locally

To run the application locally, you will need two terminal windows open: one for the backend and one for the frontend.

### Prerequisites

* [Node.js](https://nodejs.org/?utm_source=gemini) (v18+ recommended)
* [Python](https://www.python.org/?utm_source=gemini) (v3.11+ recommended)


* Git

---

### 1. Backend Setup (`/server`)

Open a terminal and navigate to the `server` directory:

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



Install Python dependencies:

```bash
pip install -r requirements.txt

```

Start the FastAPI / Socket.IO server:

```bash
uvicorn main:socket_app --reload --port 8000

```

The server will start at `http://localhost:8000`.

---

### 2. Frontend Setup (`/client`)

Open a second terminal window and navigate to the `client` directory:

```bash
cd client

```

Install Node modules:

```bash
npm install

```

Configure your local environment variables:
Create a `.env.local` file inside `/client`:

```env
VITE_SERVER_URL=http://localhost:8000

```

Start the Vite development server:

```bash
npm run dev

```

Open your browser and navigate to `http://localhost:5173`.

---

## 📡 Socket.IO Events Contract

The server acts as the single source of truth. Client-server communication relies on the following Socket.IO events:

| Direction | Event Name | Payload Format | Description |
| --- | --- | --- | --- |
| Client $\to$ Server | `room:create` | `None` | Creates a room; server returns code

 |
| Client $\to$ Server | `room:join` | `{ "code": "ABCD", "nickname": "Name" }` | Joins a player to a room

 |
| Client $\to$ Server | `game:start` | `{ "code": "ABCD" }` | Host starts the game

 |
| Client $\to$ Server | `answer:submit` | `{ "code": "ABCD", "fake": "Text" }` | Submits a player's fake answer

 |
| Client $\to$ Server | `vote:submit` | `{ "code": "ABCD", "option_id": 2 }` | Submits a player's vote choice

 |
| Server $\to$ Room | `state:update` | Full room object `{ phase, players, round, deadline }` | Broadcasts phase and player changes

 |
| Server $\to$ Room | `round:question` | `{ "question": "..." }` | Broadcasts the active question

 |
| Server $\to$ Room | `round:choices` | `{ "choices": [...] }` | Shuffled choices (no authors exposed)

 |
| Server $\to$ Room | `round:reveal` | `{ "results": [...], "real_answer": "..." }` | Reveal data and awarded points

 |

---

## 🛠️ Tech Stack Details

* **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui.


* **Backend:** FastAPI, `python-socketio`, `uvicorn`.


* **Question Bank:** Static JSON bank located at `server/questions.json`.


* **Deployment:** Frontend hosted on Vercel; Game server deployed on Render/Railway.



```

```