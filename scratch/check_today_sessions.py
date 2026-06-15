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

def check_today():
    if not PG_URL:
        return
    import psycopg
    with psycopg.connect(PG_URL) as conn:
        with conn.cursor() as c:
            c.execute("SELECT id, date, workout_name FROM sessions WHERE date = '2026-06-11'")
            for s in c.fetchall():
                print("Session:", s)
                c.execute("SELECT exercise, COUNT(*) FROM sets WHERE session_id = %s GROUP BY exercise", (s[0],))
                for row in c.fetchall():
                    print("  ", row)

check_today()
