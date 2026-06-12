#!/usr/bin/env python3
"""Apply combo SQL files to Dual Gym Supabase via Management API."""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COMBO_DIR = ROOT / "supabase" / "seed" / "generated_import" / "combo"
MCP_CONFIG = ROOT / ".cursor" / "mcp.json"

PROJECT_REF = "evtgfwphownszsjrkpph"
API_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"


def load_token() -> str:
    token = __import__("os").environ.get("SUPABASE_ACCESS_TOKEN")
    if token:
        return token
    data = json.loads(MCP_CONFIG.read_text())
    args = data["mcpServers"]["supabase-dual-gym"]["args"]
    idx = args.index("--access-token")
    return args[idx + 1]


def run_sql(token: str, sql: str) -> None:
    body = json.dumps({"query": sql}).encode()
    req = urllib.request.Request(
        API_URL,
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "dualgym-import/1.0",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=300) as resp:
        if resp.status not in (200, 201):
            raise RuntimeError(f"Unexpected status {resp.status}: {resp.read()}")


def main() -> int:
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    end = int(sys.argv[2]) if len(sys.argv) > 2 else 37
    token = load_token()
    errors: list[str] = []

    for i in range(start, end + 1):
        path = COMBO_DIR / f"combo_{i:03d}.sql"
        if not path.exists():
            print(f"SKIP missing {path.name}")
            continue
        sql = path.read_text()
        print(f">> combo_{i:03d}.sql ({len(sql)} bytes)", flush=True)
        try:
            run_sql(token, sql)
            print(f"   OK", flush=True)
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode()[:500]
            msg = f"combo_{i:03d}: HTTP {exc.code} {detail}"
            print(f"   FAIL {msg}", flush=True)
            errors.append(msg)
        except Exception as exc:  # noqa: BLE001
            msg = f"combo_{i:03d}: {exc}"
            print(f"   FAIL {msg}", flush=True)
            errors.append(msg)
        time.sleep(0.3)

    if errors:
        print("\nErrors:")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("\nAll combos applied.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
