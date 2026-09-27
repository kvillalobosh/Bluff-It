# imports!
import random
import string
import socketio
from questions import get_random_question
import asyncio
import time

# Create the Socket.IO async server
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

# Wrap with ASGI application so Uvicorn can run it
socket_app = socketio.ASGIApp(sio)

# Phase lengths in seconds — used for both the client countdown (deadline) and the server timer.
# Must match WRITE_SECONDS / VOTE_SECONDS in client/src/store/game.ts
WRITE_SECONDS = 45
VOTE_SECONDS = 30

# Rounds per game — must match TOTAL_ROUNDS in client/src/store/game.ts
TOTAL_ROUNDS = 1

# a dictionary to hold all the active rooms
# key: 4-letter room code
# value: a dictionary full of room info
rooms = {}

"""
rooms[code] = {
    "host_sid": sid,
    "phase": "lobby",
    "round": 1,
    "players": {
        sid: {
            "id": sid
            "name": name,
            "score": 0,
            "connected": True,
            "avatar": avatar
        }
    },
    # Round-specific server data
    "current_question": None,     # Dict loaded from questions.json
    "round_answers": {},          # Key: sid Value: "Fake answer text"
    "round_votes": {},            # Key: sid Value: vote_choice
    "shuffled_choices": [],        # List of options displayed during voting
    "timer_task":
}
"""

ANIMAL_AVATARS = [
    "bear.png",
    "frog.png",
    "giraffe.png",
    "koala.png",
    "lion.png",
    "monkey.png",
    "panda.png",
    "red-panda.png",
    "rhino.png",
    "sloth.png",
]

# helper functions

def choose_avatar_for_player(room: dict, used_avatars: set[str] | None = None):
    available = [
        name for name in ANIMAL_AVATARS
        if not used_avatars or name not in used_avatars
    ]
    return random.choice(available) if available else random.choice(ANIMAL_AVATARS)

# validates room existence and host permission.
def get_room_or_error_host(code: str, host_sid: str = None):
    code = code.upper().strip() if code else ""
    if not code or code not in rooms:
        return None, {"success": False, "error": f"Room '{code}' not found."}

    room = rooms[code]
    if host_sid and room["host_sid"] != host_sid:
        return None, {"success": False, "error": "Unauthorized: Host action only."}

    return room, None


# Validates that:
# 1. The room exists.
# 2. The sender (sid) is an active player in that room (not the host, not an outsider).
def get_room_or_error_player(code: str, player_sid: str):
    code = code.upper().strip() if code else ""
    if not code or code not in rooms:
        return None, None, {"success": False, "error": f"Room '{code}' not found."}

    room = rooms[code]

    # Block the host from participating as a player
    if player_sid == room["host_sid"]:
        return None, None, {"success": False, "error": "Hosts cannot perform player actions."}

    # Verify the sid exists in this room's players dictionary
    if player_sid not in room["players"]:
        return None, None, {"success": False, "error": "You are not a registered player in this room."}

    player = room["players"][player_sid]
    return room, player, None

def get_public_room_state(room: dict) -> dict:
    """
    Strips out sensitive server-only data (like real_answer and who wrote what)
    so clients only see what they are allowed to see for the current phase.
    """
    # Create a fresh copy of the players dict and inject submission statuses
    safe_players_copy = {}
    for sid, player in room["players"].items():
        safe_player = player.copy()
        # Check if their socket ID exists in the answers/votes dicts
        safe_player["has_answered"] = sid in room.get("round_answers", {})
        safe_player["has_voted"] = sid in room.get("round_votes", {})
        safe_players_copy[sid] = safe_player

    public_state = {
        "phase": room["phase"],
        "round": room.get("round", 1),
        "players": safe_players_copy,
        "question": None,
        "choices": room.get("shuffled_choices", []),
        # Unix timestamp (seconds) when the current phase's timer runs out, so clients can show a countdown
        "deadline": room.get("deadline"),
    }

    # Only expose the prompt string, never real_answer or author mappings
    if room.get("current_question"):
        public_state["question"] = room["current_question"]["question"]

        # If we are in the results phase, it's safe to reveal the answers and votes!
        if room["phase"] == "results":
            public_state["real_answer"] = room["current_question"]["real_answer"]
            public_state["round_answers"] = room.get("round_answers", {})
            public_state["round_votes"] = room.get("round_votes", {})

    return public_state

