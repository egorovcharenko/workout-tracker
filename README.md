# Dumbbell Workout Tracker

A simple local workout tracker for dumbbell training. Vanilla HTML/JS frontend with a Python server and SQLite persistence.

## Features

- **3 workout templates**: Arms & Shoulders, Back, Full Body
- **Per-set weight and reps logging** — tap reps to complete a set
- **Auto-save** to SQLite on every interaction
- **Session resume** — reload the page and pick up where you left off
- **Weight/reps hints** from your last session (cross-workout)
- **Muscle recovery map** — see which muscles are ready vs recovering
- **Rest timer** — full-screen countdown between sets
- **YouTube Shorts** links for exercise form demos
- **REP Fitness 5-50lb** adjustable dumbbell weight presets

## Setup

```bash
cd Sports
python3 workout_server.py
```

Open http://localhost:8000

## Files

- `workout.html` — the entire frontend (single file, no build step)
- `workout_server.py` — Python HTTP server with SQLite backend
- `workouts.db` — auto-created SQLite database (gitignored)
