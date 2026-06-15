import os

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

def scan_postgres():
    if not PG_URL:
        return
    import psycopg
    with psycopg.connect(PG_URL) as conn:
        with conn.cursor() as c:
            print("=== Postgres Sessions in last 3 days ===")
            c.execute("SELECT id, date, workout_name FROM sessions WHERE date >= '2026-06-08' ORDER BY date DESC, id DESC")
            sessions = c.fetchall()
            for s in sessions:
                print("Session ID:", s[0], "Date:", s[1], "Workout:", s[2])
                c.execute("SELECT id, exercise, set_number, reps, weight_lb, completed, set_type FROM sets WHERE session_id = %s ORDER BY id", (s[0],))
                for row in c.fetchall():
                    print("  ", row)

scan_postgres()
