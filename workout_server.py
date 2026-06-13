#!/usr/bin/env python3
"""
Workout Tracker Server
Run: python3 workout_server.py
Open: http://localhost:8000
"""

import http.server
import json
import sqlite3
import os
import urllib.parse
import datetime

# --- load .env.local if present for local development ---
ENV_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env.local")
if os.path.exists(ENV_FILE):
    with open(ENV_FILE) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k, v.strip().strip('"').strip("'"))

PORT = int(os.environ.get("PORT", "8000"))
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "workouts.db")

# Vercel Postgres injects POSTGRES_URL (pooled) + POSTGRES_URL_NON_POOLING.
# Prefer non-pooling for psycopg3 in a serverless handler.
PG_URL = os.environ.get("POSTGRES_URL_NON_POOLING") or os.environ.get("POSTGRES_URL")


class _PGCursor:
    """Sqlite3.Cursor-like wrapper around a psycopg cursor."""
    def __init__(self, cur):
        self._cur = cur
        self.lastrowid = None

    def execute(self, sql, params=()):
        sql = sql.replace("?", "%s")
        stripped = sql.lstrip().upper()
        add_returning = stripped.startswith("INSERT") and " RETURNING " not in stripped.upper()
        if add_returning:
            sql = sql.rstrip().rstrip(";") + " RETURNING id"
        self._cur.execute(sql, tuple(params) if params else None)
        if add_returning:
            row = self._cur.fetchone()
            self.lastrowid = row["id"] if row else None
        return self

    def fetchone(self): return self._cur.fetchone()
    def fetchall(self): return self._cur.fetchall()
    def __iter__(self): return iter(self._cur)


class _PGConn:
    """Sqlite3.Connection-like wrapper so the rest of the code is unchanged."""
    def __init__(self, conn):
        self._conn = conn

    def execute(self, sql, params=()):
        cur = _PGCursor(self._conn.cursor())
        return cur.execute(sql, params)

    def cursor(self): return _PGCursor(self._conn.cursor())
    def commit(self): self._conn.commit()
    def close(self): self._conn.close()


DB_INITIALIZED = False


