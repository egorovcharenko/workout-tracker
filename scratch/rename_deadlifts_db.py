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

def handle_notes_sqlite(conn):
    c = conn.cursor()
    # Check if we have notes for both
    c.execute("SELECT body FROM exercise_notes WHERE exercise = 'Barbell Deadlift'")
    dl_note = c.fetchone()
    c.execute("SELECT body FROM exercise_notes WHERE exercise = 'Barbell RDL'")
    rdl_note = c.fetchone()

    if dl_note and rdl_note:
        # Merge them
        merged = rdl_note[0] + "\n\n" + dl_note[0]
        c.execute("UPDATE exercise_notes SET body = ? WHERE exercise = 'Barbell RDL'", (merged,))
        c.execute("DELETE FROM exercise_notes WHERE exercise = 'Barbell Deadlift'")
        print("SQLite: Merged exercise notes for 'Barbell Deadlift' and 'Barbell RDL'.")
    elif dl_note:
        # Just rename
        c.execute("UPDATE exercise_notes SET exercise = 'Barbell RDL' WHERE exercise = 'Barbell Deadlift'")
        print("SQLite: Renamed exercise note from 'Barbell Deadlift' to 'Barbell RDL'.")

def handle_notes_postgres(conn):
    c = conn.cursor()
    c.execute("SELECT body FROM exercise_notes WHERE exercise = 'Barbell Deadlift'")
    dl_note = c.fetchone()
    c.execute("SELECT body FROM exercise_notes WHERE exercise = 'Barbell RDL'")
    rdl_note = c.fetchone()

    if dl_note and rdl_note:
        merged = rdl_note[0] + "\n\n" + dl_note[0]
        c.execute("UPDATE exercise_notes SET body = %s WHERE exercise = 'Barbell RDL'", (merged,))
        c.execute("DELETE FROM exercise_notes WHERE exercise = 'Barbell Deadlift'")
        print("Postgres: Merged exercise notes for 'Barbell Deadlift' and 'Barbell RDL'.")
    elif dl_note:
        c.execute("UPDATE exercise_notes SET exercise = 'Barbell RDL' WHERE exercise = 'Barbell Deadlift'")
        print("Postgres: Renamed exercise note from 'Barbell Deadlift' to 'Barbell RDL'.")

def run_sqlite():
    if not os.path.exists(DB_PATH):
        print("SQLite: No database found at", DB_PATH)
        return
    conn = sqlite3.connect(DB_PATH)
    try:
        handle_notes_sqlite(conn)
        
        c = conn.cursor()
        c.execute("UPDATE sets SET exercise = 'Barbell RDL' WHERE exercise = 'Barbell Deadlift'")
        sets_count = c.rowcount
        
        c.execute("UPDATE motivations SET exercise = 'Barbell RDL' WHERE exercise = 'Barbell Deadlift'")
        motivations_count = c.rowcount
        
        conn.commit()
        print(f"SQLite: Updated {sets_count} sets and {motivations_count} motivations to 'Barbell RDL'.")
    except Exception as e:
        print("SQLite Error:", e)
    finally:
        conn.close()

def run_postgres():
    if not PG_URL:
        print("Postgres: No POSTGRES_URL environment variable found.")
        return
    import psycopg
    try:
        with psycopg.connect(PG_URL) as conn:
            handle_notes_postgres(conn)
            with conn.cursor() as c:
                c.execute("UPDATE sets SET exercise = 'Barbell RDL' WHERE exercise = 'Barbell Deadlift'")
                sets_count = c.rowcount
                
                c.execute("UPDATE motivations SET exercise = 'Barbell RDL' WHERE exercise = 'Barbell Deadlift'")
                motivations_count = c.rowcount
                
                conn.commit()
                print(f"Postgres: Updated {sets_count} sets and {motivations_count} motivations to 'Barbell RDL'.")
    except Exception as e:
        print("Postgres Error:", e)

if __name__ == "__main__":
    run_sqlite()
    print()
    run_postgres()
