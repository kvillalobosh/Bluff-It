import asyncio
import socketio
import subprocess
import sys
import os

SERVER_URL = "http://127.0.0.1:8000"

def create_client(name: str):
    """Creates a Socket.IO client that logs updates prefixed by its identifier."""
    client = socketio.AsyncClient()

    @client.on("state:update")
    def on_update(data):
        phase = data.get("phase")
        players = [p["name"] for p in data.get("players", {}).values()]
        q = data.get("question")
        print(f"[{name}] state:update -> Phase: {phase} | Players: {players} | Q: {q}")

    return client

async def run_single_game(room_label: str, host_client, p1_client, p2_client, p1_name: str, p2_name: str):
    """Executes a full lifecycle for one room."""
    # 1. Host creates room
    res = await host_client.call("host:create")
    code = res["room_code"]
    print(f"\n=== [{room_label}] Room Created with Code: {code} ===")

    # 2. Players join this specific room
    await p1_client.call("player:join_room", {"code": code, "name": p1_name})
    await p2_client.call("player:join_room", {"code": code, "name": p2_name})
    await asyncio.sleep(0.5)

    # 3. Host starts game and moves to staging
    await host_client.call("host:start_game", {"code": code})
    await asyncio.sleep(0.5)
    await host_client.call("host:begin_question_staging", {"code": code})
    await asyncio.sleep(0.5)

    # 4. Players submit their bluff answers
    print(f"[{room_label}] Submitting answers...")
    await p1_client.call("player:answer_created", {"code": code, "answer": f"{p1_name}'s bluff"})
    await p2_client.call("player:answer_created", {"code": code, "answer": f"{p2_name}'s bluff"})

    # Wait to observe the transition
    await asyncio.sleep(1)
    print(f"=== [{room_label}] Completed Lifecycle ===\n")

async def main():
    print("--- Starting local server ---")
    # Get the parent directory of this script (where main.py is)
    server_cwd = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    server_process = subprocess.Popen([sys.executable, "-m", "uvicorn", "main:socket_app", "--port", "8000"],
                                      cwd=server_cwd)
    await asyncio.sleep(2)  # Give the server a moment to start

    # Room 1 Clients
    host1 = create_client("Host-1")
    r1_p1 = create_client("Room1-Alice")
    r1_p2 = create_client("Room1-Bob")

    # Room 2 Clients
    host2 = create_client("Host-2")
    r2_p1 = create_client("Room2-Charlie")
    r2_p2 = create_client("Room2-Diana")

    all_clients = [host1, r1_p1, r1_p2, host2, r2_p1, r2_p2]

    # Connect all sockets in parallel
    print("Connecting all 6 socket clients...")
    await asyncio.gather(*(c.connect(SERVER_URL) for c in all_clients))
    print("All clients connected!\n")

    try:
        # Run both games concurrently
        await asyncio.gather(
            run_single_game("ROOM-ALPHA", host1, r1_p1, r1_p2, "Alice", "Bob"),
            run_single_game("ROOM-BETA", host2, r2_p1, r2_p2, "Charlie", "Diana"),
        )
    finally:
        # Disconnect all sockets cleanly
        print("Disconnecting all clients...")
        await asyncio.gather(*(c.disconnect() for c in all_clients))
        print("Done!")

        # Forcefully shut down the background server to free the port
        server_process.kill()
        server_process.wait()

if __name__ == "__main__":
    asyncio.run(main())