def get_db():
    global DB_INITIALIZED
    if PG_URL:
        import psycopg
        from psycopg.rows import dict_row
        raw = psycopg.connect(PG_URL, row_factory=dict_row, autocommit=False)
        conn = _PGConn(raw)
        if not DB_INITIALIZED:
            # Check if sessions table already exists in postgres to avoid concurrent DDL deadlocks on cold starts
            cur = conn.execute("SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sessions')")
            exists = cur.fetchone()["exists"]
            if not exists:
                # Postgres-flavored schema
                conn.execute('''CREATE TABLE IF NOT EXISTS sessions (
                    id SERIAL PRIMARY KEY,
                    workout_name TEXT NOT NULL,
                    date TEXT NOT NULL,
                    duration_sec INTEGER,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                )''')
                conn.execute('''CREATE TABLE IF NOT EXISTS sets (
                    id SERIAL PRIMARY KEY,
                    session_id INTEGER NOT NULL REFERENCES sessions(id),
                    exercise TEXT NOT NULL,
                    set_type TEXT NOT NULL DEFAULT 'working',
                    set_number INTEGER,
                    reps TEXT,
                    weight_lb REAL,
                    bands_json TEXT,
                    completed INTEGER DEFAULT 1
                )''')
                conn.execute("ALTER TABLE sets ADD COLUMN IF NOT EXISTS bands_json TEXT")
                conn.execute("ALTER TABLE sets ADD COLUMN IF NOT EXISTS grip TEXT")
                conn.execute("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS started_at TIMESTAMP")
                conn.execute('''CREATE TABLE IF NOT EXISTS motivations (
                    id SERIAL PRIMARY KEY,
                    session_id INTEGER NOT NULL REFERENCES sessions(id),
                    exercise TEXT NOT NULL,
                    message TEXT NOT NULL,
                    model TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                )''')
                conn.execute("CREATE INDEX IF NOT EXISTS idx_motivations_session ON motivations(session_id)")
                # Body measurements (FitDays-style). All values in cm, nullable so a
                # partial entry (just chest/waist, say) is fine. `taken_at` is an ISO
                # string with date+time; `date` denormalized for index/filtering.
                conn.execute('''CREATE TABLE IF NOT EXISTS measurements (
                    id SERIAL PRIMARY KEY,
                    taken_at TIMESTAMP NOT NULL,
                    date TEXT NOT NULL,
                    head_cm REAL, neck_cm REAL, shoulder_cm REAL, chest_cm REAL,
                    waist_cm REAL, hip_cm REAL,
                    l_arm_cm REAL, r_arm_cm REAL,
                    l_thigh_cm REAL, r_thigh_cm REAL,
                    l_calf_cm REAL, r_calf_cm REAL,
                    weight_kg REAL,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                )''')
                conn.execute("CREATE INDEX IF NOT EXISTS idx_measurements_date ON measurements(date)")
                # Per-exercise notes (markdown body). One row per exercise name; upsert
                # on save. Keeps user-authored coaching cues with the exercise without
                # bloating the workout-template definitions.
                conn.execute('''CREATE TABLE IF NOT EXISTS exercise_notes (
                    exercise TEXT PRIMARY KEY,
                    body TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT NOW()
                )''')
                conn.commit()
            else:
                conn.commit()
            DB_INITIALIZED = True
        return conn

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    if not DB_INITIALIZED:
        conn.execute('''CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workout_name TEXT NOT NULL,
            date TEXT NOT NULL,
            duration_sec INTEGER,
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )''')
        conn.execute('''CREATE TABLE IF NOT EXISTS sets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            exercise TEXT NOT NULL,
            set_type TEXT NOT NULL DEFAULT 'working',
            set_number INTEGER,
            reps TEXT,
            weight_lb REAL,
            bands_json TEXT,
            completed INTEGER DEFAULT 1,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        )''')
        try:
            conn.execute("ALTER TABLE sets ADD COLUMN bands_json TEXT")
            conn.commit()
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE sets ADD COLUMN grip TEXT")
            conn.commit()
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE sessions ADD COLUMN started_at TEXT")
            conn.commit()
        except sqlite3.OperationalError:
            pass
        conn.execute('''CREATE TABLE IF NOT EXISTS motivations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            exercise TEXT NOT NULL,
            message TEXT NOT NULL,
            model TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        )''')
        conn.execute("CREATE INDEX IF NOT EXISTS idx_motivations_session ON motivations(session_id)")
        conn.execute('''CREATE TABLE IF NOT EXISTS measurements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            taken_at TEXT NOT NULL,
            date TEXT NOT NULL,
            head_cm REAL, neck_cm REAL, shoulder_cm REAL, chest_cm REAL,
            waist_cm REAL, hip_cm REAL,
            l_arm_cm REAL, r_arm_cm REAL,
            l_thigh_cm REAL, r_thigh_cm REAL,
            l_calf_cm REAL, r_calf_cm REAL,
            weight_kg REAL,
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )''')
        conn.execute("CREATE INDEX IF NOT EXISTS idx_measurements_date ON measurements(date)")
        conn.execute('''CREATE TABLE IF NOT EXISTS exercise_notes (
            exercise TEXT PRIMARY KEY,
            body TEXT NOT NULL,
            updated_at TEXT DEFAULT (datetime('now'))
        )''')
        conn.commit()
        DB_INITIALIZED = True
    return conn


def list_exercise_notes():
    """Return all exercise notes as {exercise: body}."""
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT exercise, body FROM exercise_notes")
    out = {row["exercise"]: row["body"] for row in c.fetchall()}
    conn.close()
    return out


def upsert_exercise_note(exercise, body):
    """Insert or update the note for an exercise. body=None or empty deletes."""
    conn = get_db()
    c = conn.cursor()
    try:
        if not body or not body.strip():
            c.execute("DELETE FROM exercise_notes WHERE exercise = ?", (exercise,))
            conn.commit()
            return
        # Note: explicit RETURNING short-circuits the _PGCursor auto-append of
        # `RETURNING id` (which would fail — this table has no id column).
        if PG_URL:
            c.execute(
                "INSERT INTO exercise_notes (exercise, body, updated_at) VALUES (?, ?, NOW()) "
                "ON CONFLICT (exercise) DO UPDATE SET body = EXCLUDED.body, updated_at = NOW() "
                "RETURNING exercise",
                (exercise, body),
            )
        else:
            c.execute(
                "INSERT INTO exercise_notes (exercise, body, updated_at) VALUES (?, ?, datetime('now')) "
                "ON CONFLICT(exercise) DO UPDATE SET body = excluded.body, updated_at = datetime('now')",
                (exercise, body),
            )
        conn.commit()
    finally:
        conn.close()