# go from question staging to answer voting
async def transition_to_vote(code: str):
    if code not in rooms:
        return
    room = rooms[code]

    # Guard: prevent running twice if timer and last submission hit at the same second
    if room["phase"] == "question_voting":
        return

    room["phase"] = "question_voting"

    # 1. Collect all choices: the real answer + whatever fake answers were submitted
    all_choices = [room["current_question"]["real_answer"]]
    for fake_text in room["round_answers"].values():
        if fake_text not in all_choices:  # Avoid duplicate cards on screen
            all_choices.append(fake_text)

    # 2. Shuffle them so the real answer isn't always choice #1
    random.shuffle(all_choices)

    # 3. Store the public list (just strings or id/text pairs, NO player SIDs attached!)
    room["shuffled_choices"] = all_choices
    room["deadline"] = time.time() + VOTE_SECONDS

    # 4. Broadcast the new voting phase and the options to everyone
    public_state = get_public_room_state(room)
    await sio.emit("state:update", public_state, room=code)

    # 5. Start the voting timer
    if room.get("timer_task"):
        room["timer_task"].cancel()
    room["timer_task"] = asyncio.create_task(vote_phase_timer(code, seconds=VOTE_SECONDS))

# timer for question staging
async def write_phase_timer(code: str, seconds: int = 45):
    try:
        # Sleep for the duration of the question (e.g., 45s)
        await asyncio.sleep(seconds)
        # If not canceled, time ran out -> advance to vote phase
        await transition_to_vote(code)
    except asyncio.CancelledError:
        # Timer was stopped early because all players submitted!
        pass

# timer for question answering
async def vote_phase_timer(code: str, seconds: int = 30):
    try:
        # Sleep for the duration of the question (e.g., 30s)
        await asyncio.sleep(seconds)
        # If not canceled, time ran out -> advance to results page
        await transition_to_results(code)
    except asyncio.CancelledError:
        # Timer was stopped early because all players submitted!
        pass

# go from voting to results
async def transition_to_results(code: str):
    if code not in rooms:
        return
    room = rooms[code]

    if room["phase"] == "results":
        return
    room["phase"] = "results"

    # award points
    real_answer = room["current_question"]["real_answer"]
    for voter_sid, vote_choice in room.get("round_votes", {}).items():
        if vote_choice == real_answer:
            # Player voted for the correct answer
            room["players"][voter_sid]["score"] += 1000
        else:
            # Player voted for a fake answer, find the answer owner and award 500
            for author_sid, answer_text in room.get("round_answers", {}).items():
                if answer_text == vote_choice:
                    if author_sid in room["players"]:
                        room["players"][author_sid]["score"] += 500
                    break # found the author, no need to keep looping

    # Broadcast the new phase
    public_state = get_public_room_state(room)
    await sio.emit("state:update", public_state, room=code)

# user hits "host game" and client broadcasts "host:create" signal
# server creates the room, adds it to rooms, and returns the code generated to the "host" client
@sio.on("host:create")
async def handle_create_room(sid):
    # Generate a unique 4-letter code
    code = "".join(random.choices(string.ascii_uppercase, k=4))
    while code in rooms:
        code = "".join(random.choices(string.ascii_uppercase, k=4))

    # add to socketio room
    await sio.enter_room(sid, code)

    # store it into the rooms dictionary
    rooms[code] = {
        "host_sid": sid,
        "phase": "lobby",
        "round": 1,
        "players": {},
        "current_question": None,
        "round_answers": {},
        "round_votes": {},
        "shuffled_choices": []
    }

    print(f"Room {code} created successfully by host {sid}")

    # Broadcast initial lobby state so host screen immediately initializes
    public_state = get_public_room_state(rooms[code])
    await sio.emit("state:update", public_state, room=code)

    return {"room_code": code}

