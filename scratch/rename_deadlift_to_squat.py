import os
import sqlite3

ENV_FILE = os.path.join("/Users/egorovcharenko/sports", ".env.local")
if os.path.exists(ENV_FILE):
    with open(ENV_FILE) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k, v.strip().strip('"').strip("'"))

PG_URL = os.environ.get("POSTGRES_URL_NON_POOLING") or os.environ.get("POSTGRES_URL")
DB_PATH = "/Users/egorovcharenko/sports/workouts.db"

def update_sqlite():
    if not os.path.exists(DB_PATH):
        return
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # Find recent session on today's date if it exists in SQLite
    c.execute("SELECT id FROM sessions WHERE date = '2026-06-11'")
    sess = c.fetchone()
    if sess:
        c.execute("UPDATE sets SET exercise = 'Barbell Back Squat' WHERE session_id = ? AND exercise = 'Barbell Deadlift'", (sess[0],))
        rows = c.rowcount
        conn.commit()
        print(f"SQLite: Updated {rows} sets from 'Barbell Deadlift' to 'Barbell Back Squat' in session {sess[0]}.")
    conn.close()

def update_postgres():
    if not PG_URL:
        return
    import psycopg
    with psycopg.connect(PG_URL) as conn:
        with conn.cursor() as c:
            # We know today's session is ID 33
            c.execute(
                "UPDATE sets SET exercise = 'Barbell Back Squat' WHERE session_id = 33 AND exercise = 'Barbell Deadlift'"
            )
            rows = c.rowcount
            conn.commit()
            print(f"Postgres: Updated {rows} sets from 'Barbell Deadlift' to 'Barbell Back Squat' in session 33.")

update_sqlite()
print()
update_postgres()