# Single canonical list of measurement column names so save/list/CSV-import
# code never drifts from the schema.
MEASUREMENT_FIELDS = [
    "head_cm", "neck_cm", "shoulder_cm", "chest_cm", "waist_cm", "hip_cm",
    "l_arm_cm", "r_arm_cm", "l_thigh_cm", "r_thigh_cm", "l_calf_cm", "r_calf_cm",
    "weight_kg",
]


def save_measurement(data):
    """Insert a body measurement row. data has taken_at (ISO) + any subset of
    MEASUREMENT_FIELDS + optional notes. Missing fields stored as NULL."""
    conn = get_db()
    c = conn.cursor()
    taken_at = data.get("taken_at") or datetime.datetime.utcnow().isoformat() + "Z"
    # Derive date from taken_at first 10 chars (YYYY-MM-DD).
    date = data.get("date") or taken_at[:10]
    cols = ["taken_at", "date"] + MEASUREMENT_FIELDS + ["notes"]
    placeholders = ", ".join(["?"] * len(cols))
    vals = [taken_at, date] + [data.get(f) for f in MEASUREMENT_FIELDS] + [data.get("notes")]
    c.execute(
        f"INSERT INTO measurements ({', '.join(cols)}) VALUES ({placeholders})",
        vals,
    )
    new_id = c.lastrowid if hasattr(c, 'lastrowid') else None
    conn.commit()
    conn.close()
    return new_id


def list_measurements(limit=500):
    """Return all measurements, newest-first. Normalizes datetime columns to
    ISO strings for the JSON response (same Z-suffix pattern as sessions)."""
    conn = get_db()
    c = conn.cursor()
    cols = ["id", "taken_at", "date"] + MEASUREMENT_FIELDS + ["notes"]
    c.execute(
        f"SELECT {', '.join(cols)} FROM measurements ORDER BY taken_at DESC LIMIT ?",
        (limit,),
    )
    rows = []
    for r in c.fetchall():
        d = dict(r)
        ta = d.get("taken_at")
        if ta is not None and not isinstance(ta, str):
            # Postgres datetime — normalize to ISO + Z
            s = ta.isoformat()
            d["taken_at"] = s if ta.tzinfo is not None else s + "Z"
        elif isinstance(ta, str):
            s = ta.replace(" ", "T")
            d["taken_at"] = s if (s.endswith("Z") or "+" in s[10:]) else s + "Z"
        rows.append(d)
    conn.close()
    return rows


def delete_measurement(meas_id):
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM measurements WHERE id = ?", (meas_id,))
    conn.commit()
    conn.close()


def _yesterday():
    return (datetime.date.today() - datetime.timedelta(days=1)).isoformat()


def save_session(data):
    conn = get_db()
    c = conn.cursor()
    session_id = data.get("session_id")

    if session_id:
        # Cross-day stale-tab guard: if a browser tab from a previous day still
        # has state.sessionId in memory, its autoSave will hit this UPDATE branch
        # and the DELETE FROM sets below would wipe the older session's data
        # and replace it with today's partial state. Verify the existing row's
        # date matches the payload's date before allowing the destructive
        # UPDATE; otherwise fall through to INSERT (treat as a fresh session).
        c.execute("SELECT date FROM sessions WHERE id = ?", (session_id,))
        row = c.fetchone()
        existing_date = row["date"] if row else None
        payload_date = data.get("date")
        if existing_date and payload_date and existing_date != payload_date:
            print(f"  [SAVE] REJECTED stale-tab UPDATE: session {session_id} dated {existing_date} but payload dated {payload_date}. Treating as new session.")
            session_id = None
        elif not row:
            # The id we were given doesn't exist anymore (e.g. user deleted it).
            # Don't error — fall through to INSERT.
            print(f"  [SAVE] session_id {session_id} not found, creating new session")
            session_id = None

    if session_id:
        # Update existing session (date validated above)
        c.execute(
            "UPDATE sessions SET duration_sec = ?, notes = ? WHERE id = ?",
            (data.get("duration_sec", 0), data.get("notes", ""), session_id),
        )
        # Replace all sets
        c.execute("DELETE FROM sets WHERE session_id = ?", (session_id,))
    else:
        # Create new session — anchor started_at as the wall-clock origin so
        # the frontend can derive elapsed = (now - started_at) regardless of
        # when individual sets were saved. Frontend may pass an ISO string
        # (its own Date.now() at workout start); fall back to server now.
        started_at = data.get("started_at") or datetime.datetime.utcnow().isoformat() + "Z"
        c.execute(
            "INSERT INTO sessions (workout_name, date, duration_sec, notes, started_at) VALUES (?, ?, ?, ?, ?)",
            (data["workout"], data["date"], data.get("duration_sec", 0), data.get("notes", ""), started_at),
        )
        session_id = c.lastrowid

    for s in data.get("sets", []):
        c.execute(
            "INSERT INTO sets (session_id, exercise, set_type, set_number, reps, weight_lb, bands_json, grip, completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (session_id, s["exercise"], s["set_type"], s.get("set_number", 0), s.get("reps", ""), s.get("weight_lb"), s.get("bands_json"), s.get("grip"), 1),
        )
    conn.commit()
    conn.close()
    return session_id