# user hits "join room" and client broadcasts "player:join_room" signal
# server checks code and name before adding player to the correct room
# also emits an update signal with the updated room data to all other clients
@sio.on("player:join_room")
async def handle_join_room(sid, data: dict):
    # get the room code and nickname
    code = data.get("code", "").upper().strip()
    name = data.get("name", "").strip()

    # validation checks
    if not code or not name:
        return {"success": False, "error": "Code and name are required."}
    if code not in rooms:
        return {"success": False, "error": "Code not found."}
    room = rooms[code]

    # room cap validation
    if len(room["players"]) >= 8:
        return {"success": False, "error": "Room capacity reached."}

    # room phase validation
    if room["phase"] != "lobby":
        return {"success": False, "error": "Game has already started."}

    # check if the room already has that name
    existing_names = [
        player["name"].lower()
        for player in room["players"].values()
    ]
    if name.lower() in existing_names:
        return {
            "success": False,
            "error": f"Name '{name}' is already taken. Choose another!"
        }

    used_avatars = {player["avatar"] for player in room["players"].values() if "avatar" in player}
    avatar = choose_avatar_for_player(room, used_avatars)

    # add player to the socket.io room group
    await sio.enter_room(sid, code)

    # store player data in the room dict
    room["players"][sid] = {
        "id": sid,
        "name": name,
        "avatar": avatar,
        "score": 0,
        "connected": True,
    }

    # broadcast sanitized updated room state to all devices in the room
    public_state = get_public_room_state(room)
    await sio.emit("state:update", public_state, room=code)

    print(f"Player '{name}' ({sid}) joined room {code}")

    return {"success": True, "room_code": code}

# user hits "start game" on host client and broadcasts "host:start_game"
# sets the round to 1, phase to leaderboard_view
@sio.on("host:start_game")
async def handle_start_game(sid, data: dict):
    code = data.get("code", "").upper().strip()

    # validate room existence and host status
    room, error = get_room_or_error_host(code, host_sid=sid)
    if error:
        return error

    # prevent starting an empty room
    if len(room["players"]) < 1:
        return {"success": False, "error": "Need at least 1 player to start."}

    # update the state machine
    room["phase"] = "leaderboard_view"
    room["round"] = 1

    # broadcast updated state
    public_state = get_public_room_state(room)
    await sio.emit("state:update", public_state, room=code)

    return {"success": True}

@sio.on("host:begin_question_staging")
async def handle_start_question_staging(sid, data: dict):
    code = data.get("code", "").upper().strip()

    # validate room existence and host status
    room, error = get_room_or_error_host(code, host_sid=sid)
    if error:
        return error

    # update phase and pick question
    room["phase"] = "question_staging"
    room["current_question"] = get_random_question()
    room["round_answers"] = {}
    room["round_votes"] = {}

    # Cancel any lingering prior timer
    if room.get("timer_task"):
        room["timer_task"].cancel()
    # Start timer
    room["deadline"] = time.time() + WRITE_SECONDS
    room["timer_task"] = asyncio.create_task(write_phase_timer(code, seconds=WRITE_SECONDS))

    # broadcast updated state to everyone in socket room
    public_state = get_public_room_state(room)
    await sio.emit("state:update", public_state, room=code)

    return {"success": True}

