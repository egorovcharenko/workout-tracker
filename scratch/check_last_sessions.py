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

def check_postgres_history():
    if not PG_URL:
        return
    import psycopg
    with psycopg.connect(PG_URL) as conn:
        with conn.cursor() as c:
            c.execute("SELECT id, date, workout_name FROM sessions ORDER BY date DESC, id DESC LIMIT 5")
            sessions = c.fetchall()
            for s in sessions:
                print("Session ID:", s[0], "Date:", s[1], "Workout:", s[2])
                c.execute("SELECT exercise, COUNT(*) FROM sets WHERE session_id = %s GROUP BY exercise", (s[0],))
                for row in c.fetchall():
                    print("  ", row)
                c.execute("SELECT set_number, exercise, reps, weight_lb FROM sets WHERE session_id = %s AND exercise IN ('Bench Dips', 'Dips') ORDER BY set_number", (s[0],))
                dips_sets = c.fetchall()
                if dips_sets:
                    print("  Dips sets details:")
                    for ds in dips_sets:
                        print("    ", ds)

check_postgres_history()
