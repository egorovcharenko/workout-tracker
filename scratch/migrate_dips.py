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

def migrate_sqlite():
    if not os.path.exists(DB_PATH):
        print("SQLite db not found.")
        return
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("UPDATE sets SET exercise = 'Dips' WHERE exercise = 'Bench Dips'")
        rows = c.rowcount
        conn.commit()
        print(f"SQLite: Updated {rows} sets from 'Bench Dips' to 'Dips'.")
        conn.close()
    except Exception as e:
        print(f"Error migrating SQLite: {e}")

def migrate_postgres():
    if not PG_URL:
        print("No Postgres URL found.")
        return
    try:
        import psycopg
        with psycopg.connect(PG_URL) as conn:
            with conn.cursor() as c:
                c.execute("UPDATE sets SET exercise = 'Dips' WHERE exercise = 'Bench Dips'")
                rows = c.rowcount
                conn.commit()
                print(f"Postgres: Updated {rows} sets from 'Bench Dips' to 'Dips'.")
    except Exception as e:
        print(f"Error migrating Postgres: {e}")

migrate_sqlite()
print()
migrate_postgres()