def update_set_value(session_id, exercise, set_type, set_number, weight_lb, bands_json):
    """Surgically update one set's weight_lb and bands_json. Used for repairing
    historical sets when a stale-tab autoSave corrupted them. Doesn't touch
    reps — those are usually fine; the corruption is only in the load values."""
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "UPDATE sets SET weight_lb = ?, bands_json = ? "
        "WHERE session_id = ? AND exercise = ? AND set_type = ? AND set_number = ?",
        (weight_lb, bands_json, session_id, exercise, set_type, set_number),
    )
    conn.commit()
    conn.close()


def delete_session(session_id):
    """Hard-delete a session row plus its sets and motivations.

    No FK cascade in our schema — the children must go first to avoid
    orphan rows / FK violations on the Postgres backend. Returns the
    number of session rows actually removed (0 if the id didn't exist).
    """
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM sets WHERE session_id = ?", (session_id,))
    c.execute("DELETE FROM motivations WHERE session_id = ?", (session_id,))
    c.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()
    # _PGCursor doesn't proxy rowcount; just return the id we tried to delete.
    return session_id


def get_history(limit=20):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM sessions ORDER BY date DESC, id DESC LIMIT ?", (limit,))
    sessions = [dict(r) for r in c.fetchall()]
    for sess in sessions:
        c.execute("SELECT * FROM sets WHERE session_id = ? ORDER BY id", (sess["id"],))
        sess["sets"] = [dict(r) for r in c.fetchall()]
        # AI finish-motivation is disabled — no longer surfaced to the client.
        sess["finish_motivation"] = None
    conn.close()
    return sessions


def get_last_session(workout_name):
    """Get the most recent session data for a workout (for hints), excluding the active today's session if it exists."""
    conn = get_db()
    c = conn.cursor()
    # 1. Find today's session ID (if any)
    c.execute(
        "SELECT id FROM sessions WHERE workout_name = ? AND date >= ? ORDER BY id DESC LIMIT 1",
        (workout_name, _yesterday()),
    )
    today_row = c.fetchone()
    today_session_id = today_row["id"] if today_row else None

    # 2. Fetch the last session, excluding today's session if it exists
    if today_session_id:
        c.execute(
            "SELECT id FROM sessions WHERE workout_name = ? AND id != ? ORDER BY date DESC, id DESC LIMIT 1",
            (workout_name, today_session_id),
        )
    else:
        c.execute(
            "SELECT id FROM sessions WHERE workout_name = ? ORDER BY date DESC, id DESC LIMIT 1",
            (workout_name,),
        )
    row = c.fetchone()
    if not row:
        conn.close()
        return {}
    c.execute("SELECT exercise, set_type, set_number, weight_lb, reps, bands_json, grip FROM sets WHERE session_id = ?", (row["id"],))
    data = {}
    for r in c.fetchall():
        key = f"{r['exercise']}|{r['set_type']}|{r['set_number']}"
        data[key] = {"weight_lb": r["weight_lb"], "reps": r["reps"], "bands_json": r["bands_json"], "grip": r["grip"]}
    conn.close()
    return data


