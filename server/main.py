# imports!
import random
import string
import socketio
from questions import get_random_question
import asyncio

# Create the Socket.IO async server
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

# Wrap with ASGI application so Uvicorn can run it
socket_app = socketio.ASGIApp(sio)

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
        "id": sid,
        "name": name,
        "score": 0,
        "connected": True,
        "has_submitted": False
    },
    # Round-specific server data
    "current_question": None,     # Dict loaded from questions.json
    "round_answers": {},          # Key: sid Value: "Fake answer text"
    "round_votes": {},            # Key: sid Value: choice_id
    "shuffled_choices": []        # List of options displayed during voting
}
"""

# helper functions

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
    public_state = {
        "phase": room["phase"],
        "round": room.get("round", 1),
        "players": room["players"],
        "question": None,
        "choices": room.get("shuffled_choices", []),
    }

    # Only expose the prompt string, never real_answer or author mappings
    if room.get("current_question"):
        public_state["question"] = room["current_question"]["question"]

    return public_state

# go from question staging to answer voting
async def transition_to_vote(code: str):
    if code not in rooms:
        return
    room = rooms[code]

    # Guard: prevent running twice if timer and last submission hit at the same second
    if room["phase"] == "vote":
        return

    room["phase"] = "vote"

    # 1. Collect all choices: the real answer + whatever fake answers were submitted
    all_choices = [room["current_question"]["real_answer"]]
    for fake_text in room["round_answers"].values():
        if fake_text not in all_choices:  # Avoid duplicate cards on screen
            all_choices.append(fake_text)

    # 2. Shuffle them so the real answer isn't always choice #1
    random.shuffle(all_choices)

    # 3. Store the public list (just strings or id/text pairs, NO player SIDs attached!)
    room["shuffled_choices"] = all_choices

    # 4. Broadcast the new voting phase and the options to everyone
    public_state = get_public_room_state(room)
    await sio.emit("state:update", public_state, room=code)

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

    # add player to the socket.io room group
    await sio.enter_room(sid, code)

    # store player data in the room dict
    room["players"][sid] = {
        "id": sid,
        "name": name,
        "score": 0,
        "connected": True,
        "has_submitted": False
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
    room["timer_task"] = asyncio.create_task(write_phase_timer(code, seconds=45))

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

    # 4. Guard: One submission per round
    if sid in room["round_answers"]:
        return {"success": False, "error": "You have already submitted an answer."}

    # 5. Save the answer privately on the server
    room["round_answers"][sid] = answer_text
    player["has_submitted"] = True

    # 6. Inform everyone that a player has locked in (without leaking text)
    public_state = get_public_room_state(room)
    await sio.emit("state:update", public_state, room=code)

    # 7. Auto-advance if every registered player has submitted
    if len(room["round_answers"]) >= len(room["players"]):
        # Auto-advance if every registered player has submitted
        if len(room["round_answers"]) >= len(room["players"]):
            # 1. Cancel the ticking background timer so it doesn't fire later
            if room.get("timer_task"):
                room["timer_task"].cancel()
                room["timer_task"] = None

            # 2. Advance to vote immediately
            await transition_to_vote(code)

    return {"success": True}