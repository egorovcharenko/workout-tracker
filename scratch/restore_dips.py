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

def restore():
    if not PG_URL:
        print("No Postgres URL.")
        return
    import psycopg
    with psycopg.connect(PG_URL) as conn:
        with conn.cursor() as c:
            # Check if they are already there
            c.execute("SELECT id FROM sets WHERE session_id = 33 AND exercise = 'Dips'")
            exists = c.fetchall()
            if exists:
                print("Dips sets already exist in session 33:", exists)
                return
            
            # Insert the 3 sets
            sets_to_insert = [
                (33, 'Dips', 'working', 1, '6', 170.0, 1),
                (33, 'Dips', 'working', 3, '5', 170.0, 1),
                (33, 'Dips', 'working', 5, '4', 170.0, 1)
            ]
            for s in sets_to_insert:
                c.execute(
                    "INSERT INTO sets (session_id, exercise, set_type, set_number, reps, weight_lb, completed) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                    s
                )
            conn.commit()
            print("Successfully restored 3 Dips sets in Postgres.")

restore()
