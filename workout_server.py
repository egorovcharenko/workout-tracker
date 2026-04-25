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
    conn.commit()
    return conn


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
        # Create new session
        c.execute(
            "INSERT INTO sessions (workout_name, date, duration_sec, notes) VALUES (?, ?, ?, ?)",
            (data["workout"], data["date"], data.get("duration_sec", 0), data.get("notes", "")),
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


def get_history(limit=20):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM sessions ORDER BY date DESC, id DESC LIMIT ?", (limit,))
    sessions = [dict(r) for r in c.fetchall()]
    for sess in sessions:
        c.execute("SELECT * FROM sets WHERE session_id = ? ORDER BY id", (sess["id"],))
        sess["sets"] = [dict(r) for r in c.fetchall()]
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
    """Get per-exercise best estimated 1RM and best reps per session."""
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
    for r in c.fetchall():
        reps = int(r["reps"]) if str(r["reps"]).isdigit() else 0
        if reps <= 0:
            continue
        reps_raw[(r["exercise"], r["date"])].append(reps)
        if r["weight_lb"] and float(r["weight_lb"]) > 0:
            w = float(r["weight_lb"])
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
    conn.close()
    return {"orm": dict(result), "reps": dict(reps_result), "vol": dict(vol_result)}


def get_active_sessions(today=None):
    """Get all sessions from the last 24h (for home screen active indicator)."""
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "SELECT id, workout_name, duration_sec FROM sessions WHERE date >= ? ORDER BY id DESC",
        (_yesterday(),),
    )
    sessions = []
    for row in c.fetchall():
        c2 = conn.cursor()
        c2.execute("SELECT COUNT(*) as cnt FROM sets WHERE session_id = ?", (row["id"],))
        cnt = c2.fetchone()["cnt"]
        if cnt > 0:
            sessions.append({
                "id": row["id"],
                "workout_name": row["workout_name"],
                "duration_sec": row["duration_sec"],
                "sets_done": cnt,
            })
    conn.close()
    return sessions


def get_today_session(workout_name, today=None):
    """Get the most recent session for a workout within the last 24h."""
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "SELECT id, duration_sec FROM sessions WHERE workout_name = ? AND date >= ? ORDER BY id DESC LIMIT 1",
        (workout_name, _yesterday()),
    )
    row = c.fetchone()
    if not row:
        conn.close()
        return None
    session = {"id": row["id"], "duration_sec": row["duration_sec"], "sets": []}
    c.execute("SELECT exercise, set_type, set_number, weight_lb, reps, bands_json FROM sets WHERE session_id = ? ORDER BY id", (row["id"],))
    session["sets"] = [dict(r) for r in c.fetchall()]
    conn.close()
    return session


def call_claude_motivate(payload):
    """
    Call Claude Sonnet to generate a 1-2 sentence post-exercise motivation.
    payload = {
        exercise: str,
        muscles: [str],            # primary + secondary muscles hit
        current: [{set_number,reps,weight_lb}, ...],   # this session's sets
        previous: [{date, sets:[...]}],                # last 1-3 sessions for trend
    }
    Returns string. Uses pure stdlib so no extra Python deps on Vercel.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None  # silent no-op if not configured

    import urllib.request

    system = (
        "You are a concise, specific workout coach. After the user finishes an "
        "exercise, write ONE punchy sentence (max 2). Reference a concrete "
        "number from their data — a PR, a rep increase, a volume comparison, or "
        "the muscles just worked. No generic praise. No emojis unless one fits "
        "naturally. Tone: friendly gym buddy, not corporate. Never exceed 25 words."
    )
    user_prompt = (
        f"Exercise just finished: {payload.get('exercise')}\n"
        f"Muscles: {', '.join(payload.get('muscles') or []) or 'unknown'}\n\n"
        f"This session sets: {json.dumps(payload.get('current') or [])}\n"
        f"Previous sessions: {json.dumps(payload.get('previous') or [])}\n\n"
        "Write the message."
    )
    body = {
        "model": "claude-sonnet-4-5",
        "max_tokens": 120,
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
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        return data["content"][0]["text"].strip()
    except Exception as e:
        print(f"  [MOTIVATE] Anthropic call failed: {e}")
        return None


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
            self.wfile.write(json.dumps(data).encode())
        elif parsed.path == "/api/last-session":
            params = urllib.parse.parse_qs(parsed.query)
            workout = params.get("workout", [""])[0]
            data = get_last_session(workout)
            print(f"  [LAST] Last session for '{workout}': {len(data)} entries")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())
        elif parsed.path == "/api/exercise-hints":
            data = get_exercise_hints()
            print(f"  [HINTS] {len(data)} exercise hints")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())
        elif parsed.path == "/api/1rm-history":
            data = get_exercise_1rm_history()
            print(f"  [1RM] {len(data)} exercises with history")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())
        elif parsed.path == "/api/active-sessions":
            data = get_active_sessions()
            print(f"  [ACTIVE] {len(data)} active sessions")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())
        elif parsed.path == "/api/today-session":
            params = urllib.parse.parse_qs(parsed.query)
            workout = params.get("workout", [""])[0]
            data = get_today_session(workout)
            print(f"  [TODAY] Today's session for '{workout}': {data['id'] if data else 'none'}")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/api/motivate":
            try:
                length = int(self.headers.get("Content-Length", 0))
                raw = self.rfile.read(length)
                body = json.loads(raw)
                msg = call_claude_motivate(body)
                print(f"  [MOTIVATE] {body.get('exercise')!r} -> {msg!r}")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"message": msg}).encode())
            except Exception as e:
                print(f"  [MOTIVATE] Error: {e}")
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

    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
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
