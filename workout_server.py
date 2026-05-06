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

PORT = 8000
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


def get_db():
    if PG_URL:
        import psycopg
        from psycopg.rows import dict_row
        raw = psycopg.connect(PG_URL, row_factory=dict_row, autocommit=False)
        conn = _PGConn(raw)
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
        return conn

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
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
        # Update existing session
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
            "INSERT INTO sets (session_id, exercise, set_type, set_number, reps, weight_lb, bands_json, completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (session_id, s["exercise"], s["set_type"], s.get("set_number", 0), s.get("reps", ""), s.get("weight_lb"), s.get("bands_json"), 1),
        )
    conn.commit()
    conn.close()
    return session_id


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
        # Attach the workout-finish motivation if one was generated for this
        # session — so the home screen can show the witty closer per session.
        c.execute(
            "SELECT message FROM motivations WHERE session_id = ? AND exercise = ? ORDER BY id DESC LIMIT 1",
            (sess["id"], "__workout_finish__"),
        )
        row = c.fetchone()
        sess["finish_motivation"] = row["message"] if row else None
    conn.close()
    return sessions


def get_last_session(workout_name):
    """Get the most recent session data for a workout (for hints)."""
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "SELECT id FROM sessions WHERE workout_name = ? ORDER BY date DESC, id DESC LIMIT 1",
        (workout_name,),
    )
    row = c.fetchone()
    if not row:
        conn.close()
        return {}
    c.execute("SELECT exercise, set_type, set_number, weight_lb, reps, bands_json FROM sets WHERE session_id = ?", (row["id"],))
    data = {}
    for r in c.fetchall():
        key = f"{r['exercise']}|{r['set_type']}|{r['set_number']}"
        data[key] = {"weight_lb": r["weight_lb"], "reps": r["reps"], "bands_json": r["bands_json"]}
    conn.close()
    return data