@sio.on("player:answer_created")
async def handle_answer_creation(sid, data: dict):
    code = data.get("code", "").upper().strip()
    answer_text = data.get("answer", "").strip()

    # 1. Validate room and player existence + authentication
    room, player, error = get_room_or_error_player(code, player_sid=sid)
    if error:
        return error

    # 2. Guard: Must be in the writing phase
    if room.get("phase") not in ("write", "question_staging"):
        return {"success": False, "error": "Submissions are closed for this round."}

    # 3. Guard: Answer cannot be blank
    if not answer_text:
        return {"success": False, "error": "Answer cannot be blank."}

    # 3a. Guard: Answer cannot match real_answer
    if answer_text.lower() == room["current_question"]["real_answer"].lower():
        return {"success": False, "error": "Answer has to be fake. Get creative!"}

    # 4. Guard: One submission per round
    if sid in room["round_answers"]:
        return {"success": False, "error": "You have already submitted an answer."}

    # 5. Save the answer privately on the server
    room["round_answers"][sid] = answer_text

    # 6. Inform everyone that a player has locked in (without leaking text)
    public_state = get_public_room_state(room)
    await sio.emit("state:update", public_state, room=code)

    # 7. Auto-advance if every active player has submitted
    active_players_count = sum(1 for p in room["players"].values() if p.get("connected"))
    if len(room["round_answers"]) >= active_players_count:
        # 1. Cancel the ticking background timer so it doesn't fire later
        if room.get("timer_task"):
            room["timer_task"].cancel()
            room["timer_task"] = None

        # 2. Advance to vote immediately
        await transition_to_vote(code)

    return {"success": True}

@sio.on("player:submit_vote")
async def handle_submit_vote(sid, data: dict):
    code = data.get("code", "").upper().strip()
    vote_choice = data.get("choice")

    # 1. Validate room and player
    room, player, error = get_room_or_error_player(code, player_sid=sid)
    if error:
        return error

    # 2. Guard: Must be in the voting phase
    if room.get("phase") != "question_voting":
        return {"success": False, "error": "Voting is closed."}

    # 3. Guard: One vote per round
    if sid in room["round_votes"]:
        return {"success": False, "error": "You have already voted."}

    # 4. Guard: Ensure they are voting for an actual choice
    if vote_choice not in room["shuffled_choices"]:
        return {"success": False, "error": "Invalid choice."}

    # 5. Save the vote privately on the server
    room["round_votes"][sid] = vote_choice

    # 6. Optional: update clients so they know someone locked in
    public_state = get_public_room_state(room)
    await sio.emit("state:update", public_state, room=code)

    # 7. Auto-advance if every active player has voted
    active_players_count = sum(1 for p in room["players"].values() if p.get("connected"))
    if len(room["round_votes"]) >= active_players_count:
        if room.get("timer_task"):
            room["timer_task"].cancel()
            room["timer_task"] = None
        await transition_to_results(code)

    return {"success": True}

@sio.on("host:next_round")
async def handle_start_next_round(sid, data:dict):
    code = data.get("code", "").upper().strip()

    # validate room existence and host status
    room, error = get_room_or_error_host(code, host_sid=sid)
    if error:
        return error

    # update the state machine
    room["round"] += 1

    # check if we reached the end of the game (five rounds)
    if room["round"] > 1:
        room["phase"] = "end_screen"
    else:
        room["phase"] = "leaderboard_view"
        room["current_question"] = None
        room["round_answers"] = {}
        room["round_votes"] = {}
        room["shuffled_choices"] = []

    # broadcast updated state
    public_state = get_public_room_state(room)
    await sio.emit("state:update", public_state, room=code)

    return {"success": True}

@sio.on("disconnect")
async def handle_disconnect(sid):
    # Find if this sid belongs to any room and mark them as disconnected
    for code, room in rooms.items():
        if sid in room["players"]:
            room["players"][sid]["connected"] = False
            print(f"Player {sid} disconnected from room {code}")
            
            # Broadcast state so the host screen can gray out their avatar
            public_state = get_public_room_state(room)
            await sio.emit("state:update", public_state, room=code)
            
            # Trigger auto-advance checks in case we were just waiting on this one disconnected player!
            active_players_count = sum(1 for p in room["players"].values() if p.get("connected"))
            
            if room["phase"] in ("write", "question_staging") and len(room["round_answers"]) >= active_players_count and active_players_count > 0:
                if room.get("timer_task"):
                    room["timer_task"].cancel()
                    room["timer_task"] = None
                await transition_to_vote(code)
                
            elif room["phase"] == "question_voting" and len(room["round_votes"]) >= active_players_count and active_players_count > 0:
                if room.get("timer_task"):
                    room["timer_task"].cancel()
                    room["timer_task"] = None
                await transition_to_results(code)
            
            break # Found the player, no need to keep checking other rooms