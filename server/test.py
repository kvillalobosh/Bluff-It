import asyncio
import socketio

SERVER_URL = "http://127.0.0.1:8000"

# Setup three independent socket clients
host = socketio.AsyncClient()
p1 = socketio.AsyncClient()
p2 = socketio.AsyncClient()

# Listeners to log broadcasts
@host.on("state:update")
def on_host_update(data):
    print(f"\n[HOST SCREEN UPDATE] Phase: {data.get('phase')} | Q: {data.get('question')}")
    print(f"  Players: {[p['name'] for p in data.get('players', {}).values()]}")
    if data.get("choices"):
        print(f"  Voting Choices: {data.get('choices')}")

@p1.on("state:update")
def on_p1_update(data):
    print(f"[P1 PHONE] Received phase: {data.get('phase')}")

# quick test, mock game with players joining
async def run_test():
    # 1. Connect all sockets
    await host.connect(SERVER_URL)
    await p1.connect(SERVER_URL)
    await p2.connect(SERVER_URL)
    print("--- All clients connected ---")

    # 2. Host creates room
    res = await host.call("host:create")
    code = res["room_code"]
    print(f"Host created room: {code}")

    # 3. Players join
    await p1.call("player:join_room", {"code": code, "name": "Alice"})
    await p2.call("player:join_room", {"code": code, "name": "Bob"})

    # Test duplicate name rejection
    dup_res = await p2.call("player:join_room", {"code": code, "name": "Alice"})
    print(f"Duplicate rejection test (should be False): {dup_res.get('success')}")

    # 4. Host starts game and moves to staging
    await host.call("host:start_game", {"code": code})
    await asyncio.sleep(0.5)
    await host.call("host:begin_question_staging", {"code": code})
    await asyncio.sleep(0.5)

    # 5. Players submit fake answers (tests auto-advance to voting)
    print("\n--- Submitting Player Answers ---")
    await p1.call("player:answer_created", {"code": code, "answer": "Fake answer from Alice"})
    await asyncio.sleep(0.5)
    await p2.call("player:answer_created", {"code": code, "answer": "Fake answer from Bob"})

    # Wait 1 second to observe the transition_to_vote trigger
    await asyncio.sleep(1)

    # Clean disconnect
    await host.disconnect()
    await p1.disconnect()
    await p2.disconnect()
    print("\n--- Test Completed Successfully ---")

if __name__ == "__main__":
    asyncio.run(run_test())