def get_exercise_hints():
    """Get most recent weight/reps for every exercise across ALL workouts, excluding today's active sessions."""
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id FROM sessions WHERE date >= ?", (_yesterday(),))
    today_ids = [r["id"] for r in c.fetchall()]
    
    if today_ids:
        placeholders = ",".join("?" for _ in today_ids)
        c.execute(f'''
            SELECT s2.exercise, s2.set_type, s2.set_number, s2.weight_lb, s2.reps, s2.bands_json, s2.grip
            FROM sets s2
            INNER JOIN sessions sess ON sess.id = s2.session_id
            WHERE sess.id NOT IN ({placeholders}) AND s2.id IN (
                SELECT s1.id FROM sets s1
                INNER JOIN sessions ss ON ss.id = s1.session_id
                WHERE ss.id NOT IN ({placeholders}) AND s1.exercise = s2.exercise AND s1.set_type = s2.set_type AND s1.set_number = s2.set_number
                ORDER BY ss.date DESC, ss.id DESC
                LIMIT 1
            )
        ''', today_ids + today_ids)
    else:
        # For each exercise+set_type+set_number combo, get the most recent entry
        c.execute('''
            SELECT s2.exercise, s2.set_type, s2.set_number, s2.weight_lb, s2.reps, s2.bands_json, s2.grip
            FROM sets s2
            INNER JOIN sessions sess ON sess.id = s2.session_id
            WHERE s2.id IN (
                SELECT s1.id FROM sets s1
                INNER JOIN sessions ss ON ss.id = s1.session_id
                WHERE s1.exercise = s2.exercise AND s1.set_type = s2.set_type AND s1.set_number = s2.set_number
                ORDER BY ss.date DESC, ss.id DESC
                LIMIT 1
            )
        ''')
    data = {}
    for r in c.fetchall():
        key = f"{r['exercise']}|{r['set_type']}|{r['set_number']}"
        data[key] = {"weight_lb": r["weight_lb"], "reps": r["reps"], "bands_json": r["bands_json"], "grip": r["grip"]}
    conn.close()
    return data


