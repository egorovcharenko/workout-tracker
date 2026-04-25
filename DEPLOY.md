# Vercel Deployment

Runs as: static `workout.html` + single Python serverless function at `api/index.py`, backed by **Vercel Postgres** (Neon). Env vars auto-inject — no external signup.

## Deploy

```bash
npm i -g vercel
vercel                   # first time: link project
```

Then in the Vercel dashboard:

1. **Storage** → **Create Database** → **Postgres** → pick a name → **Connect to Project**.
   Vercel auto-injects `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, etc. into your project's env — no copy/paste needed.
2. Redeploy to pick up the new env vars:
   ```bash
   vercel --prod
   ```

Done. The function reads `POSTGRES_URL_NON_POOLING`, creates the schema on first request, and serves the app.

## Migrate existing local data (optional)

Your local SQLite schema (`sessions`, `sets`) maps 1:1 to Postgres. Dump CSVs from sqlite and `COPY` into Postgres:

```bash
# Export
sqlite3 workouts.db -header -csv "SELECT * FROM sessions;" > sessions.csv
sqlite3 workouts.db -header -csv "SELECT * FROM sets;" > sets.csv

# Import (replace <CONN> with POSTGRES_URL_NON_POOLING)
psql "<CONN>" -c "\copy sessions(id,workout_name,date,duration_sec,notes,created_at) FROM 'sessions.csv' CSV HEADER"
psql "<CONN>" -c "\copy sets(id,session_id,exercise,set_type,set_number,reps,weight_lb,bands_json,completed) FROM 'sets.csv' CSV HEADER"

# Reset the SERIAL sequences so new inserts don't collide
psql "<CONN>" -c "SELECT setval('sessions_id_seq', (SELECT MAX(id) FROM sessions)); SELECT setval('sets_id_seq', (SELECT MAX(id) FROM sets));"
```

## Local dev (unchanged)

```bash
python3 workout_server.py    # -> http://localhost:8000, uses ./workouts.db
```

To test against Postgres locally:

```bash
vercel env pull .env.local   # pull Postgres vars
export $(grep -v '^#' .env.local | xargs)
python3 workout_server.py    # now uses Postgres
```

## How it works

- `vercel.json` — rewrites `/` → `/workout.html` and `/api/*` → `/api/index`.
- `api/index.py` — subclasses the `Handler` from `workout_server.py`, so the same route/DB logic runs locally and on Vercel.
- `workout_server.py` `get_db()` — if `POSTGRES_URL[_NON_POOLING]` is set, connects via psycopg with a tiny wrapper that makes a psycopg connection look like a `sqlite3.Connection` (translates `?` → `%s`, auto-adds `RETURNING id` so `cursor.lastrowid` works). Otherwise falls back to local SQLite.
- `requirements.txt` — `psycopg[binary]` only.
