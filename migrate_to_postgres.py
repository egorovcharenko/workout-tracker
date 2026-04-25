#!/usr/bin/env python3
"""
One-shot migration: local workouts.db (SQLite) -> Vercel Postgres.

Usage:
    # 1) Pull the Postgres env vars from your linked Vercel project:
    vercel env pull .env.local

    # 2) Run the migration (wipes target tables, then copies everything):
    python3 migrate_to_postgres.py

Reads POSTGRES_URL_NON_POOLING (or POSTGRES_URL) from env or .env.local.
Safe to re-run: it truncates the target tables first.
"""
import os
import sqlite3
import sys

# --- load .env.local if present ---
ENV_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env.local")
if os.path.exists(ENV_FILE):
    with open(ENV_FILE) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k, v.strip().strip('"').strip("'"))

PG_URL = os.environ.get("POSTGRES_URL_NON_POOLING") or os.environ.get("POSTGRES_URL")
if not PG_URL:
    print("ERROR: POSTGRES_URL_NON_POOLING / POSTGRES_URL not set.")
    print("Run:  vercel env pull .env.local   (from a linked project)")
    sys.exit(1)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "workouts.db")
if not os.path.exists(DB_PATH):
    print(f"ERROR: {DB_PATH} not found.")
    sys.exit(1)

import psycopg  # noqa: E402

# --- read everything from sqlite ---
src = sqlite3.connect(DB_PATH)
src.row_factory = sqlite3.Row
sessions = [dict(r) for r in src.execute("SELECT * FROM sessions ORDER BY id")]
sets_rows = [dict(r) for r in src.execute("SELECT * FROM sets ORDER BY id")]
src.close()
print(f"SQLite:  {len(sessions)} sessions, {len(sets_rows)} sets")

# --- write to postgres ---
with psycopg.connect(PG_URL, autocommit=False) as pg:
    with pg.cursor() as c:
        # ensure schema exists (matches workout_server.py)
        c.execute('''CREATE TABLE IF NOT EXISTS sessions (
            id SERIAL PRIMARY KEY,
            workout_name TEXT NOT NULL,
            date TEXT NOT NULL,
            duration_sec INTEGER,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )''')
        c.execute('''CREATE TABLE IF NOT EXISTS sets (
            id SERIAL PRIMARY KEY,
            session_id INTEGER NOT NULL REFERENCES sessions(id),
            exercise TEXT NOT NULL,
            set_type TEXT NOT NULL DEFAULT 'working',
            set_number INTEGER,
            reps TEXT,
            weight_lb REAL,
            bands_json TEXT,
            completed INTEGER DEFAULT 1
        )''')
        c.execute("ALTER TABLE sets ADD COLUMN IF NOT EXISTS bands_json TEXT")

        # wipe
        c.execute("TRUNCATE sets, sessions RESTART IDENTITY CASCADE")

        # insert sessions preserving original ids
        for s in sessions:
            c.execute(
                "INSERT INTO sessions (id, workout_name, date, duration_sec, notes, created_at) "
                "VALUES (%s, %s, %s, %s, %s, COALESCE(%s, NOW()))",
                (s["id"], s["workout_name"], s["date"], s.get("duration_sec"),
                 s.get("notes"), s.get("created_at")),
            )

        # insert sets preserving original ids
        for st in sets_rows:
            c.execute(
                "INSERT INTO sets (id, session_id, exercise, set_type, set_number, reps, weight_lb, bands_json, completed) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (st["id"], st["session_id"], st["exercise"],
                 st.get("set_type") or "working", st.get("set_number"),
                 st.get("reps"), st.get("weight_lb"),
                 st.get("bands_json"), st.get("completed", 1)),
            )

        # bump SERIAL sequences past the max id so future inserts don't collide
        c.execute("SELECT setval('sessions_id_seq', COALESCE((SELECT MAX(id) FROM sessions), 1))")
        c.execute("SELECT setval('sets_id_seq',     COALESCE((SELECT MAX(id) FROM sets),     1))")

        # sanity check
        c.execute("SELECT COUNT(*) FROM sessions")
        n_sess = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM sets")
        n_sets = c.fetchone()[0]
        print(f"Postgres: {n_sess} sessions, {n_sets} sets  ✅")

    pg.commit()

print("Migration complete.")
