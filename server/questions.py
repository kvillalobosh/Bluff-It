import json
import random
from pathlib import Path

# Load questions once when the server starts
QUESTIONS_PATH = Path(__file__).parent / "questions.json"

def load_all_questions() -> list[dict]:
    with open(QUESTIONS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

ALL_QUESTIONS = load_all_questions()

def get_random_question(excluded_ids: set[int] = None) -> dict:
    """Picks a random question that hasn't been played in this room yet."""
    if excluded_ids is None:
        excluded_ids = set()

    available = [q for q in ALL_QUESTIONS if q["id"] not in excluded_ids]
    if not available:
        # If all questions have been used, fall back to the full pool
        available = ALL_QUESTIONS

    return random.choice(available)