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

def check_history():
    if not PG_URL:
        return
    import psycopg
    with psycopg.connect(PG_URL) as conn:
        with conn.cursor() as c:
            c.execute("SELECT s.id, sess.date, s.exercise, s.set_number, s.reps, s.weight_lb, s.bands_json FROM sets s JOIN sessions sess ON s.session_id = sess.id WHERE s.exercise IN ('Bench Dips', 'Dips') ORDER BY sess.date DESC, s.set_number ASC")
            for row in c.fetchall():
                print(row)

check_history()
