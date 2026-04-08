#!/usr/bin/env python3
"""Save a workout session to the SQLite database and print a confirmation."""

import sqlite3
import sys
import json
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "workouts.db")

def save_session(data):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute(
        "INSERT INTO sessions (workout_name, date, duration_sec, notes) VALUES (?, ?, ?, ?)",
        (data["workout"], data["date"], data.get("duration_sec"), data.get("notes", "")),
    )
    session_id = c.lastrowid

    for ex in data["exercises"]:
        # Warmup set
        if ex.get("warmup_done"):
            c.execute(
                "INSERT INTO sets (session_id, exercise, set_type, set_number, reps, weight_lb, weight_kg, completed) VALUES (?, ?, 'warmup', 0, ?, ?, ?, 1)",
                (session_id, ex["name"], ex.get("reps"), ex.get("weight_lb"), ex.get("weight_kg")),
            )
        # Working sets
        for s in range(1, ex.get("sets_completed", 0) + 1):
            c.execute(
                "INSERT INTO sets (session_id, exercise, set_type, set_number, reps, weight_lb, weight_kg, completed) VALUES (?, ?, 'working', ?, ?, ?, ?, 1)",
                (session_id, ex["name"], s, ex.get("reps"), ex.get("weight_lb"), ex.get("weight_kg")),
            )

    conn.commit()
    conn.close()
    return session_id


def show_history(limit=10):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, workout_name, date, duration_sec FROM sessions ORDER BY date DESC LIMIT ?", (limit,))
    sessions = c.fetchall()

    if not sessions:
        print("No sessions logged yet.")
        return

    for sid, name, date, dur in sessions:
        dur_str = f"{dur // 60}:{dur % 60:02d}" if dur else "?"
        print(f"\n--- {date} | {name} | {dur_str} ---")
        c.execute("SELECT exercise, set_type, set_number, reps, weight_lb, weight_kg FROM sets WHERE session_id = ? ORDER BY id", (sid,))
        for ex, stype, snum, reps, wlb, wkg in c.fetchall():
            label = "W" if stype == "warmup" else f"#{snum}"
            w = f"@ {wlb}lb / {wkg}kg" if wlb else ""
            print(f"  {ex} [{label}] {reps} reps {w}")

    conn.close()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "history":
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        show_history(limit)
    elif len(sys.argv) > 1:
        data = json.loads(sys.argv[1])
        sid = save_session(data)
        print(f"Session #{sid} saved successfully!")
    else:
        # Read from stdin
        data = json.load(sys.stdin)
        sid = save_session(data)
        print(f"Session #{sid} saved successfully!")
