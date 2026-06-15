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

def check_sqlite():
    if not os.path.exists(DB_PATH):
        return
    print("=== SQLite Recent Session ===")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, date, workout_name FROM sessions ORDER BY id DESC LIMIT 1")
    sess = c.fetchone()
    if sess:
        print("Recent Session:", sess)
        c.execute("SELECT id, set_number, exercise, weight_lb, reps, completed, set_type FROM sets WHERE session_id = ? ORDER BY set_number ASC", (sess[0],))
        for row in c.fetchall():
            print(row)
    conn.close()

def check_postgres():
    if not PG_URL:
        return
    print("\n=== Postgres Recent Session ===")
    import psycopg
    with psycopg.connect(PG_URL) as conn:
        with conn.cursor() as c:
            c.execute("SELECT id, date, workout_name FROM sessions ORDER BY id DESC LIMIT 1")
            sess = c.fetchone()
            if sess:
                print("Recent Session:", sess)
                c.execute("SELECT id, set_number, exercise, weight_lb, reps, completed, set_type FROM sets WHERE session_id = %s ORDER BY set_number ASC", (sess[0],))
                for row in c.fetchall():
                    print(row)

check_sqlite()
print()
check_postgres()
