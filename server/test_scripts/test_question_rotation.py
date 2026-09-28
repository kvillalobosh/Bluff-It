import asyncio
import unittest
from unittest.mock import patch
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import main


class TestQuestionRotationTest(unittest.IsolatedAsyncioTestCase):
    async def test_future_rounds_do_not_repeat_questions(self):
        code = "TEST"
        main.rooms.clear()
        main.rooms[code] = {
            "host_sid": "host",
            "host_token": "token",
            "phase": "leaderboard_view",
            "round": 1,
            "max_rounds": 5,
            "players": {
                "p1": {"name": "Alice", "connected": True, "score": 0},
            },
            "current_question": None,
            "round_answers": {},
            "round_votes": {},
            "shuffled_choices": [],
            "answer_choice_ids": {},
            "raw_choices": [],
            "used_question_ids": set(),
            "timer_task": None,
        }

        with patch("questions.random.choice", side_effect=lambda seq: seq[0]):
            await main.handle_start_question_staging("host", {"code": code})
            first_id = main.rooms[code]["current_question"]["id"]

            await main.handle_start_question_staging("host", {"code": code})
            second_id = main.rooms[code]["current_question"]["id"]

        self.assertNotEqual(first_id, second_id)


if __name__ == "__main__":
    unittest.main()
