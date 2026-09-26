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
        print(f"[{name}] state:update -> Phase: {phase} | Round: {data.get('round')} | Players: {players} | Q: {q}")

        # Log Leaderboard
        if phase == "leaderboard_view":
            print(f"  [{name} LEADERBOARD] Current Scores:")
            for p in data.get("players", {}).values():
                print(f"    - {p['name']}: {p['score']} pts")

        # Log Voting Choices
        if data.get("choices"):
            print(f"  [{name}] Voting Choices: {data.get('choices')}")

        # Log Results
        if phase == "results":
            print(f"  [{name} RESULTS] Real Answer: {data.get('real_answer')}")
            print(f"  [{name} RESULTS] Votes: {data.get('round_votes')}")

        # Log End Screen
        if phase == "end_screen":
            print(f"  [{name}] GAME OVER! Final scores:")
            for p in data.get("players", {}).values():
                print(f"    - {p['name']}: {p['score']} pts")

    return client


async def run_game(room_label: str, host_client, player_clients: list, player_names: list, disconnect_idx: int = -1,
                   disconnect_round: int = -1):
    """Executes a full lifecycle for one room."""
    # 1. Host creates room
    res = await host_client.call("host:create")
    code = res["room_code"]
    print(f"\n=== [{room_label}] Room Created with Code: {code} ===")

    # 2. Players join this specific room
    for i, p_client in enumerate(player_clients):
        await p_client.call("player:join_room", {"code": code, "name": player_names[i]})
    await asyncio.sleep(0.5)

    # 3. Host starts game
    await host_client.call("host:start_game", {"code": code})
    await asyncio.sleep(0.5)

    # 4. Play through 5 rounds
    for round_num in range(1, 6):
        print(f"\n[{room_label}] =================== STARTING ROUND {round_num} ===================")

        # Host advances from previous results
        if round_num > 1:
            await host_client.call("host:next_round", {"code": code})
            await asyncio.sleep(0.5)

        # Move to staging
        await host_client.call("host:begin_question_staging", {"code": code})
        await asyncio.sleep(0.5)

        # Trigger Disconnect Scenario
        if round_num == disconnect_round and disconnect_idx != -1:
            print(f"\n[{room_label}] !!! WARNING: Player {player_names[disconnect_idx]} is disconnecting mid-game! !!!")
            await player_clients[disconnect_idx].disconnect()
            await asyncio.sleep(0.5)  # Give the server a moment to register disconnect

        # Players submit their bluff answers
        print(f"[{room_label}] Submitting answers...")
        for i, p_client in enumerate(player_clients):
            if p_client.connected:
                await p_client.call("player:answer_created",
                                    {"code": code, "answer": f"{player_names[i]} bluff {round_num}"})
                await asyncio.sleep(0.2)

        # Wait to observe the transition to vote
        await asyncio.sleep(1)

        # Players submit votes
        print(f"[{room_label}] Submitting votes...")
        for i, p_client in enumerate(player_clients):
            if p_client.connected:
                # Pick the next connected player's bluff so we vote for each other
                target_idx = (i + 1) % len(player_clients)
                await p_client.call("player:submit_vote",
                                    {"code": code, "choice": f"{player_names[target_idx]} bluff {round_num}"})
                await asyncio.sleep(0.2)

        # Wait to observe the transition to results
        await asyncio.sleep(2)

    # 5. Game finishes
    print(f"\n[{room_label}] =================== ENDING GAME ===================")
    await host_client.call("host:next_round", {"code": code})
    await asyncio.sleep(1)
    print(f"=== [{room_label}] Completed Lifecycle ===\n")


async def main():
    print("--- Starting local server ---")
    # Get the parent directory of this script (where main.py is)
    server_cwd = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    server_process = subprocess.Popen([sys.executable, "-m", "uvicorn", "main:socket_app", "--port", "8000"],
                                      cwd=server_cwd)
    await asyncio.sleep(2)  # Give the server a moment to start

    # Room 1 Clients (3 players)
    host1 = create_client("Host-1")
    r1_p1 = create_client("Room1-Alice")
    r1_p2 = create_client("Room1-Bob")
    r1_p3 = create_client("Room1-Charlie")  # Third player

    # Room 2 Clients (2 players)
    host2 = create_client("Host-2")
    r2_p1 = create_client("Room2-Diana")
    r2_p2 = create_client("Room2-Eve")

    all_clients = [host1, r1_p1, r1_p2, r1_p3, host2, r2_p1, r2_p2]

    # Connect all sockets in parallel
    print("Connecting all socket clients...")
    await asyncio.gather(*(c.connect(SERVER_URL) for c in all_clients))
    print("All clients connected!\n")

    try:
        # Run both games concurrently.
        # In Room 1, we start with 3 players and disconnect Charlie (index 2) on round 3.
        await asyncio.gather(
            run_game("ROOM-ALPHA", host1, [r1_p1, r1_p2, r1_p3], ["Alice", "Bob", "Charlie"], disconnect_idx=2,
                     disconnect_round=3),
            run_game("ROOM-BETA", host2, [r2_p1, r2_p2], ["Diana", "Eve"])
        )
    finally:
        # Disconnect all active sockets cleanly
        print("Disconnecting remaining clients...")
        await asyncio.gather(*(c.disconnect() for c in all_clients if c.connected))
        print("Done!")

        # Forcefully shut down the background server to free the port
        server_process.kill()
        server_process.wait()


if __name__ == "__main__":
    asyncio.run(main())