def get_exercise_hints():
    """Get most recent weight/reps for every exercise across ALL workouts."""
    conn = get_db()
    c = conn.cursor()
    # For each exercise+set_type+set_number combo, get the most recent entry
    c.execute('''
        SELECT s2.exercise, s2.set_type, s2.set_number, s2.weight_lb, s2.reps, s2.bands_json
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
        data[key] = {"weight_lb": r["weight_lb"], "reps": r["reps"], "bands_json": r["bands_json"]}
    conn.close()
    return data


def get_exercise_1rm_history():
    """Get per-exercise best estimated 1RM, best reps, max weight, and volume per session."""
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        SELECT sess.date, s.exercise, s.weight_lb, s.reps
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
        "SELECT id, workout_name, duration_sec, started_at FROM sessions WHERE date >= ? ORDER BY id DESC",
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
        "SELECT id, duration_sec, started_at FROM sessions WHERE workout_name = ? AND date >= ? ORDER BY id DESC LIMIT 1",
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
        "sets": [],
    }
    c.execute("SELECT exercise, set_type, set_number, weight_lb, reps, bands_json FROM sets WHERE session_id = ? ORDER BY id", (row["id"],))
    session["sets"] = [dict(r) for r in c.fetchall()]
    conn.close()
    return session


MOTIVATE_MODEL = "claude-sonnet-4-6"


def call_claude_motivate(payload):
    """
    Call Claude Sonnet to generate a 1-2 sentence post-exercise motivation.
    payload = {
        exercise: str,
        muscles: [str],            # primary + secondary muscles hit
        current: [{set_number,reps,weight_lb}, ...],   # this session's sets
        previous: [{date, sets:[...]}],                # last 1-3 sessions for trend
    }
    Returns (message, model_used) tuple, or (None, None) on failure / no-key.
    Uses pure stdlib so no extra Python deps on Vercel.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return (None, None)  # silent no-op if not configured

    import urllib.request
    import urllib.error

    system = (
        "You are a sharp gym buddy / smart-aleck wingman who actually READS "
        "the user's training history. After they finish an exercise, write "
        "2–3 sentences that feel personal, warm, witty, and a little cocky — "
        "like a friend who's been spotting them for years. Not corporate. "
        "Not motivational-poster. Not dry stat-recital.\n\n"
        "FINDING WHAT'S GOOD — your job is to scan the data and surface ONE "
        "genuine bright spot. PR is just one option of many. Look at the "
        "`prs` block AND `history_timeseries` (chronological session-by-session "
        "progress: date + best 1RM + max weight + best reps + total volume). "
        "Angles you can highlight, in NO particular order:\n"
        "  • PR — is_orm_pr / is_weight_pr / is_reps_pr is true. Use the numbers.\n"
        "  • Tied a previous best (tied_previous_best_orm). Validate the "
        "consistency, don't fake-celebrate.\n"
        "  • More reps at the same weight as last time (reps_at_current_weight_improved). "
        "Silent strength gain.\n"
        "  • Volume trending up over weeks (vol_trend_pct_4wk_vs_prior > 0). "
        "Quote the percent.\n"
        "  • Coming back after a layoff (returning_after_layoff). Showing up "
        "after 2+ weeks counts.\n"
        "  • Long-arc progression — pick a session 4–12 weeks ago from "
        "history_timeseries and contrast with today (\"in March you were "
        "doing 30s for 8, now 45s for 11\").\n"
        "  • Hitting the top of the prescribed rep range cleanly.\n"
        "  • Just consistency — N sessions on this lift in their history.\n"
        "  • If literally nothing improved or no history exists, praise "
        "showing up and leave it at that. NEVER invent fake progress. NEVER "
        "fake-celebrate identical numbers as a PR.\n\n"
        "RULES:\n"
        "1. Reference AT LEAST ONE concrete number from the data — today's "
        "number, a previous number, a percent, a date, a session count. No "
        "vague \"keep it up\" without specifics.\n"
        "2. If a PR fired, celebrate it. If multiple bright spots exist, "
        "pick the most impressive one — don't list them all.\n"
        "3. Roughly 1 in every 2 messages should END with a charming wingman "
        "line about the off-the-bench upside — heads turning, women not "
        "looking away, mirrors filing complaints, shirts fitting tighter, "
        "dating-pool consequences. Clever, not gross, never explicit. Lean "
        "in when muscles are vanity-relevant (chest/back/arms/shoulders). "
        "Skip if it would feel forced.\n"
        "4. Vary openers — don't always start the same way.\n"
        "5. Vary the angle session over session — don't always pick the "
        "same kind of bright spot.\n"
        "6. Light humor / metaphors / reactions (\"oh that's filthy\", \"chest "
        "is toast\", \"you're cooking\") welcome when they fit. No fitness "
        "clichés (\"crush it\", \"beast mode\", \"no pain no gain\").\n"
        "7. 1–2 emojis max, only if they add something. None is fine.\n"
        "8. 2–3 sentences. Hard cap 55 words."
    )
    user_prompt = (
        f"Exercise just finished: {payload.get('exercise')}\n"
        f"Muscles worked: {', '.join(payload.get('muscles') or []) or 'unknown'}\n\n"
        f"Per sub-exercise data (PR flags + multi-week trend signals + "
        f"chronological history_timeseries — scan all of it before deciding "
        f"what to celebrate):\n"
        f"{json.dumps(payload.get('prs') or [], indent=2)}\n\n"
        f"This session's sets: {json.dumps(payload.get('current') or [])}\n"
        f"Last few sessions (recent set-level detail): "
        f"{json.dumps(payload.get('previous') or [])}\n\n"
        "Find the most genuine bright spot in the data and write the message."
    )
    body = {
        "model": MOTIVATE_MODEL,
        "max_tokens": 220,
        "system": system,
        "messages": [{"role": "user", "content": user_prompt}],
    }
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps(body).encode(),
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
    )
    # One retry on 5xx; 9s timeout (Vercel hobby tier has 10s function limit).
    last_err = None
    for attempt in range(2):
        try:
            with urllib.request.urlopen(req, timeout=9) as resp:
                data = json.loads(resp.read())
            return (data["content"][0]["text"].strip(), MOTIVATE_MODEL)
        except urllib.error.HTTPError as e:
            last_err = e
            print(f"  [MOTIVATE] HTTP {e.code} on attempt {attempt + 1}: {e}")
            if 500 <= e.code < 600 and attempt == 0:
                continue  # retry once on 5xx
            return (None, None)
        except Exception as e:
            last_err = e
            print(f"  [MOTIVATE] Anthropic call failed on attempt {attempt + 1}: {e}")
            return (None, None)
    print(f"  [MOTIVATE] Gave up after retries: {last_err}")
    return (None, None)


def call_claude_motivate_finish(payload):
    """
    Witty end-of-workout closer. payload = {
        workout: str,
        duration_sec: int,
        total_sets: int,
        exercises: [name, ...],
        prs: [{sub, is_orm_pr, is_weight_pr, is_reps_pr, ...}, ...],
        total_volume_lb: number,
    }
    Returns (message, model_used) tuple.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return (None, None)
    import urllib.request
    import urllib.error

    system = (
        "You are the user's smart-aleck gym buddy writing a quick post-workout "
        "victory lap. EXACTLY 2 sentences. Witty, a little cocky.\n\n"
        "STRUCTURE:\n"
        "- SENTENCE 1: A real number from their data — a PR, total volume, "
        "duration, or set count. Make it punchy, not a stat dump.\n"
        "- SENTENCE 2: The charming wingman line — heads turning, women "
        "noticing, mirrors complaining, shirts fitting tighter, dating pool "
        "consequences. Clever, never crass, never explicit.\n\n"
        "RULES:\n"
        "- Vary openers. No \"Crushed it.\" \"Beast.\" \"Wow.\"\n"
        "- Skip fitness clichés (\"beast mode\", \"crush it\", \"keep grinding\").\n"
        "- Up to 1 emoji, only if it actually lands. None is fine.\n"
        "- Hard cap 40 words. Concise > verbose.\n"
        "- Tone: confident wingman, dry humor, warm. Not corporate. Not horny."
    )
    user_prompt = (
        f"Workout: {payload.get('workout')}\n"
        f"Duration: {payload.get('duration_sec', 0)} seconds\n"
        f"Total sets: {payload.get('total_sets', 0)}\n"
        f"Total volume (lb·reps): {payload.get('total_volume_lb', 0)}\n"
        f"Exercises today: {', '.join(payload.get('exercises') or [])}\n\n"
        f"PRs achieved this session (look here for celebration material):\n"
        f"{json.dumps(payload.get('prs') or [], indent=2)}\n\n"
        "Write the closer message."
    )
    body = {
        "model": MOTIVATE_MODEL,
        "max_tokens": 160,
        "system": system,
        "messages": [{"role": "user", "content": user_prompt}],
    }
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps(body).encode(),
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
    )
    last_err = None
    for attempt in range(2):
        try:
            with urllib.request.urlopen(req, timeout=9) as resp:
                data = json.loads(resp.read())
            return (data["content"][0]["text"].strip(), MOTIVATE_MODEL)
        except urllib.error.HTTPError as e:
            last_err = e
            print(f"  [FINISH] HTTP {e.code} on attempt {attempt + 1}: {e}")
            if 500 <= e.code < 600 and attempt == 0:
                continue
            return (None, None)
        except Exception as e:
            last_err = e
            print(f"  [FINISH] Anthropic call failed on attempt {attempt + 1}: {e}")
            return (None, None)
    print(f"  [FINISH] Gave up after retries: {last_err}")
    return (None, None)


# Sentinel exercise name used to persist the workout-closer message in the
# `motivations` table alongside per-exercise messages. Single row per session.
FINISH_KEY = "__workout_finish__"


def save_motivation(session_id, exercise, message, model):
    if not session_id or not message:
        return
    conn = get_db()
    try:
        c = conn.cursor()
        c.execute(
            "INSERT INTO motivations (session_id, exercise, message, model) VALUES (?, ?, ?, ?)",
            (session_id, exercise, message, model),
        )
        conn.commit()
    except Exception as e:
        print(f"  [MOTIVATE] Failed to persist motivation: {e}")
    finally:
        conn.close()


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


# Read the HTML file
HTML_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "workout.html")


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/" or parsed.path == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            with open(HTML_PATH, "rb") as f:
                self.wfile.write(f.read())
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
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/api/motivate":
            try:
                length = int(self.headers.get("Content-Length", 0))
                raw = self.rfile.read(length)
                body = json.loads(raw)
                msg, model_used = call_claude_motivate(body)
                print(f"  [MOTIVATE] {body.get('exercise')!r} ({model_used}) -> {msg!r}")
                if msg:
                    save_motivation(body.get("session_id"), body.get("exercise"), msg, model_used)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"message": msg, "model": model_used}).encode())
            except Exception as e:
                print(f"  [MOTIVATE] Error: {e}")
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
            return
        if self.path == "/api/motivate-finish":
            try:
                length = int(self.headers.get("Content-Length", 0))
                raw = self.rfile.read(length)
                body = json.loads(raw)
                msg, model_used = call_claude_motivate_finish(body)
                print(f"  [FINISH] workout={body.get('workout')!r} ({model_used}) -> {msg!r}")
                if msg:
                    save_motivation(body.get("session_id"), FINISH_KEY, msg, model_used)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"message": msg, "model": model_used}).encode())
            except Exception as e:
                print(f"  [FINISH] Error: {e}")
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
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
    server = http.server.HTTPServer(("", PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Stopped.")
