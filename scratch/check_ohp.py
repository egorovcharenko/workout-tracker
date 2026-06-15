import os
import sqlite3

# Load env variables from .env.local
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

def query_sqlite():
    if not os.path.exists(DB_PATH):
        print("SQLite db not found.")
        return
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("""
            SELECT s.date, t.set_type, t.set_number, t.weight_lb, t.reps 
            FROM sets t
            JOIN sessions s ON t.session_id = s.id
            WHERE t.exercise = 'Standing Overhead Press'
            ORDER BY s.date DESC, t.set_number ASC
        """)
        rows = c.fetchall()
        print(f"SQLite logs for 'Standing Overhead Press' ({len(rows)} sets):")
        for r in rows:
            print(f"  Date: {r[0]} | Type: {r[1]} | Set: {r[2]} | Weight: {r[3]} lb | Reps: {r[4]}")
        conn.close()
    except Exception as e:
        print(f"Error querying SQLite: {e}")

def query_postgres():
    if not PG_URL:
        print("No Postgres URL found.")
        return
    try:
        import psycopg
        from psycopg.rows import dict_row
        with psycopg.connect(PG_URL, row_factory=dict_row) as conn:
            with conn.cursor() as c:
                c.execute("""
                    SELECT s.date, t.set_type, t.set_number, t.weight_lb, t.reps 
                    FROM sets t
                    JOIN sessions s ON t.session_id = s.id
                    WHERE t.exercise = 'Standing Overhead Press'
                    ORDER BY s.date DESC, t.set_number ASC
                """)
                rows = c.fetchall()
                print(f"Postgres logs for 'Standing Overhead Press' ({len(rows)} sets):")
                for r in rows:
                    print(f"  Date: {r['date']} | Type: {r['set_type']} | Set: {r['set_number']} | Weight: {r['weight_lb']} lb | Reps: {r['reps']}")
    except Exception as e:
        print(f"Error querying Postgres: {e}")

query_sqlite()
print()
query_postgres()