def get_exercise_1rm_history():
    """Get per-exercise best estimated 1RM, best reps, max weight, and volume per session."""
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        SELECT sess.date, s.exercise, s.weight_lb, s.reps, s.bands_json
        FROM sets s
        INNER JOIN sessions sess ON sess.id = s.session_id
        WHERE s.set_type = 'working' AND s.reps IS NOT NULL AND s.reps <> ''
        ORDER BY sess.date ASC, sess.id ASC
    ''')
    from collections import defaultdict
    orm_raw = defaultdict(list)
    reps_raw = defaultdict(list)
    wt_raw = defaultdict(list)
    for r in c.fetchall():
        reps = int(r["reps"]) if str(r["reps"]).isdigit() else 0
        if reps <= 0:
            continue
        reps_raw[(r["exercise"], r["date"])].append(reps)
        if r["weight_lb"] and float(r["weight_lb"]) > 0:
            w = float(r["weight_lb"])
            is_assist = r["exercise"] in ("Assisted Pull-Ups", "Dips", "Dead Hang + Scap Pulls")
            is_band_addon = r["exercise"] in ("Goblet Squat", "Bulgarian Split Squat")
            
            band_sum = 0.0
            if r["bands_json"]:
                try:
                    import json
                    bands = json.loads(r["bands_json"])
                    if isinstance(bands, list):
                        band_sum = float(sum(bands))
                except:
                    pass
            
            if is_assist:
                orm = w * (reps / 30.0) - band_sum if reps > 1 else -band_sum
                wt_raw[(r["exercise"], r["date"])].append(-band_sum)
            else:
                wt_raw[(r["exercise"], r["date"])].append(w)
                orm = w * (1 + reps / 30.0) if reps > 1 else w
            orm_raw[(r["exercise"], r["date"])].append(round(orm, 1))
    result = defaultdict(list)
    vol_raw = defaultdict(float)
    # Best 1RM per exercise per date + accumulate volume
    for (ex, date), orms in orm_raw.items():
        result[ex].append({"date": date, "orm": max(orms)})
    # Volume = sum(weight * reps) per exercise per date
    for r in c.execute('''
        SELECT sess.date, s.exercise, s.weight_lb, s.reps
        FROM sets s INNER JOIN sessions sess ON sess.id = s.session_id
        WHERE s.set_type = 'working' AND s.reps IS NOT NULL AND s.reps <> ''
        ORDER BY sess.date ASC
    '''):
        reps = int(r["reps"]) if str(r["reps"]).isdigit() else 0
        w = float(r["weight_lb"]) if r["weight_lb"] else 0
        if reps > 0 and w > 0:
            vol_raw[(r["exercise"], r["date"])] += w * reps
    vol_result = defaultdict(list)
    for (ex, date), vol in vol_raw.items():
        vol_result[ex].append({"date": date, "vol": round(vol)})
    # Sort by date
    for ex in vol_result:
        vol_result[ex].sort(key=lambda x: x["date"])
    # Best reps per exercise per date (for bodyweight exercises)
    reps_result = defaultdict(list)
    for (ex, date), reps_list in reps_raw.items():
        reps_result[ex].append({"date": date, "reps": max(reps_list)})
    # Max weight per exercise per date
    wt_result = defaultdict(list)
    for (ex, date), wts in wt_raw.items():
        wt_result[ex].append({"date": date, "wt": max(wts)})
    for ex in wt_result:
        wt_result[ex].sort(key=lambda x: x["date"])
    conn.close()
    return {"orm": dict(result), "reps": dict(reps_result), "vol": dict(vol_result), "wt": dict(wt_result)}


def get_active_sessions(today=None):
    """Get all sessions from the last 24h (for home screen active indicator)."""
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "SELECT id, workout_name, date, duration_sec, started_at FROM sessions WHERE date >= ? ORDER BY id DESC",
        (_yesterday(),),
    )
    now = datetime.datetime.utcnow()
    sessions = []
    for row in c.fetchall():
        c2 = conn.cursor()
        c2.execute("SELECT COUNT(*) as cnt FROM sets WHERE session_id = ?", (row["id"],))
        cnt = c2.fetchone()["cnt"]
        if cnt > 0:
            # Prefer live wall-clock from started_at over the persisted
            # duration_sec snapshot. The snapshot is updated only on save and
            # was historically polluted with negative values from the timezone
            # parsing bug; recomputing here keeps the home tile honest.
            started_at_raw = row["started_at"]
            duration = row["duration_sec"] or 0
            if started_at_raw is not None:
                try:
                    if isinstance(started_at_raw, str):
                        s = started_at_raw.replace("Z", "").replace(" ", "T")
                        started = datetime.datetime.fromisoformat(s)
                    else:
                        started = started_at_raw
                        if started.tzinfo is not None:
                            started = started.replace(tzinfo=None)
                    duration = max(0, int((now - started).total_seconds()))
                except Exception:
                    pass
            sessions.append({
                "id": row["id"],
                "workout_name": row["workout_name"],
                # The session's local date — needed client-side to look up
                # per-(workout, date) localStorage state (e.g., skipped-
                # exercise markers from v2) so the home tile can subtract
                # skipped sets from the "expected" count and stop showing
                # a fully-skipped-and-done workout as still in-progress.
                "date": row["date"] if isinstance(row["date"], str) else str(row["date"]),
                "duration_sec": max(0, duration),
                "sets_done": cnt,
            })
    conn.close()
    return sessions


def get_today_session(workout_name, today=None):
    """Get the most recent session for a workout within the last 24h."""
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "SELECT id, duration_sec, started_at, date FROM sessions WHERE workout_name = ? AND date >= ? ORDER BY id DESC LIMIT 1",
        (workout_name, _yesterday()),
    )
    row = c.fetchone()
    if not row:
      conn.close()
      return None
    # Normalize started_at to ISO with explicit "Z" so the JS client parses as
    # UTC. SQLite returns the literal string we stored (already has "Z");
    # Postgres returns a naive datetime that default=str renders as
    # "2026-05-04 14:23:00.123456" — no timezone marker, which JS then treats
    # as local time, producing a future timestamp for users west of UTC and a
    # negative elapsed clock.
    started_at_raw = row["started_at"]
    if started_at_raw is None:
        started_at_str = None
    elif isinstance(started_at_raw, str):
        s = started_at_raw.replace(" ", "T")
        started_at_str = s if (s.endswith("Z") or "+" in s[10:]) else s + "Z"
    else:
        # datetime from Postgres
        s = started_at_raw.isoformat()
        started_at_str = s if started_at_raw.tzinfo is not None else s + "Z"
    session = {
        "id": row["id"],
        "duration_sec": row["duration_sec"],
        "started_at": started_at_str,
        "date": row["date"],
        "sets": [],
    }
    c.execute("SELECT exercise, set_type, set_number, weight_lb, reps, bands_json, grip FROM sets WHERE session_id = ? ORDER BY id", (row["id"],))
    session["sets"] = [dict(r) for r in c.fetchall()]
    conn.close()
    return session




def get_motivations_for_session(session_id):
    """Returns {exercise_name: latest_message} for the given session."""
    if not session_id:
        return {}
    conn = get_db()
    try:
        c = conn.cursor()
        c.execute(
            "SELECT exercise, message FROM motivations WHERE session_id = ? ORDER BY id ASC",
            (session_id,),
        )
        # Latest write wins for a given exercise (ORDER BY id ASC + dict overwrite).
        out = {}
        for r in c.fetchall():
            row = dict(r)
            out[row["exercise"]] = row["message"]
        return out
    finally:
        conn.close()


# The app is two pages, served by two HTML files:
#   workout.html          — the SHELL: home, history, stats, calendar, measurements.
#   workout-session.html  — the live WORKOUT SESSION screen (set logging).
# The shell's startWorkout() redirects to /workout, which serves the session
# page. They share the same /api/* backend.
HTML_PATH_SHELL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "workout.html")
HTML_PATH_SESSION = os.path.join(os.path.dirname(os.path.abspath(__file__)), "workout-session.html")


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/" or parsed.path == "/index.html" or parsed.path == "/workout.html":
            # Shell page: home, history, stats, calendar, measurements.
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            with open(HTML_PATH_SHELL, "rb") as f:
                self.wfile.write(f.read())
        elif parsed.path in ("/workout", "/workout/", "/workout-session.html",
                             "/v2", "/v2/", "/workout-v2.html"):
            # The live workout-session screen. Reached from the shell's home
            # via startWorkout() redirect to /workout?w=<id>. The /v2 and
            # /workout-v2.html paths are legacy compat aliases (the file was
            # renamed from workout-v2.html) so old bookmarks/PWAs still work.
            try:
                with open(HTML_PATH_SESSION, "rb") as f:
                    body = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "text/html")
                self.end_headers()
                self.wfile.write(body)
            except FileNotFoundError:
                self.send_response(404)
                self.send_header("Content-Type", "text/plain")
                self.end_headers()
                self.wfile.write(b"workout-session.html not found")
        elif parsed.path == "/api/history":
            params = urllib.parse.parse_qs(parsed.query)
            limit = int(params.get("limit", [20])[0])
            data = get_history(limit)
            print(f"  [HISTORY] Returning {len(data)} sessions")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(data, default=str).encode())
        elif parsed.path == "/api/last-session":
            params = urllib.parse.parse_qs(parsed.query)
            workout = params.get("workout", [""])[0]
            data = get_last_session(workout)
            print(f"  [LAST] Last session for '{workout}': {len(data)} entries")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(data, default=str).encode())
        elif parsed.path == "/api/exercise-hints":
            data = get_exercise_hints()
            print(f"  [HINTS] {len(data)} exercise hints")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(data, default=str).encode())
        elif parsed.path == "/api/1rm-history":
            data = get_exercise_1rm_history()
            print(f"  [1RM] {len(data)} exercises with history")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(data, default=str).encode())
        elif parsed.path == "/api/active-sessions":
            data = get_active_sessions()
            print(f"  [ACTIVE] {len(data)} active sessions")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(data, default=str).encode())
        elif parsed.path == "/api/today-session":
            params = urllib.parse.parse_qs(parsed.query)
            workout = params.get("workout", [""])[0]
            data = get_today_session(workout)
            print(f"  [TODAY] Today's session for '{workout}': {data['id'] if data else 'none'}")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(data, default=str).encode())
        elif parsed.path == "/api/motivations":
            params = urllib.parse.parse_qs(parsed.query)
            try:
                sid = int(params.get("session_id", ["0"])[0])
            except (ValueError, TypeError):
                sid = 0
            data = get_motivations_for_session(sid) if sid else {}
            print(f"  [MOTIVATIONS] session_id={sid} -> {len(data)} entries")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(data, default=str).encode())
        elif parsed.path == "/api/measurements":
            data = list_measurements()
            print(f"  [MEASUREMENTS] Returning {len(data)} entries")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(data, default=str).encode())
        elif parsed.path == "/api/exercise-notes":
            data = list_exercise_notes()
            print(f"  [EX-NOTES] Returning {len(data)} notes")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(data, default=str).encode())
        elif parsed.path.endswith(".js"):
            filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)), parsed.path.lstrip("/"))
            if os.path.exists(filepath):
                self.send_response(200)
                self.send_header("Content-Type", "application/javascript")
                self.send_header("Access-Control-Allow-Origin", "*")
                # App JS iterates frequently — never serve a stale module.
                self.send_header("Cache-Control", "no-cache, must-revalidate")
                self.end_headers()
                with open(filepath, "rb") as f:
                    self.wfile.write(f.read())
            else:
                self.send_response(404)
                self.end_headers()
        elif parsed.path.endswith(".css"):
            filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)), parsed.path.lstrip("/"))
            if os.path.exists(filepath):
                self.send_response(200)
                self.send_header("Content-Type", "text/css")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Cache-Control", "no-cache, must-revalidate")
                self.end_headers()
                with open(filepath, "rb") as f:
                    self.wfile.write(f.read())
            else:
                self.send_response(404)
                self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()


    def do_POST(self):
        # AI motivation generation is disabled. These endpoints are kept so any
        # stale client that still POSTs to them gets a clean no-op response
        # instead of a 404/500 — they never call Claude or persist anything.
        if self.path in ("/api/motivate", "/api/motivate-finish"):
            try:
                length = int(self.headers.get("Content-Length", 0))
                if length:
                    self.rfile.read(length)
            except Exception:
                pass
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"message": None, "disabled": True}).encode())
            return
        if self.path == "/api/measurements":
            try:
                length = int(self.headers.get("Content-Length", 0))
                raw = self.rfile.read(length)
                body = json.loads(raw)
                # Accept either a single object or a {entries: [...]} bulk
                # payload. Bulk is how the CSV importer pushes seed data.
                if isinstance(body, dict) and isinstance(body.get("entries"), list):
                    inserted = []
                    for entry in body["entries"]:
                        new_id = save_measurement(entry)
                        if new_id is not None:
                            inserted.append(new_id)
                    print(f"  [MEASUREMENTS] Bulk inserted {len(inserted)} entries")
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(json.dumps({"ids": inserted, "count": len(inserted)}).encode())
                else:
                    new_id = save_measurement(body)
                    print(f"  [MEASUREMENTS] Saved entry #{new_id}")
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(json.dumps({"id": new_id, "ok": True}).encode())
            except Exception as e:
                print(f"  [MEASUREMENTS] Error: {e}")
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
            return
        if self.path == "/api/exercise-notes":
            try:
                length = int(self.headers.get("Content-Length", 0))
                raw = self.rfile.read(length)
                body = json.loads(raw)
                ex = body.get("exercise", "").strip()
                note_body = body.get("body", "")
                if not ex:
                    raise ValueError("exercise is required")
                upsert_exercise_note(ex, note_body)
                print(f"  [EX-NOTES] Upsert {ex!r} ({len(note_body)} chars)")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True}).encode())
            except Exception as e:
                print(f"  [EX-NOTES] Error: {e}")
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
            return
        # POST /api/update-set — surgical UPDATE for repairing historical sets
        # corrupted by the stale-tab autoSave bug (now guarded against).
        # Body: { session_id, exercise, set_type, set_number, weight_lb, bands_json }
        if self.path == "/api/update-set":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = json.loads(self.rfile.read(length))
                update_set_value(
                    body["session_id"], body["exercise"], body["set_type"],
                    body.get("set_number", 0), body.get("weight_lb"), body.get("bands_json"),
                )
                print(f"  [UPDATE-SET] s{body['session_id']} {body['exercise']} {body['set_type']}#{body.get('set_number',0)} → {body.get('weight_lb')}lb {body.get('bands_json')}")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True}).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
            return
        if self.path == "/api/save":
            try:
                length = int(self.headers.get("Content-Length", 0))
                raw = self.rfile.read(length)
                print(f"\n  [SAVE] Received {length} bytes")
                print(f"  [SAVE] Body: {raw.decode()[:500]}")
                body = json.loads(raw)
                session_id = save_session(body)
                print(f"  [SAVE] ✅ Saved session #{session_id}")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"id": session_id, "ok": True}).encode())
            except Exception as e:
                print(f"  [SAVE] ❌ Error: {e}")
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        # /api/measurements/<id>
        if parsed.path.startswith("/api/measurements/"):
            try:
                meas_id = int(parsed.path.rsplit("/", 1)[-1])
                delete_measurement(meas_id)
                print(f"  [MEASUREMENTS] Deleted #{meas_id}")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True, "id": meas_id}).encode())
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
            return
        # /api/session/<id> — hard delete a session and its child rows.
        # Used to clean up orphan/duplicate sessions from autoSave races.
        if parsed.path.startswith("/api/session/"):
            try:
                sess_id = int(parsed.path.rsplit("/", 1)[-1])
                delete_session(sess_id)
                print(f"  [SESSION] Deleted #{sess_id}")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True, "id": sess_id}).encode())
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
            return
        self.send_response(404)
        self.end_headers()

    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, format, *args):
        print(f"  [{self.command}] {args[0]}")


if __name__ == "__main__":
    # Ensure DB exists
    get_db().close()
    print(f"\n  🏋️  Workout Tracker running at http://localhost:{PORT}")
    print(f"  📁  Database: {DB_PATH}")
    print(f"  Press Ctrl+C to stop\n")

    import socket
    class DualStackHTTPServer(http.server.HTTPServer):
        address_family = socket.AF_INET6
        def server_bind(self):
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
            super().server_bind()

    server = DualStackHTTPServer(("", PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Stopped.")

